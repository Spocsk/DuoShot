"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGES } from "@/lib/specs";
import { DigitCount } from "@/components/tool/controls";
import { takeFiles } from "@/components/tool/files";

export function DropZone({
  testId,
  label,
  hint,
  count,
  names = [],
  disabled = false,
  onFiles,
}: {
  testId: string;
  label: string;
  hint: string;
  count: number;
  names?: string[];
  disabled?: boolean;
  onFiles: (list: FileList | File[] | DataTransfer | null) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  }, [onFiles]);
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const handler = () => {
      const files = takeFiles(node.files);
      if (files.length) onFilesRef.current(files);
      node.value = "";
    };
    node.addEventListener("change", handler);
    return () => node.removeEventListener("change", handler);
  }, []);
  return (
    <label
      className={`ds-drop ${over ? "is-over" : ""} ${disabled ? "is-disabled" : ""}`}
      data-testid={testId}
      data-count={count}
      onDragEnter={() => {
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled) return;
        const files = takeFiles(event.dataTransfer);
        if (files.length) onFiles(files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        disabled={disabled}
        aria-label={label}
        data-testid={`${testId}-input`}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <span>{label}</span>
      <span className="ds-drop-hint mt-2 text-sm">{hint}</span>
      <span className="mt-2 text-sm text-[var(--muted)]">
        <DigitCount value={`${count}`} /> / {MAX_IMAGES}
      </span>
      {names.length ? (
        <span className="drop-names" title={names.join(", ")}>
          {names.join(" · ")}
        </span>
      ) : null}
    </label>
  );
}
