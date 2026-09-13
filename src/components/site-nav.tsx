"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import gsap from "gsap";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { HeaderAuth } from "@/components/header-auth";
import { LocaleSwitch } from "@/components/locale-switch";
import { prefersReducedMotion } from "@/lib/motion";

type Props = {
  locale: Locale;
  home: string;
  prefix: string;
  otherHref: string;
};

const CLIP_OPEN = "circle(150% at calc(100% - 2.1rem) 1.85rem)";
const CLIP_CLOSED = "circle(0% at calc(100% - 2.1rem) 1.85rem)";

export function SiteNav({ locale, home, prefix, otherHref }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    mq.addEventListener("change", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const reduced = prefersReducedMotion();
    if (reduced) {
      gsap.set(node, {
        clipPath: open ? CLIP_OPEN : CLIP_CLOSED,
        pointerEvents: open ? "auto" : "none",
      });
      return;
    }
    const tween = gsap.to(node, {
      clipPath: open ? CLIP_OPEN : CLIP_CLOSED,
      duration: open ? 0.7 : 0.45,
      ease: open ? "power3.out" : "power2.in",
      pointerEvents: open ? "auto" : "none",
    });
    return () => {
      tween.kill();
    };
  }, [open, mounted]);

  function close() {
    setOpen(false);
  }

  const menu = (
    <div
      ref={panel}
      id="site-menu"
      className="ds-menu md:hidden"
      aria-hidden={!open}
      inert={!open}
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      <nav className="flex flex-col text-[var(--foreground)]" onClick={close}>
        <a href={`${home}#pricing`}>{t(locale, "nav_pricing")}</a>
        <Link href={`${prefix}/specs`}>{t(locale, "nav_specs")}</Link>
        <Link href={`${prefix}/tool`}>{t(locale, "nav_tool")}</Link>
        <div className="mt-6 flex flex-col gap-4 text-base font-sans">
          <HeaderAuth locale={locale} variant="menu" />
          <LocaleSwitch locale={locale} href={otherHref} />
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={`ds-burger md:hidden ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? t(locale, "nav_close") : t(locale, "nav_open")}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>
      {mounted ? createPortal(menu, document.body) : null}
    </>
  );
}
