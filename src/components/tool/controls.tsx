"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

export function Seg({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  const movePill = useCallback((animate: boolean) => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const tab = bar.querySelector<HTMLElement>(`[data-seg="${value}"]`);
    if (!tab) return;
    if (!animate) pill.style.transition = "none";
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
    if (!animate) {
      void pill.offsetWidth;
      pill.style.transition = "";
    }
  }, [value]);

  useEffect(() => {
    movePill(!first.current);
    first.current = false;
    const onResize = () => movePill(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movePill, options]);

  return (
    <div className="ds-field">
      <p className="ds-label" id={labelId}>
        {label}
      </p>
      <div
        ref={barRef}
        className="ds-seg t-tabs"
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={(event) => {
          const dir =
            event.key === "ArrowRight" || event.key === "ArrowDown"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowUp"
                ? -1
                : 0;
          if (!dir) return;
          event.preventDefault();
          const group = event.currentTarget;
          const index = options.findIndex((option) => option.value === value);
          const next = options[(index + dir + options.length) % options.length];
          if (!next) return;
          onChange(next.value);
          queueMicrotask(() => {
            (group.querySelector(`[data-seg="${next.value}"]`) as HTMLButtonElement | null)?.focus();
          });
        }}
      >
        <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-seg={option.value}
            className={`t-tab ${value === option.value ? "is-on" : ""}`}
            aria-checked={value === option.value}
            tabIndex={value === option.value ? 0 : -1}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DigitCount({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.classList.remove("is-animating");
    group.replaceChildren();
    value.split("").forEach((ch, index, chars) => {
      const span = document.createElement("span");
      span.className = "t-digit";
      span.textContent = ch;
      if (index === chars.length - 2) span.dataset.stagger = "1";
      else if (index === chars.length - 1) span.dataset.stagger = "2";
      group.appendChild(span);
    });
    void group.offsetHeight;
    group.classList.add("is-animating");
  }, [value]);
  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} className="t-digit-group" aria-hidden="true" />
    </>
  );
}

export function SwapLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(text);
  useEffect(() => {
    const el = ref.current;
    if (!el || prev.current === text) {
      if (el) el.textContent = text;
      return;
    }
    const dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur")) || 150;
    el.classList.add("is-exit");
    const timer = window.setTimeout(() => {
      el.textContent = text;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight;
      el.classList.remove("is-enter-start");
      prev.current = text;
    }, dur);
    return () => window.clearTimeout(timer);
  }, [text]);
  return <span ref={ref} className="t-text-swap">{text}</span>;
}

export function DsToggle({
  pressed,
  onToggle,
  testId,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  testId: string;
  children: ReactNode;
}) {
  const [init, setInit] = useState(false);
  return (
    <button
      type="button"
      className="ds-toggle"
      data-testid={testId}
      aria-pressed={pressed}
      onClick={() => {
        setInit(true);
        onToggle();
      }}
    >
      <span className="text-sm">{children}</span>
      <span className={`ds-toggle-track t-toggle ${init ? "is-init" : ""}`} data-on={pressed ? "true" : "false"}>
        <span className="ds-toggle-thumb t-toggle-thumb" />
      </span>
    </button>
  );
}

export function CloneTip({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  const groupRef = useRef<HTMLSpanElement>(null);
  function hide() {
    const tip = groupRef.current?.querySelector<HTMLElement>(".t-tt");
    if (!tip) return;
    tip.setAttribute("data-show", "false");
    tip.setAttribute("aria-hidden", "true");
  }
  function place() {
    const group = groupRef.current;
    const tip = group?.querySelector<HTMLElement>(".t-tt");
    const text = group?.querySelector<HTMLElement>(".t-tt-text");
    const trigger = group?.querySelector<HTMLElement>(".t-tt-trigger");
    if (!group || !tip || !text || !trigger) return;
    const showing = tip.getAttribute("data-show") === "true";
    text.textContent = hint;
    const cs = getComputedStyle(tip);
    const width = Math.ceil(text.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight));
    const g = group.getBoundingClientRect();
    const r = trigger.getBoundingClientRect();
    const x = r.left - g.left + r.width / 2 - width / 2;
    if (!showing) {
      tip.style.transition = "none";
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
      void tip.offsetWidth;
      tip.style.transition = "";
    } else {
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
    }
    tip.setAttribute("data-show", "true");
    tip.setAttribute("aria-hidden", "false");
  }
  return (
    <span ref={groupRef} className="t-tt-group" onPointerLeave={hide}>
      <span className="t-tt-trigger" data-tooltip={hint} onPointerEnter={place} onFocus={place} onBlur={hide}>
        {children}
      </span>
      <span className="t-tt" data-show="false" aria-hidden="true">
        <span className="t-tt-text">{label}</span>
      </span>
    </span>
  );
}

export function StatusLine({
  text,
  kind,
  testId,
}: {
  text: string | null;
  kind: "ok" | "err" | "busy" | "info";
  testId: string;
}) {
  if (!text) return null;
  return (
    <p
      className={`t-toast is-open mt-3 text-sm ${kind === "err" ? "t-input is-error is-shaking" : ""}`}
      data-testid={testId}
      data-kind={kind}
      role={kind === "err" ? "alert" : "status"}
      aria-live={kind === "err" ? "assertive" : "polite"}
    >
      {kind === "busy" ? (
        <span className="t-think">
          <span className="t-think-sizer">{text}</span>
          <span className="t-think-text" data-text={text}>
            {text}
          </span>
        </span>
      ) : (
        <>
          {kind === "ok" ? (
            <span className="t-success-check mr-2 inline-block align-middle" data-state="in">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 8.5L6.2 12L13 4.5" />
              </svg>
            </span>
          ) : null}
          {text}
        </>
      )}
    </p>
  );
}
