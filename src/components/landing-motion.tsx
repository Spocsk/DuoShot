"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const played = useRef(new Set<string>());

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
        if (!sequence) return;
        const scenes = Array.from(sequence.querySelectorAll<HTMLElement>(".studio-sequence-stage > [data-sequence-scene]"));
        const steps = Array.from(sequence.querySelectorAll<HTMLElement>("[data-sequence-step]"));
        if (!scenes.length || scenes.length !== steps.length) return;
        sequence.classList.add("is-motion");
        gsap.set(scenes, { autoAlpha: 0 });
        gsap.set(scenes[0], { autoAlpha: 1 });
        gsap.set(steps, { opacity: 0.5 });
        gsap.set(steps[0], { opacity: 1 });
        let running: gsap.core.Timeline | null = null;
        let removeFlights = () => {};

        const finishAnimation = () => {
          running?.progress(1).pause();
          running?.kill();
          running = null;
          removeFlights();
        };
        const animateImport = (scene: HTMLElement) => {
          const thumbs = Array.from(scene.querySelectorAll<HTMLElement>(".studio-sequence-thumb"));
          const targets = [scene.querySelector<HTMLElement>(".duo-closed .harbor-cover"), scene.querySelector<HTMLElement>(".duo-book-inner")];
          const status = scene.querySelector<HTMLElement>(".studio-sequence-import-status");
          const flights: HTMLElement[] = [];
          const sceneRect = scene.getBoundingClientRect();
          const timeline = gsap.timeline({ paused: true });
          targets.forEach((target, index) => {
            if (!target || !thumbs[index]) return;
            const destination = target.getBoundingClientRect();
            const origin = thumbs[index].getBoundingClientRect();
            // Keep percentage padding relative to the screenshot, not the whole scene.
            const flight = document.createElement("div");
            const content = target.cloneNode(true) as HTMLElement;
            content.style.width = "100%";
            content.style.height = "100%";
            flight.appendChild(content);
            flight.classList.add("studio-import-flight");
            Object.assign(flight.style, {
              position: "absolute", left: `${destination.left - sceneRect.left}px`,
              top: `${destination.top - sceneRect.top}px`, width: `${destination.width}px`,
              height: `${destination.height}px`, margin: "0", zIndex: "6", pointerEvents: "none",
              overflow: "hidden", borderRadius: getComputedStyle(index === 0 ? target.parentElement! : target).borderRadius,
            });
            scene.appendChild(flight);
            flights.push(flight);
            gsap.set(target, { opacity: 0 });
            const start = index * 0.16;
            timeline.fromTo(flight, {
              x: origin.left - destination.left, y: origin.top - destination.top,
              scaleX: origin.width / destination.width, scaleY: origin.height / destination.height,
              transformOrigin: "top left", autoAlpha: 1,
            }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.75, ease: "power3.inOut" }, start)
              .to(target, { opacity: 1, duration: 0.12 }, start + 0.7)
              .to(flight, { autoAlpha: 0, duration: 0.12 }, start + 0.75);
          });
          if (status) timeline.fromTo(status, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22 }, 0.85);
          removeFlights = () => {
            flights.forEach((flight) => flight.remove());
            targets.forEach((target) => { if (target) gsap.set(target, { clearProps: "opacity" }); });
          };
          timeline.eventCallback("onComplete", () => removeFlights());
          running = timeline;
          timeline.play();
        };
        const animatePrevention = (scene: HTMLElement) => {
          const markers = scene.querySelectorAll<HTMLElement>(".studio-prevent-marker");
          const checks = scene.querySelectorAll<HTMLElement>(".studio-prevent-checks li");
          const outcome = scene.querySelector<HTMLElement>(".studio-prevent-outcome");
          const timeline = gsap.timeline({ paused: true });
          markers.forEach((marker, index) => {
            timeline.fromTo(marker, { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power3.out" }, index * 0.22);
            if (checks[index]) timeline.fromTo(checks[index], { opacity: 0.3, x: 8 }, { opacity: 1, x: 0, duration: 0.3 }, index * 0.22);
          });
          if (outcome) timeline.fromTo(outcome, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.95);
          running = timeline;
          timeline.play();
        };
        let active = -1;
        const showScene = (index: number) => {
          if (active === index) return;
          finishAnimation();
          active = index;
          scenes.forEach((scene, sceneIndex) => {
            gsap.to(scene, { autoAlpha: sceneIndex === index ? 1 : 0, duration: 0.28, ease: "power2.out", overwrite: true });
          });
          gsap.to(steps, { opacity: (stepIndex: number) => stepIndex === index ? 1 : 0.5, duration: 0.35, overwrite: true });
          const phase = scenes[index].dataset.sequenceScene;
          if (phase && !played.current.has(phase)) {
            played.current.add(phase);
            if (phase === "import") animateImport(scenes[index]);
            if (phase === "prevent") animatePrevention(scenes[index]);
          }
        };
        // A viewport-based selection also handles fast jumps past intermediate steps.
        let frame = 0;
        const updateScene = () => {
          frame = 0;
          const center = window.innerHeight / 2;
          const index = steps.findIndex((step) => {
            const rect = step.getBoundingClientRect();
            return rect.top <= center && rect.bottom > center;
          });
          if (index !== -1) showScene(index);
        };
        const scheduleScene = () => {
          if (!frame) frame = requestAnimationFrame(updateScene);
        };
        window.addEventListener("scroll", scheduleScene, { passive: true });
        window.addEventListener("resize", scheduleScene);
        scheduleScene();
        // Finish in-flight geometry before a resize; any later first play measures afresh.
        let previousWidth = sequence.clientWidth;
        let previousHeight = window.innerHeight;
        const resizeObserver = new ResizeObserver(() => {
          if (sequence.clientWidth !== previousWidth || window.innerHeight !== previousHeight) finishAnimation();
          previousWidth = sequence.clientWidth;
          previousHeight = window.innerHeight;
        });
        resizeObserver.observe(sequence);
        return () => {
          window.removeEventListener("scroll", scheduleScene);
          window.removeEventListener("resize", scheduleScene);
          cancelAnimationFrame(frame);
          resizeObserver.disconnect();
          finishAnimation();
          gsap.killTweensOf([...scenes, ...steps]);
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
