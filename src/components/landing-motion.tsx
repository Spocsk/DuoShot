"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LANDING_MOTION_QUERY } from "@/lib/motion";

/**
 * Scroll narrative for the landing. The hero is never animated from script: its text renders in
 * full ink from the server and the devices settle with a CSS transform. GSAP is only fetched
 * here, on mount, for wide screens without reduced motion.
 */
export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const query = window.matchMedia(LANDING_MOTION_QUERY);
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const start = async () => {
      cleanup?.();
      cleanup = null;
      document.documentElement.classList.toggle("duo-motion", query.matches);
      if (!query.matches) return;
      const { default: gsap } = await import("gsap");
      if (disposed || !query.matches) return;
      cleanup = mountSequence(gsap, node);
    };

    void start();
    const onChange = () => void start();
    query.addEventListener("change", onChange);
    return () => {
      disposed = true;
      query.removeEventListener("change", onChange);
      cleanup?.();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}

type Gsap = typeof import("gsap").default;

function mountSequence(gsap: Gsap, node: HTMLElement): (() => void) | null {
  const sequence = node.querySelector<HTMLElement>(".studio-sequence");
  const stage = sequence?.querySelector<HTMLElement>(".studio-sequence-stage");
  if (!sequence || !stage) return null;
  const steps = Array.from(sequence.querySelectorAll<HTMLElement>("[data-sequence-step]"));
  const panels = [".studio-sequence-import", ".studio-sequence-analysis", ".studio-sequence-report", ".studio-sequence-prevent"]
    .map((selector) => stage.querySelector<HTMLElement>(selector));
  const score = stage.querySelector<HTMLElement>(".studio-sequence-score strong");
  if (steps.length !== 4 || panels.some((panel) => !panel) || !score) return null;
  const [importPanel, inspectPanel, reportPanel, preventPanel] = panels as HTMLElement[];
  const q = gsap.utils.selector(stage);
  const scoreText = score.textContent;
  const dots = q(".studio-stage-progress i");

  let master: gsap.core.Timeline | null = null;
  let frame = 0;

  const context = gsap.context(() => {
    sequence.classList.add("is-motion");
    // State 0 is a finished import panel, never an empty stage.
    gsap.set(steps, { opacity: 0.4 });
    gsap.set([inspectPanel, reportPanel, preventPanel], { autoAlpha: 0, y: 24 });
    gsap.set(dots, { scaleX: 0, transformOrigin: "left center" });

    master = gsap.timeline({ paused: true });
    const segment = (index: number) => {
      const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      master!.add(timeline, index);
      return timeline;
    };
    const handOff = (timeline: gsap.core.Timeline, index: number, from: HTMLElement, to: HTMLElement) => timeline
      .to(steps[index - 1]!, { opacity: 0.4, duration: 0.3 }, 0)
      .to(steps[index]!, { opacity: 1, duration: 0.3 }, 0.1)
      .to(from, { autoAlpha: 0, y: -18, duration: 0.3 }, 0)
      .to(to, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, 0.25)
      .to(dots[index]!, { scaleX: 1, duration: 0.6, ease: "none" }, 0.1);

    // 01 — import: the panel is already complete; the step and its progress mark light up.
    segment(0)
      .to(steps[0]!, { opacity: 1, duration: 0.3 }, 0)
      .to(dots[0]!, { scaleX: 1, duration: 0.6, ease: "none" }, 0.1)
      .fromTo(q(".studio-sequence-import .studio-import-pair"), { y: 0 }, { y: -3, duration: 0.15, stagger: 0.08, yoyo: true, repeat: 1 }, 0.1);

    // 02 — inspect: guides close in on the pixel frame, the hinge band lights, the score counts.
    const counter = { value: 0 };
    handOff(segment(1), 1, importPanel, inspectPanel)
      .fromTo(q(".studio-sequence-analysis .studio-frame-guide i"), { scale: 0 }, { scale: 1, duration: 0.3, stagger: 0.06, ease: "power3.out" }, 0.4)
      .fromTo(q(".studio-sequence-analysis .studio-hinge-band"), { autoAlpha: 0, scaleY: 0.2 }, { autoAlpha: 1, scaleY: 1, duration: 0.35 }, 0.5)
      .fromTo(counter, { value: 0 }, {
        value: 83, duration: 0.4, ease: "power1.out",
        onUpdate: () => { score.textContent = `${Math.round(counter.value)} / 100`; },
      }, 0.55);

    // 03 — report: each kind of check fills its own bar.
    handOff(segment(2), 2, inspectPanel, reportPanel)
      .fromTo(q(".studio-sequence-report .studio-report-rows i"), { scaleX: 0 }, { scaleX: 1, duration: 0.35, stagger: 0.12, transformOrigin: "left center" }, 0.45);

    // 04 — prevent: checks light up in order, then the outcome.
    handOff(segment(3), 3, reportPanel, preventPanel)
      .fromTo(q(".studio-sequence-prevent .studio-prevent-checks li"), { opacity: 0.3, x: 8 }, { opacity: 1, x: 0, duration: 0.2, stagger: 0.12 }, 0.4)
      .fromTo(q(".studio-sequence-prevent .studio-prevent-outcome"), { opacity: 0.4, y: 6 }, { opacity: 1, y: 0, duration: 0.2 }, 0.75);

    master.set({}, {}, steps.length);
  }, stage);

  // Each step's text sweeps through a short window (top of the step from 78% to 38% of the
  // viewport); time is the sum of the window progresses, so the scene holds while a step is read.
  const progress = () => {
    const height = window.innerHeight;
    return steps.reduce((sum, step) => sum + gsap.utils.clamp(0, 1, (height * 0.78 - step.getBoundingClientRect().top) / (height * 0.4)), 0);
  };
  const seek = () => {
    frame = 0;
    if (master) gsap.to(master, { time: progress(), duration: 0.6, ease: "power2.out", overwrite: true });
  };
  const scheduleSeek = () => {
    if (!frame) frame = requestAnimationFrame(seek);
  };
  const remeasure = () => {
    if (!master) return;
    gsap.killTweensOf(master);
    master.time(0).invalidate().time(progress());
  };
  master!.time(progress());
  window.addEventListener("scroll", scheduleSeek, { passive: true });
  window.addEventListener("resize", remeasure);

  return () => {
    window.removeEventListener("scroll", scheduleSeek);
    window.removeEventListener("resize", remeasure);
    cancelAnimationFrame(frame);
    if (master) gsap.killTweensOf(master);
    context.revert();
    score.textContent = scoreText;
    sequence.classList.remove("is-motion");
  };
}
