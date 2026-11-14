import { callGemini, extractJSON } from "@/lib/gemini";
import type {
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  InterviewType,
  DifficultyLevel,
} from "@/lib/types";

function interviewTypeGuide(type: InterviewType): string {
  switch (type) {
    case "hr":
      return "Focus exclusively on HR-style questions: motivation, career goals, teamwork, communication, salary expectations, and cultural fit. Include at least one question about salary expectations or notice period typical in Pakistan.";
    case "technical":
      return "Focus exclusively on technical questions specific to the job role and the candidate's listed skills and projects. Include at least one problem-solving or concept question.";
    case "behavioral":
      return "Focus exclusively on behavioral questions using the STAR framework (Situation, Task, Action, Result). Ask about past experiences, handling conflict, meeting deadlines, and working under pressure.";
    case "mixed":
    default:
      return "Mix HR, behavioral, and technical questions. Include at least one common Pakistani interview opener such as 'Tell me about yourself' and at least one question about salary expectations or career goals.";
  }
}

function difficultyGuide(level: DifficultyLevel): string {
  if (level === "fresher") {
    return "The candidate is a fresh graduate with little to no work experience. Keep questions simple, focus on academic projects, internships, and theoretical knowledge. Avoid expecting deep industry experience.";
  }
  return "The candidate has some experience or strong academic background. Ask moderately challenging questions that test both practical knowledge and reasoning ability. Expect structured, detailed answers.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateQuestionsRequest;
    const { cvText, jobRole, interviewType, difficulty } = body;

    if (!cvText?.trim() || !jobRole?.trim()) {
      return Response.json(
        { error: "cvText and jobRole are required." },
        { status: 400 }
      );
    }

    const prompt = `You are an expert interview coach helping Pakistani fresh graduates prepare for job interviews in Pakistan.

CONTEXT — Pakistani job market:
- Common employers: software houses (Systems Ltd, Netsol, Arbisoft), banks (HBL, UBL, Meezan), multinationals (Unilever, P&G, Nestlé), and startups.
- Candidates are typically HEC-registered university graduates (LUMS, FAST, IBA, NUST, COMSATS, etc.).
- Interviews in Pakistan often begin with "Tell me about yourself" and may ask about salary expectations (in PKR), willingness to relocate, and notice period.
- Keep all questions in English.

INTERVIEW TYPE: ${interviewType.toUpperCase()}
${interviewTypeGuide(interviewType as InterviewType)}

DIFFICULTY: ${difficulty.toUpperCase()}
${difficultyGuide(difficulty as DifficultyLevel)}

TARGET JOB ROLE: ${jobRole}

CV:
${cvText}

Generate exactly 5 interview questions tailored to the above. All questions must be in English.

Respond ONLY with valid JSON, no extra text:
{
  "questions": [
    { "id": 1, "question": "..." },
    { "id": 2, "question": "..." },
    { "id": 3, "question": "..." },
    { "id": 4, "question": "..." },
    { "id": 5, "question": "..." }
  ]
}`;

    const raw = await callGemini(prompt);
    const data = extractJSON<GenerateQuestionsResponse>(raw);

    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      return Response.json(
        { error: "Failed to generate questions. Please try again." },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-questions]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
