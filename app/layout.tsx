import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Interview Coach",
  description:
    "Prepare for your dream job with AI-powered mock interviews tailored for Pakistani fresh graduates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        {/* Gradient hero header */}
        <header className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-6 py-10 text-center shadow-lg">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <span className="text-2xl">🎯</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              AI Interview Coach
            </h1>
            <p className="mt-2 text-indigo-100 text-sm sm:text-base">
              Personalised mock interviews for Pakistani fresh graduates
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</main>

        <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          AI Interview Coach · Powered by Gemini
        </footer>
      </body>
    </html>
  );
}
