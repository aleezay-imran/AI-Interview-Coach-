import { callGemini, extractJSON } from "@/lib/gemini";
import type {
  EvaluateAnswerRequest,
  EvaluateAnswerResponse,
  FeedbackLanguage,
  DifficultyLevel,
} from "@/lib/types";

function languageInstruction(lang: FeedbackLanguage): string {
  switch (lang) {
    case "roman-urdu":
      return "Write all feedback text (clarity, structure, relevance, improvedAnswer) in Roman Urdu (Urdu words written in English/Latin script). Keep JSON keys in English.";
    case "urdu":
      return "Write all feedback text (clarity, structure, relevance, improvedAnswer) in Urdu script. Keep JSON keys in English.";
    case "english":
    default:
      return "Write all feedback text in English.";
  }
}

function difficultyInstruction(level: DifficultyLevel): string {
  if (level === "fresher") {
    return "Be encouraging and lenient. The candidate is a fresh graduate. Reward effort and potential. Score generously if core concepts are correct even if delivery is imperfect.";
  }
  return "Apply moderate strictness. The candidate has some experience or strong academic background. Reward well-structured, specific answers and penalise vague or incomplete responses more than you would for a fresher.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EvaluateAnswerRequest;
    const {
      question,
      answer,
      jobRole,
      difficulty = "fresher",
      feedbackLanguage = "english",
    } = body;

    if (!question?.trim() || !answer?.trim() || !jobRole?.trim()) {
      return Response.json(
        { error: "question, answer, and jobRole are required." },
        { status: 400 }
      );
    }

    const prompt = `You are an expert interview coach evaluating a candidate's interview answer for a ${jobRole} role in Pakistan.

SCORING GUIDANCE:
${difficultyInstruction(difficulty as DifficultyLevel)}

LANGUAGE GUIDANCE:
${languageInstruction(feedbackLanguage as FeedbackLanguage)}

Interview Question: ${question}

Candidate's Answer: ${answer}

Evaluate on three dimensions:
- clarity: Was the answer easy to understand and expressed well?
- structure: Did the answer have a logical flow (e.g. STAR method or similar)?
- relevance: Did the answer address the question and relate to the job role?

Also provide an improved version of their answer demonstrating best practices.

Respond ONLY with valid JSON, no extra text:
{
  "score": <number from 1 to 10>,
  "feedback": {
    "clarity": "<1-2 sentences>",
    "structure": "<1-2 sentences>",
    "relevance": "<1-2 sentences>"
  },
  "improvedAnswer": "<well-structured improved answer, 3-5 sentences>"
}`;

    const raw = await callGemini(prompt);
    const data = extractJSON<EvaluateAnswerResponse>(raw);

    if (typeof data.score !== "number") data.score = 0;
    data.score = Math.max(0, Math.min(10, Math.round(data.score)));

    if (!data.feedback || !data.improvedAnswer) {
      return Response.json(
        { error: "Invalid evaluation response. Please try again." },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[evaluate-answer]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
