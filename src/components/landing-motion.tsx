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
        if (!sequence) return;
        const scenes = Array.from(sequence.querySelectorAll<HTMLElement>(".studio-sequence-stage > [data-sequence-scene]"));
        const steps = Array.from(sequence.querySelectorAll<HTMLElement>("[data-sequence-step]"));
        if (scenes.length !== 3 || steps.length !== 3) return;

        gsap.set(scenes, { autoAlpha: 0 });
        gsap.set(scenes[0], { autoAlpha: 1 });
        gsap.set(steps, { opacity: 0.5 });
        gsap.set(steps[0], { opacity: 1 });
        const thumbs = scenes[0].querySelectorAll<HTMLElement>(".studio-sequence-thumb");
        const importBar = scenes[0].querySelector<HTMLElement>(".studio-sequence-import-status i");
        const importTimeline = gsap.timeline({ paused: true })
          .fromTo(thumbs, { x: (index: number) => index === 0 ? -70 : 70, y: 65, autoAlpha: 0, scale: 1.12 }, { x: 0, y: 0, autoAlpha: 1, scale: 1, duration: 0.55, stagger: 0.12, ease: "power2.out" })
          .to(thumbs, { x: (index: number) => index === 0 ? -95 : 95, y: -90, autoAlpha: 0, scale: 0.45, duration: 0.55, stagger: 0.08, ease: "power2.inOut" }, 0.75);
        if (importBar) importTimeline.fromTo(importBar, { scaleX: 0 }, { scaleX: 1, duration: 0.95, ease: "power2.inOut" }, 0.45);
        let active = -1;
        const showScene = (index: number) => {
          if (active === index) return;
          active = index;
          scenes.forEach((scene, sceneIndex) => {
            gsap.to(scene, { autoAlpha: sceneIndex === index ? 1 : 0, duration: 0.28, ease: "power2.out", overwrite: true });
          });
          gsap.to(steps, { opacity: (stepIndex: number) => stepIndex === index ? 1 : 0.5, duration: 0.35, overwrite: true });
          if (index === 0) importTimeline.restart();
          else importTimeline.pause();
        };
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const index = steps.indexOf(entry.target as HTMLElement);
            if (index !== -1) showScene(index);
          });
        }, { rootMargin: "-49% 0px -49% 0px" });
        steps.forEach((step) => observer.observe(step));
        return () => observer.disconnect();
      });
    }, node);

    return () => {
      context.revert();
      media.revert();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
