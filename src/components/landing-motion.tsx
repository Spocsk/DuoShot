"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from(".duo-cluster", {
        y: 36,
        duration: 1.35,
        ease: "power3.out",
      });
      gsap.to(".duo-cluster", {
        y: -10,
        duration: 5.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: 1.4,
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          {
            clipPath: "inset(14% 10% 14% 10% round 2.2rem)",
            opacity: 0.35,
          },
          {
            clipPath: "inset(0% 0% 0% 0% round 0px)",
            opacity: 1,
            duration: 1.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 86%",
            },
          },
        );
      });
    }, node);

    return () => ctx.revert();
  }, []);

  return <div ref={root}>{children}</div>;
}
