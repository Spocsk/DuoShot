"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { MAX_IMAGES, type Locale } from "@/lib/specs";

export type ToolPanel = "captures" | "adjust" | "review";

export function ToolPanelTabs({ value, onChange, locale }: {value: ToolPanel; onChange: (value: ToolPanel) => void; locale: Locale}) {
  const labels = locale === "fr" ? {captures: "Captures", adjust: "Ajuster", review: "Vérifier"} : {captures: "Screenshots", adjust: "Adjust", review: "Check"};
  return <div className="tool-panel-tabs" role="tablist" aria-label={locale === "fr" ? "Commandes" : "Controls"}>{(["captures", "adjust", "review"] as const).map((panel) => <button key={panel} type="button" role="tab" id={`tool-tab-${panel}`} data-testid={`tool-tab-${panel}`} aria-controls={value === panel ? `tool-panel-${panel}` : undefined} aria-selected={value === panel} tabIndex={value === panel ? 0 : -1} className={value === panel ? "is-on" : ""} onClick={() => onChange(panel)} onKeyDown={(event) => { const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0; if (!dir) return; event.preventDefault(); const panels = ["captures", "adjust", "review"] as const; const next = panels[(panels.indexOf(panel) + dir + panels.length) % panels.length]; onChange(next); requestAnimationFrame(() => document.getElementById(`tool-tab-${next}`)?.focus()); }}>{labels[panel]}</button>)}</div>;
}

export function ToolCanvas({mobileView, onMobileView, slideIndex, locale, children}: {mobileView: "outer" | "inner" | "compare"; onMobileView: (value: "outer" | "inner" | "compare") => void; slideIndex: number; locale: Locale; children: ReactNode}) {
  const labels = locale === "fr" ? {outer: "Fermé", inner: "Ouvert", compare: "Comparer"} : {outer: "Closed", inner: "Open", compare: "Compare"};
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialSlide = useRef(true);
  useEffect(() => {
    if (initialSlide.current) { initialSlide.current = false; return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !canvasRef.current) return;
    const stages = canvasRef.current.querySelectorAll(".preview-stage");
    const tween = gsap.fromTo(stages, {opacity: 0.65, y: 6}, {opacity: 1, y: 0, duration: 0.22, ease: "power2.out", clearProps: "all"});
    return () => { tween.kill(); gsap.set(stages, {clearProps: "all"}); };
  }, [slideIndex]);
  return <div ref={canvasRef} className="tool-canvas" data-mobile-view={mobileView}>
    <div className="tool-mobile-view" role="group" aria-label={locale === "fr" ? "Vue du canvas" : "Canvas view"}>{(["outer", "inner", "compare"] as const).map((view) => <button key={view} type="button" aria-pressed={mobileView === view} className={mobileView === view ? "is-on" : ""} onClick={() => onMobileView(view)}>{labels[view]}</button>)}</div>
    {children}
  </div>;
}

export function PairStrip({outerFiles, innerFiles, active, locale, sameSet, onSelect, onRemove}: {outerFiles: File[]; innerFiles: File[]; active: number; locale: Locale; sameSet: boolean; onSelect: (index: number) => void; onRemove: (side: "outer" | "inner", index: number) => void}) {
  const count = Math.max(outerFiles.length, innerFiles.length);
  if (!count) return <p className="tool-pair-empty">{locale === "fr" ? "Importez votre première paire depuis Captures." : "Import your first pair in Screenshots."}</p>;
  return <div className="tool-pair-strip" aria-label={locale === "fr" ? "Paires de captures" : "Screenshot pairs"}><div className="tool-pair-strip-head"><span>{locale === "fr" ? "Paires" : "Pairs"}</span><span>{count} / {MAX_IMAGES}</span></div><div className="tool-pair-list">{Array.from({length: count}, (_, index) => { const outer = outerFiles[index]; const inner = innerFiles[index]; return <div className={`tool-pair-item ${index === active ? "is-active" : ""}`} key={index}><button type="button" className="tool-pair-select" aria-current={index === active ? "true" : undefined} aria-label={`${locale === "fr" ? "Paire" : "Pair"} ${index + 1}: ${outer ? (locale === "fr" ? "fermé présent" : "closed present") : (locale === "fr" ? "fermé manquant" : "closed missing")}, ${inner ? (locale === "fr" ? "ouvert présent" : "open present") : (locale === "fr" ? "ouvert manquant" : "open missing")}`} onClick={() => onSelect(index)}><strong>{String(index + 1).padStart(2, "0")}</strong><span className="tool-pair-marks"><i data-present={Boolean(outer)} /><i data-present={Boolean(inner)} /></span></button><div className="tool-pair-remove">{outer ? <button type="button" aria-label={`${locale === "fr" ? "Retirer la vue fermé de la paire" : "Remove closed view from pair"} ${index + 1}`} onClick={() => onRemove("outer", index)}>× <span>{locale === "fr" ? "Fermé" : "Closed"}</span></button> : null}{inner && !sameSet ? <button type="button" aria-label={`${locale === "fr" ? "Retirer la vue ouvert de la paire" : "Remove open view from pair"} ${index + 1}`} onClick={() => onRemove("inner", index)}>× <span>{locale === "fr" ? "Ouvert" : "Open"}</span></button> : null}</div></div>; })}</div></div>;
}
