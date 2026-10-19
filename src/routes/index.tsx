import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learn Word Smart — Solitaire Vocabulary Study" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Flashcards, honesty checks and 5-mode quizzes to master exam vocabulary. Study 10 free cards and take a timed 20-word bonus assessment." },
      { property: "og:title", content: "Learn Word Smart" },
      { property: "og:description", content: "Master exam vocabulary with Bangla meanings. 10 free cards and a timed launch bonus assessment." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary font-display text-2xl font-extrabold text-primary-foreground">W</span>
      <h1 className="mt-6 font-display text-5xl font-extrabold tracking-tight">Learn Word Smart</h1>
      <p className="mt-3 max-w-md text-muted-foreground">Flashcards with Bangla meanings, honesty checks, and exam-style quizzes. Start with 10 free cards and a five-minute bonus assessment.</p>
      <Button asChild size="lg" className="mt-8">
        <Link to="/study">Start free assessment</Link>
      </Button>
    </div>
  );
}
