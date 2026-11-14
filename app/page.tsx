"use client";

import { useState, useEffect } from "react";
import type {
  Question,
  AnswerFeedback,
  SummaryReport,
  EvaluateAnswerResponse,
  GenerateSummaryResponse,
  FeedbackLanguage,
  InterviewType,
  DifficultyLevel,
} from "@/lib/types";

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "interview_coach_sessions";
const MAX_SESSIONS = 20;

interface SessionRecord {
  id: string;
  date: string;
  jobRole: string;
  overallScore: number;
  questionScores: number[];
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  feedbackLanguage: FeedbackLanguage;
}

function loadSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

function saveSession(session: SessionRecord): void {
  try {
    const existing = loadSessions();
    const updated = [session, ...existing].slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

function clearSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ─── Step types ───────────────────────────────────────────────────────────────
type Step = "input" | "questions" | "summary";

// ─── Label maps ───────────────────────────────────────────────────────────────
const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  hr: "HR",
  technical: "Technical",
  behavioral: "Behavioral",
  mixed: "Mixed",
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  fresher: "Fresher",
  intermediate: "Intermediate",
};

const LANGUAGE_LABELS: Record<FeedbackLanguage, string> = {
  english: "English",
  "roman-urdu": "Roman Urdu",
  urdu: "اردو (Urdu)",
};

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 8
      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
      : score >= 5
      ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
      : "bg-rose-100 text-rose-800 ring-1 ring-rose-300";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>
      {score}/10
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PrimaryButton({
  children, disabled, onClick, type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function TextInput({
  id, value, onChange, placeholder, disabled,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      id={id} type="text" value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-3 focus:ring-indigo-100 disabled:opacity-60"
    />
  );
}

function TextArea({
  id, value, onChange, placeholder, disabled, rows = 8, dir,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; rows?: number; dir?: "ltr" | "rtl";
}) {
  return (
    <textarea
      id={id} value={value} dir={dir}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled} rows={rows}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-3 focus:ring-indigo-100 disabled:opacity-60"
    />
  );
}

function SelectInput({
  id, value, onChange, disabled, children, label,
}: {
  id?: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; children: React.ReactNode; label: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <select
        id={id} value={value} disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-3 focus:ring-indigo-100 disabled:opacity-60"
      >
        {children}
      </select>
    </div>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim =
    size === "sm" ? "h-3.5 w-3.5 border-2"
    : size === "lg" ? "h-10 w-10 border-4"
    : "h-5 w-5 border-2";
  return (
    <span className={`inline-block animate-spin rounded-full border-slate-200 border-t-indigo-600 ${dim}`} />
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-indigo-600">Question {current} of {total}</span>
        <span className="text-slate-400">{Math.round((current / total) * 100)}% complete</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < current ? "bg-indigo-500" : i === current - 1 ? "bg-indigo-400" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// RTL wrapper for Urdu feedback text
function FeedbackText({ text, lang }: { text: string; lang: FeedbackLanguage }) {
  if (lang === "urdu") {
    return <span dir="rtl" className="block text-right font-[system-ui]">{text}</span>;
  }
  return <>{text}</>;
}

// ─── My Progress panel ────────────────────────────────────────────────────────
function ProgressPanel({ onClose }: { onClose: () => void }) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => { setSessions(loadSessions()); }, []);

  function handleClear() {
    clearSessions();
    setSessions([]);
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">My Progress</h2>
        <button
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          ✕ Close
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl bg-slate-50 py-8 text-center">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-slate-500">
            No sessions yet. Complete an interview to start tracking your progress.
          </p>
        </div>
      ) : (
        <>
          {/* Score trend bars */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Score Trend
            </p>
            <div className="flex items-end gap-1.5 h-14 rounded-xl bg-slate-50 px-3 py-2">
              {sessions.map((s) => {
                const heightPct = Math.round((s.overallScore / 10) * 100);
                const bar =
                  s.overallScore >= 8 ? "bg-emerald-400"
                  : s.overallScore >= 5 ? "bg-amber-400"
                  : "bg-rose-400";
                return (
                  <div
                    key={s.id}
                    className="flex flex-col items-center gap-0.5 flex-1 min-w-0"
                    title={`${s.jobRole}: ${s.overallScore}/10`}
                  >
                    <div className="w-full flex items-end h-8">
                      <div
                        className={`w-full rounded-t-sm ${bar} transition-all`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 truncate w-full text-center leading-none">
                      {s.overallScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session list */}
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:bg-slate-100"
              >
                <div className="min-w-0 mr-3">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.jobRole}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(s.date).toLocaleDateString("en-PK", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                    {" · "}
                    {INTERVIEW_TYPE_LABELS[s.interviewType] ?? s.interviewType}
                    {" · "}
                    {DIFFICULTY_LABELS[s.difficulty] ?? s.difficulty}
                    {" · "}
                    {LANGUAGE_LABELS[s.feedbackLanguage] ?? s.feedbackLanguage}
                    {" · "}
                    Scores: {s.questionScores.join(", ")}
                  </p>
                </div>
                <ScoreBadge score={s.overallScore} />
              </div>
            ))}
          </div>

          <button
            onClick={handleClear}
            className="text-sm text-rose-500 hover:text-rose-700 underline underline-offset-2 transition"
          >
            Clear history
          </button>
        </>
      )}
    </Card>
  );
}

// ─── Step 1: Input ────────────────────────────────────────────────────────────
function InputStep({
  onSubmit,
}: {
  onSubmit: (
    cvText: string,
    jobRole: string,
    interviewType: InterviewType,
    difficulty: DifficultyLevel,
    feedbackLanguage: FeedbackLanguage
  ) => Promise<void>;
}) {
  const [cvText, setCvText] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("mixed");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("fresher");
  const [feedbackLanguage, setFeedbackLanguage] = useState<FeedbackLanguage>("english");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError("");
    setPdfLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-cv", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to parse PDF.");
      if (!data.text || data.text.trim() === "") {
        setPdfError("Could not read this PDF, please paste your CV text instead.");
      } else {
        setCvText(data.text);
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to parse PDF.");
    } finally {
      setPdfLoading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cvText.trim() || !jobRole.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit(cvText.trim(), jobRole.trim(), interviewType, difficulty, feedbackLanguage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowProgress((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
        >
          📊 My Progress
        </button>
      </div>

      {showProgress && <ProgressPanel onClose={() => setShowProgress(false)} />}

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Let&apos;s prepare you for your interview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fill in your details and we&apos;ll generate 5 tailored questions with real feedback.
            </p>
          </div>

          {/* Job role */}
          <div className="space-y-1.5">
            <label htmlFor="jobRole" className="block text-sm font-semibold text-slate-700">
              Target Job Role
            </label>
            <TextInput
              id="jobRole"
              value={jobRole}
              onChange={setJobRole}
              placeholder="e.g. Software Engineer, Marketing Executive, Financial Analyst"
              disabled={loading}
            />
          </div>

          {/* Interview settings row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectInput
              id="interviewType"
              label="Interview Type"
              value={interviewType}
              onChange={(v) => setInterviewType(v as InterviewType)}
              disabled={loading}
            >
              {(Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]).map((k) => (
                <option key={k} value={k}>{INTERVIEW_TYPE_LABELS[k]}</option>
              ))}
            </SelectInput>

            <SelectInput
              id="difficulty"
              label="Difficulty Level"
              value={difficulty}
              onChange={(v) => setDifficulty(v as DifficultyLevel)}
              disabled={loading}
            >
              {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map((k) => (
                <option key={k} value={k}>{DIFFICULTY_LABELS[k]}</option>
              ))}
            </SelectInput>

            <SelectInput
              id="feedbackLanguage"
              label="Feedback Language"
              value={feedbackLanguage}
              onChange={(v) => setFeedbackLanguage(v as FeedbackLanguage)}
              disabled={loading}
            >
              {(Object.keys(LANGUAGE_LABELS) as FeedbackLanguage[]).map((k) => (
                <option key={k} value={k}>{LANGUAGE_LABELS[k]}</option>
              ))}
            </SelectInput>
          </div>

          {/* CV */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Your CV / Resume
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 ${
                  pdfLoading ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {pdfLoading ? "Reading PDF…" : "Upload PDF"}
                <input
                  type="file" accept=".pdf" className="sr-only"
                  onChange={handleFileChange} disabled={pdfLoading || loading}
                />
              </label>
              <span className="text-xs text-slate-400">PDF only · max 4 MB · or paste below</span>
            </div>

            {pdfLoading && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" /> Extracting text from PDF…
              </p>
            )}

            {pdfError && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <span className="text-amber-500 mt-0.5">⚠</span>
                <p className="text-sm text-amber-800">{pdfError}</p>
              </div>
            )}

            <TextArea
              id="cvText"
              value={cvText}
              onChange={setCvText}
              placeholder="Paste the text from your CV here — education, experience, skills, projects…"
              disabled={loading}
              rows={11}
            />
            <p className="text-xs text-slate-400">Plain text works best. Formatting is not required.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
              <span className="text-rose-500 mt-0.5">✕</span>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Generating questions…
              </span>
            ) : (
              "Generate Interview Questions →"
            )}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}

// ─── Step 2: Questions ────────────────────────────────────────────────────────
function QuestionsStep({
  questions,
  jobRole,
  difficulty,
  feedbackLanguage,
  onComplete,
}: {
  questions: Question[];
  jobRole: string;
  difficulty: DifficultyLevel;
  feedbackLanguage: FeedbackLanguage;
  onComplete: (feedbacks: AnswerFeedback[]) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(""));
  const [feedbacks, setFeedbacks] = useState<AnswerFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFeedback, setPendingFeedback] = useState<EvaluateAnswerResponse | null>(null);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  async function handleSubmitAnswer() {
    if (!currentAnswer.trim()) {
      setError("Please write an answer before submitting.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          answer: currentAnswer.trim(),
          jobRole,
          difficulty,
          feedbackLanguage,
        }),
      });
      const data = (await res.json()) as EvaluateAnswerResponse & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Evaluation failed.");
      setPendingFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!pendingFeedback) return;
    const newFeedback: AnswerFeedback = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: currentAnswer.trim(),
      score: pendingFeedback.score,
      feedback: pendingFeedback.feedback,
      improvedAnswer: pendingFeedback.improvedAnswer,
    };
    const updatedFeedbacks = [...feedbacks, newFeedback];
    setPendingFeedback(null);
    if (currentIndex < questions.length - 1) {
      setFeedbacks(updatedFeedbacks);
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(updatedFeedbacks);
    }
  }

  return (
    <div className="space-y-5">
      <StepIndicator current={currentIndex + 1} total={questions.length} />

      <Card className="p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-500">
          Question {currentIndex + 1}
        </p>
        <p className="text-base font-semibold text-slate-900 leading-snug">
          {currentQuestion.question}
        </p>
      </Card>

      {!pendingFeedback ? (
        <Card className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="answer" className="block text-sm font-semibold text-slate-700">
              Your Answer
            </label>
            <TextArea
              id="answer"
              rows={6}
              value={currentAnswer}
              onChange={(v) => {
                const updated = [...answers];
                updated[currentIndex] = v;
                setAnswers(updated);
              }}
              placeholder="Type your answer here. Be specific and use real examples where possible."
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
              <span className="text-rose-500 mt-0.5">✕</span>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <PrimaryButton onClick={handleSubmitAnswer} disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Analyzing your answer…
              </span>
            ) : (
              "Submit Answer →"
            )}
          </PrimaryButton>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="flex items-center justify-between px-5 py-4">
            <p className="text-sm font-semibold text-slate-700">Your Score</p>
            <ScoreBadge score={pendingFeedback.score} />
          </Card>

          <Card className="p-5 space-y-3">
            <p className="text-sm font-bold text-slate-800">Feedback</p>
            <div className="space-y-2.5 text-sm text-slate-700">
              {[
                { label: "Clarity", text: pendingFeedback.feedback.clarity },
                { label: "Structure", text: pendingFeedback.feedback.structure },
                { label: "Relevance", text: pendingFeedback.feedback.relevance },
              ].map(({ label, text }) => (
                <div key={label} className="flex gap-2">
                  <span className="mt-0.5 text-indigo-400 shrink-0">◆</span>
                  <p>
                    <span className="font-semibold text-slate-800">{label}: </span>
                    <FeedbackText text={text} lang={feedbackLanguage} />
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-5">
            <p className="mb-2 text-sm font-bold text-indigo-800">✨ Improved Sample Answer</p>
            <p className="text-sm text-indigo-900 leading-relaxed">
              <FeedbackText text={pendingFeedback.improvedAnswer} lang={feedbackLanguage} />
            </p>
          </div>

          <PrimaryButton onClick={handleNext}>
            {currentIndex < questions.length - 1 ? "Next Question →" : "View Full Report →"}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Summary ──────────────────────────────────────────────────────────
function SummaryStep({
  report,
  jobRole,
  interviewType,
  difficulty,
  feedbackLanguage,
  onRestart,
}: {
  report: SummaryReport;
  jobRole: string;
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  feedbackLanguage: FeedbackLanguage;
  onRestart: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const session: SessionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      jobRole,
      overallScore: report.overallScore,
      questionScores: report.answers.map((a) => a.score),
      interviewType,
      difficulty,
      feedbackLanguage,
    };
    saveSession(session);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoreColor =
    report.overallScore >= 8 ? "text-emerald-500"
    : report.overallScore >= 5 ? "text-amber-500"
    : "text-rose-500";

  const ringColor =
    report.overallScore >= 8 ? "ring-emerald-200"
    : report.overallScore >= 5 ? "ring-amber-200"
    : "ring-rose-200";

  return (
    <div className="space-y-6">
      {/* Score hero */}
      <div className={`rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-center shadow-xl ring-4 ${ringColor}`}>
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
            {INTERVIEW_TYPE_LABELS[interviewType]}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
            {DIFFICULTY_LABELS[difficulty]}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300">
            {LANGUAGE_LABELS[feedbackLanguage]}
          </span>
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Overall Score</p>
        <p className={`mt-2 text-6xl font-black ${scoreColor}`}>
          {report.overallScore.toFixed(1)}
          <span className="text-2xl font-normal text-slate-500">/10</span>
        </p>
        <p className="mt-3 text-sm text-slate-400">
          {report.overallScore >= 8 ? "🏆 Excellent — you're interview-ready!"
            : report.overallScore >= 5 ? "👍 Good effort — a bit more practice will get you there."
            : "💪 Keep practicing — focus on the weak areas below."}
        </p>
      </div>

      {/* Strengths & weak areas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="mb-3 text-sm font-bold text-emerald-800">✅ Strengths</p>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-emerald-900">
                <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                <FeedbackText text={s} lang={feedbackLanguage} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <p className="mb-3 text-sm font-bold text-orange-800">🔧 Areas to Improve</p>
          <ul className="space-y-2">
            {report.weakAreas.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-orange-900">
                <span className="text-orange-400 mt-0.5 shrink-0">•</span>
                <FeedbackText text={w} lang={feedbackLanguage} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Question-by-Question Breakdown</h3>
        {report.answers.map((a, i) => (
          <Card key={a.questionId} className="overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50 active:bg-slate-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-800 line-clamp-1">{a.question}</span>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <ScoreBadge score={a.score} />
                <span className="text-xs text-slate-400">{expanded === i ? "▲" : "▼"}</span>
              </div>
            </button>

            {expanded === i && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your Answer
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">{a.answer}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Feedback</p>
                  {[
                    { label: "Clarity", text: a.feedback.clarity },
                    { label: "Structure", text: a.feedback.structure },
                    { label: "Relevance", text: a.feedback.relevance },
                  ].map(({ label, text }) => (
                    <div key={label} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-indigo-400 shrink-0">◆</span>
                      <p>
                        <span className="font-semibold text-slate-800">{label}: </span>
                        <FeedbackText text={text} lang={feedbackLanguage} />
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-4">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    ✨ Improved Sample Answer
                  </p>
                  <p className="text-sm text-indigo-900 leading-relaxed">
                    <FeedbackText text={a.improvedAnswer} lang={feedbackLanguage} />
                  </p>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <button
        onClick={onRestart}
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.98]"
      >
        ↩ Start a New Interview
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState<Step>("input");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [jobRole, setJobRole] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("mixed");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("fresher");
  const [feedbackLanguage, setFeedbackLanguage] = useState<FeedbackLanguage>("english");
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  async function handleInputSubmit(
    cvText: string,
    role: string,
    type: InterviewType,
    level: DifficultyLevel,
    lang: FeedbackLanguage
  ) {
    const res = await fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cvText, jobRole: role, interviewType: type, difficulty: level }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error ?? "Failed to generate questions.");
    setQuestions(data.questions);
    setJobRole(role);
    setInterviewType(type);
    setDifficulty(level);
    setFeedbackLanguage(lang);
    setStep("questions");
  }

  async function handleQuestionsComplete(feedbacks: AnswerFeedback[]) {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const res = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: feedbacks.map((f) => ({
            questionId: f.questionId,
            question: f.question,
            answer: f.answer,
            score: f.score,
            feedback: f.feedback,
          })),
          jobRole,
          feedbackLanguage,
        }),
      });
      const data = (await res.json()) as GenerateSummaryResponse & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to generate summary.");
      setReport({
        overallScore: data.overallScore,
        strengths: data.strengths,
        weakAreas: data.weakAreas,
        answers: feedbacks,
      });
      setStep("summary");
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSummaryLoading(false);
    }
  }

  function handleRestart() {
    setStep("input");
    setQuestions([]);
    setJobRole("");
    setReport(null);
    setSummaryError("");
  }

  if (summaryLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
          <Spinner size="lg" />
        </div>
        <p className="text-base font-semibold text-slate-700">Generating your performance report…</p>
        <p className="mt-1 text-sm text-slate-400">This takes a few seconds</p>
      </div>
    );
  }

  if (summaryError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-sm font-medium text-slate-700 mb-5">{summaryError}</p>
        <PrimaryButton onClick={handleRestart}>Try Again</PrimaryButton>
      </Card>
    );
  }

  return (
    <>
      {step === "input" && <InputStep onSubmit={handleInputSubmit} />}
      {step === "questions" && questions.length > 0 && (
        <QuestionsStep
          questions={questions}
          jobRole={jobRole}
          difficulty={difficulty}
          feedbackLanguage={feedbackLanguage}
          onComplete={handleQuestionsComplete}
        />
      )}
      {step === "summary" && report && (
        <SummaryStep
          report={report}
          jobRole={jobRole}
          interviewType={interviewType}
          difficulty={difficulty}
          feedbackLanguage={feedbackLanguage}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}
