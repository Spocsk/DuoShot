"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(element, { autoAlpha: 0.5, y: 32 }, {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
            clearProps: "all",
          });
        });
      });

      media.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        const sequence = node.querySelector<HTMLElement>(".studio-sequence");
        if (!sequence) return;
        const closed = sequence.querySelector<HTMLElement>(".duo-closed");
        const open = sequence.querySelector<HTMLElement>(".duo-open");
        const device = sequence.querySelector<HTMLElement>(".studio-sequence-device");
        const inspection = sequence.querySelector<HTMLElement>(".studio-sequence-inspection");
        const scanLine = sequence.querySelector<HTMLElement>(".studio-sequence-inspection-line");
        const result = sequence.querySelector<HTMLElement>(".studio-sequence-result");
        const steps = sequence.querySelectorAll<HTMLElement>("[data-sequence-step]");
        if (!closed || !open || !device || !inspection || !scanLine || !result || steps.length !== 3) return;

        gsap.set([closed, open, device, inspection, scanLine, result], { willChange: "transform, opacity" });
        gsap.timeline({
          scrollTrigger: {
            trigger: sequence,
            start: "top 58%",
            end: "bottom 75%",
            scrub: 1,
          },
        })
          // Pair the two captures without changing their physical scale.
          .fromTo(closed, { xPercent: -12, rotation: -4 }, { xPercent: 0, rotation: 0, duration: 0.28, ease: "power2.inOut" }, 0)
          .fromTo(open, { xPercent: 9, rotation: 3 }, { xPercent: 0, rotation: 0, duration: 0.28, ease: "power2.inOut" }, 0)
          .to(steps[0], { opacity: 0.45, duration: 0.12 }, 0.3)
          // The inspection frame traces the pair, followed by a vertical scan.
          .fromTo(inspection, { clipPath: "inset(0 100% 0 0)", opacity: 0 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, duration: 0.23, ease: "power2.out" }, 0.32)
          .fromTo(scanLine, { yPercent: -44, opacity: 0 }, { yPercent: 165, opacity: 1, duration: 0.28, ease: "none" }, 0.42)
          .to(steps[1], { opacity: 0.45, duration: 0.12 }, 0.63)
          .to(inspection, { opacity: 0, duration: 0.12 }, 0.66)
          // Lift the pair to make room for the report card.
          .to(device, { yPercent: -8, duration: 0.28, ease: "power2.inOut" }, 0.67)
          .fromTo(result, { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: "power2.out" }, 0.72);
      });
    }, node);

    return () => {
      context.revert();
      media.revert();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
