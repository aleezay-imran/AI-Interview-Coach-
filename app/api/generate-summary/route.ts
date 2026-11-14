import { callGemini, extractJSON } from "@/lib/gemini";
import type {
  GenerateSummaryRequest,
  GenerateSummaryResponse,
  FeedbackLanguage,
} from "@/lib/types";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

/** Wraps callGemini with a 30-second timeout. */
async function callGeminiWithTimeout(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await callGemini(prompt);
  } finally {
    clearTimeout(timer);
  }
}

/** Calls Gemini up to MAX_RETRIES+1 times, returning null on total failure. */
async function callGeminiWithRetry(prompt: string): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callGeminiWithTimeout(prompt);
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      if (!isLast) {
        console.warn(`[generate-summary] attempt ${attempt + 1} failed, retrying…`);
      } else {
        console.warn(`[generate-summary] all attempts failed:`, err);
      }
    }
  }
  return null;
}

/** Builds a summary purely from local data — no Gemini required. */
function localFallback(
  answers: GenerateSummaryRequest["answers"]
): GenerateSummaryResponse {
  const overallScore =
    Math.round(
      (answers.reduce((sum, a) => sum + a.score, 0) / answers.length) * 10
    ) / 10;

  const sorted = [...answers].sort((a, b) => b.score - a.score);
  const top2 = sorted.slice(0, 2);
  const bottom2 = sorted.slice(-2);

  const strengths = top2.map(
    (a) => `Strong answer on: "${a.question.slice(0, 60)}…" (${a.score}/10)`
  );
  const weakAreas = bottom2.map(
    (a) => `Needs work on: "${a.question.slice(0, 60)}…" (${a.score}/10)`
  );

  return { overallScore, strengths, weakAreas };
}

function languageInstruction(lang: FeedbackLanguage): string {
  switch (lang) {
    case "roman-urdu":
      return "Write strengths and weakAreas in Roman Urdu (Urdu words in Latin/English script). Keep JSON keys in English.";
    case "urdu":
      return "Write strengths and weakAreas in Urdu script. Keep JSON keys in English.";
    case "english":
    default:
      return "Write strengths and weakAreas in English.";
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateSummaryRequest;
    const { answers, jobRole, feedbackLanguage = "english" } = body;

    if (!Array.isArray(answers) || answers.length === 0 || !jobRole?.trim()) {
      return Response.json(
        { error: "answers array and jobRole are required." },
        { status: 400 }
      );
    }

    const overallAvg =
      answers.reduce((sum, a) => sum + a.score, 0) / answers.length;

    const lines = answers
      .map(
        (a, i) =>
          `Q${i + 1}(${a.score}/10): ${a.feedback.clarity} ${a.feedback.relevance}`
      )
      .join(" | ");

    const langNote = languageInstruction(feedbackLanguage as FeedbackLanguage);

    const prompt = `Interview coach. Role: ${jobRole}. Avg: ${overallAvg.toFixed(1)}/10. Results: ${lines}

${langNote}

Return JSON only:
{"overallScore":<1dp number>,"strengths":["<s1>","<s2>"],"weakAreas":["<w1>","<w2>"]}`;

    const raw = await callGeminiWithRetry(prompt);

    if (raw !== null) {
      try {
        const data = extractJSON<GenerateSummaryResponse>(raw);
        if (
          typeof data.overallScore === "number" &&
          Array.isArray(data.strengths) &&
          Array.isArray(data.weakAreas)
        ) {
          data.overallScore = Math.max(0, Math.min(10, data.overallScore));
          return Response.json(data);
        }
      } catch {
        console.warn("[generate-summary] JSON parse failed, using local fallback");
      }
    }

    return Response.json(localFallback(answers));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-summary]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
