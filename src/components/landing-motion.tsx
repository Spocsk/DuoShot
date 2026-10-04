"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".studio-hero-copy > *",
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", clearProps: "all" },
        );
        gsap.fromTo(
          ".studio-hero-object .duo-closed",
          { autoAlpha: 0, x: 48, rotate: 4 },
          { autoAlpha: 1, x: 0, rotate: 0, duration: 1.25, delay: 0.12, ease: "power3.out", clearProps: "all" },
        );
        gsap.fromTo(
          ".studio-hero-object .duo-open",
          { autoAlpha: 0, x: -52, rotate: -3 },
          { autoAlpha: 1, x: 0, rotate: 0, duration: 1.35, delay: 0.2, ease: "power3.out", clearProps: "all" },
        );
      });

      media.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const sequence = node.querySelector<HTMLElement>(".studio-sequence");
        const stage = sequence?.querySelector<HTMLElement>(".studio-sequence-stage");
        if (!sequence || !stage) return;
        const steps = Array.from(sequence.querySelectorAll<HTMLElement>("[data-sequence-step]"));
        if (steps.length !== 4) return;
        const q = gsap.utils.selector(stage);
        const one = (selector: string) => stage.querySelector<HTMLElement>(selector);
        const cluster = one(".duo-cluster");
        const outerScreen = one(".duo-closed .duo-screen");
        const book = one(".duo-book-inner");
        const thumbs = q(".studio-sequence-thumb");
        const score = one(".studio-sequence-score strong");
        if (!cluster || !outerScreen || !book || thumbs.length !== 2 || !score) return;
        sequence.classList.add("is-motion");
        const scoreText = score.textContent;

        // Layout box relative to the stage, ignoring transforms, so flights aim true after any refresh.
        const box = (element: HTMLElement) => {
          let left = 0;
          let top = 0;
          let current: HTMLElement | null = element;
          while (current && current !== stage) {
            left += current.offsetLeft;
            top += current.offsetTop;
            current = current.offsetParent as HTMLElement | null;
          }
          return { left, top, width: element.offsetWidth, height: element.offsetHeight };
        };
        const flight = (thumb: HTMLElement, target: HTMLElement) => ({
          x: () => box(target).left - box(thumb).left,
          y: () => box(target).top - box(thumb).top,
          scaleX: () => box(target).width / box(thumb).width,
          scaleY: () => box(target).height / box(thumb).height,
        });

        // State 0: the device waits half-folded with blank screens, captures ready below.
        gsap.set(steps, { opacity: 0.4 });
        gsap.set(cluster, { transformOrigin: "60% 55%" });
        gsap.set(q(".duo-leaf-left"), { rotateY: 38, transformOrigin: "100% 50%", transformPerspective: 900 });
        gsap.set(q(".duo-leaf-right"), { rotateY: -38, transformOrigin: "0% 50%", transformPerspective: 900 });
        gsap.set([outerScreen, ...q(".duo-book-inner .duo-screen")], { autoAlpha: 0 });
        gsap.set(q(".duo-crease"), { opacity: 0 });
        gsap.set(thumbs, { transformOrigin: "0 0" });
        gsap.set(q(".studio-sequence-import-status i"), { scaleX: 0 });
        gsap.set(q(".studio-sequence-import-status strong"), { autoAlpha: 0 });

        // One master timeline, one unit per step, so shared properties hand off in order both ways.
        const master = gsap.timeline({ paused: true });
        const segment = (index: number) => {
          const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" } });
          master.add(timeline, index);
          return timeline;
        };

        // 01 — import: captures fly into each screen while the device unfolds.
        segment(0)
          .to(steps[0], { opacity: 1, duration: 0.3 }, 0)
          .to(q(".studio-sequence-thumb > span"), { autoAlpha: 0, duration: 0.12 }, 0.05)
          .to(thumbs[0], { ...flight(thumbs[0], outerScreen), borderWidth: 0, duration: 0.4 }, 0.05)
          .to(outerScreen, { autoAlpha: 1, duration: 0.1 }, 0.4)
          .to(thumbs[0], { autoAlpha: 0, duration: 0.1 }, 0.43)
          .to(thumbs[1], { ...flight(thumbs[1], book), borderWidth: 0, duration: 0.4 }, 0.15)
          .to(q(".duo-book-inner .duo-screen"), { autoAlpha: 1, duration: 0.1 }, 0.5)
          .to(thumbs[1], { autoAlpha: 0, duration: 0.1 }, 0.53)
          // The capture lands on the half-folded leaves, which then flatten around the hinge.
          .to(q(".duo-leaf"), { rotateY: 0, duration: 0.45, ease: "power2.out" }, 0.5)
          .to(q(".duo-crease"), { opacity: 1, duration: 0.2 }, 0.75)
          .to(q(".studio-sequence-import-status i"), { scaleX: 1, duration: 0.8, ease: "none" }, 0.1)
          .to(q(".studio-sequence-import-status strong"), { autoAlpha: 1, duration: 0.15 }, 0.8);

        // 02 — inspect: push in on the open screens, frame them, light the hinge, score the result.
        const counter = { value: 0 };
        segment(1)
          .to(steps[0], { opacity: 0.4, duration: 0.3 }, 0)
          .to(steps[1], { opacity: 1, duration: 0.3 }, 0.1)
          .to(q(".studio-sequence-import"), { autoAlpha: 0, y: -14, duration: 0.3 }, 0)
          .to(cluster, { scale: 1.06, y: 10, duration: 0.6 }, 0.05)
          .to(q(".studio-frame-guide"), { autoAlpha: 1, duration: 0.15 }, 0.3)
          .fromTo(q(".studio-frame-guide i"), { scale: 0 }, { scale: 1, duration: 0.35, stagger: 0.06, ease: "power3.out" }, 0.3)
          .fromTo(q(".studio-hinge-glow"), { autoAlpha: 0, scaleY: 0.2 }, { autoAlpha: 1, scaleY: 1, duration: 0.4 }, 0.45)
          .fromTo(q(".studio-sequence-analysis"), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, 0.35)
          .fromTo(counter, { value: 0 }, {
            value: 83, duration: 0.45, ease: "power1.out",
            onUpdate: () => { score.textContent = `${Math.round(counter.value)} / 100`; },
          }, 0.5);

        // 03 — report: step back from the device and sort what remains into three kinds of check.
        segment(2)
          .to(steps[1], { opacity: 0.4, duration: 0.3 }, 0)
          .to(steps[2], { opacity: 1, duration: 0.3 }, 0.1)
          .to([...q(".studio-frame-guide"), ...q(".studio-hinge-glow")], { autoAlpha: 0, duration: 0.25 }, 0)
          .to(q(".studio-sequence-analysis"), { autoAlpha: 0, y: -16, duration: 0.3 }, 0)
          .to(cluster, { scale: 0.92, y: -10, duration: 0.6 }, 0.05)
          .fromTo(q(".studio-sequence-report"), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out" }, 0.3)
          .fromTo(q(".studio-sequence-report li"), { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.12 }, 0.45)
          .fromTo(q(".studio-sequence-report li i"), { scale: 0 }, { scale: 1, duration: 0.25, stagger: 0.12, ease: "back.out(2)" }, 0.5);

        // 04 — prevent: each issue is pinned on the device next to its check, then the outcome.
        const markers = q(".studio-prevent-marker");
        const checks = q(".studio-prevent-checks li");
        const prevent = segment(3)
          .to(steps[2], { opacity: 0.4, duration: 0.3 }, 0)
          .to(steps[3], { opacity: 1, duration: 0.3 }, 0.1)
          .to(q(".studio-sequence-report"), { autoAlpha: 0, y: -16, duration: 0.3 }, 0)
          .to(cluster, { scale: 1, y: 0, duration: 0.5 }, 0.05)
          .fromTo(q(".studio-sequence-prevent"), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power3.out" }, 0.25)
          .set(q(".studio-prevent-markers"), { autoAlpha: 1 }, 0.35)
          .fromTo(q(".studio-prevent-outcome"), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.8);
        markers.forEach((marker, index) => {
          const at = 0.4 + index * 0.13;
          prevent.fromTo(marker, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.2, ease: "back.out(2.5)" }, at);
          if (checks[index]) prevent.fromTo(checks[index], { opacity: 0.3, x: 8 }, { opacity: 1, x: 0, duration: 0.2 }, at);
        });

        master.set({}, {}, steps.length);

        // Each step's text sweeps through a short window (top of the step from 78% to 38% of the
        // viewport); the time is the sum of the window progresses, so the scene holds while a step
        // is read and survives uneven step heights. Read from live rects: a ScrollTrigger refresh
        // would reset the scroll position and cut short smooth scrolls started during load.
        const progress = () => {
          const height = window.innerHeight;
          return steps.reduce((sum, step) => sum + gsap.utils.clamp(0, 1, (height * 0.78 - step.getBoundingClientRect().top) / (height * 0.4)), 0);
        };
        let frame = 0;
        const seek = () => {
          frame = 0;
          gsap.to(master, { time: progress(), duration: 0.6, ease: "power2.out", overwrite: true });
        };
        const scheduleSeek = () => {
          if (!frame) frame = requestAnimationFrame(seek);
        };
        // Layout changed: replay from the start so measured flights and recorded start values are fresh.
        let disposed = false;
        const remeasure = () => {
          if (disposed) return;
          gsap.killTweensOf(master);
          master.time(0).invalidate().time(progress());
        };
        master.time(progress());
        window.addEventListener("scroll", scheduleSeek, { passive: true });
        window.addEventListener("resize", remeasure);
        document.fonts?.ready.then(remeasure);

        return () => {
          disposed = true;
          window.removeEventListener("scroll", scheduleSeek);
          window.removeEventListener("resize", remeasure);
          cancelAnimationFrame(frame);
          score.textContent = scoreText;
          sequence.classList.remove("is-motion");
        };
      });
    }, node);

    return () => {
      context.revert();
      media.revert();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
