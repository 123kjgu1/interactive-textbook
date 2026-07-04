import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Art of Design — Interactive 3D Book" },
      {
        name: "description",
        content:
          "A premium interactive 3D hardcover book. Drag to rotate, scroll to zoom, click to open and flip through the pages.",
      },
      { property: "og:title", content: "The Art of Design — Interactive 3D Book" },
      {
        property: "og:description",
        content:
          "A cinematic, real-time 3D book experience built with Three.js and GSAP.",
      },
    ],
  }),
  component: Index,
});

const Book3D = lazy(() => import("@/components/Book3D"));

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a2620_0%,#08110d_60%,#03080a_100%)] text-foreground">
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-amber-200/60">
              Veridian Press
            </p>
            <h1 className="mt-1 font-serif text-2xl text-amber-100/90 md:text-3xl">
              The Art of Design
            </h1>
          </div>
          <span className="hidden text-xs uppercase tracking-[0.3em] text-amber-100/40 md:block">
            First Edition — MMXXVI
          </span>
        </header>
        <footer className="flex flex-col items-center gap-1 text-center text-xs text-amber-100/50">
          <p className="uppercase tracking-[0.35em]">
            Drag to rotate · Scroll to zoom · Click to open
          </p>
        </footer>
      </div>
      <div className="absolute inset-0">
        {mounted && (
          <Suspense fallback={null}>
            <Book3D />
          </Suspense>
        )}
      </div>
    </main>
  );
}
