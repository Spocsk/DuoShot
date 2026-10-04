"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/specs";
import { HeaderAuth } from "@/components/header-auth";
import { pricingPath, rejectionPath } from "@/lib/site";

type Props = {
  locale: Locale;
  prefix: string;
  /** Localized path of the current page, for aria-current. */
  current?: string;
};

const subscribeNever = () => () => {};

export function SiteNav({ locale, prefix, current }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

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

  // Focus moves into the menu on open and back to the toggle on close.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      toggle.current?.focus();
    }
  }, [open, mounted]);

  function close() {
    setOpen(false);
  }

  const links = [
    { href: `${prefix}/tool`, label: t("nav_tool") },
    { href: `${prefix}/specs`, label: t("nav_specs") },
    { href: rejectionPath(locale), label: t("nav_rejection") },
    { href: pricingPath(locale), label: t("nav_pricing") },
  ];

  const menu = (
    <div
      ref={panel}
      id="site-menu"
      className={`ds-menu md:hidden${open ? " is-open" : ""}`}
      aria-hidden={!open}
      inert={!open}
    >
      <nav className="flex flex-col text-[var(--foreground)]" onClick={close}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined}>
            {link.label}
          </Link>
        ))}
        <div className="mt-6 flex flex-col gap-4 text-base font-sans">
          <HeaderAuth locale={locale} variant="menu" />
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className={`ds-burger md:hidden ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? t("nav_close") : t("nav_open")}
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
