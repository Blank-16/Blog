"use client";

import { useState } from "react";
import {
  UseFormRegister,
  UseFormWatch,
  FieldValues,
  Path,
} from "react-hook-form";

interface SeoPanelProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  watch: UseFormWatch<T>;
  postTitle: string;
}

function CharCount({
  value,
  max,
  warn,
}: {
  value: string;
  max: number;
  warn: number;
}) {
  const len = value.length;
  const color =
    len > max ? "text-red-500" : len >= warn ? "text-amber-500" : "text-muted";
  return (
    <span className={`text-[10px] tabular-nums ${color}`}>
      {len}/{max}
    </span>
  );
}

function ScoreRow({
  label,
  pass,
  tip,
}: {
  label: string;
  pass: boolean;
  tip: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span
        className={`mt-0.5 flex-shrink-0 font-mono text-[11px] leading-none ${pass ? "text-green-500" : "text-amber-500"}`}
      >
        {pass ? "[+]" : "[ ]"}
      </span>
      <div>
        <span className={pass ? "text-ink" : "text-muted"}>{label}</span>
        {!pass && <p className="text-muted mt-0.5">{tip}</p>}
      </div>
    </div>
  );
}

export default function SeoPanel<T extends FieldValues>({
  register,
  watch,
  postTitle,
}: SeoPanelProps<T>) {
  const [open, setOpen] = useState(false);

  const metaTitle = (watch("metaTitle" as Path<T>) as string) ?? "";
  const metaDescription = (watch("metaDescription" as Path<T>) as string) ?? "";
  const focusKeyword = (watch("focusKeyword" as Path<T>) as string) ?? "";
  const noIndex = (watch("noIndex" as Path<T>) as boolean) ?? false;

  const effectiveTitle = metaTitle || postTitle;
  const kw = focusKeyword.toLowerCase().trim();

  // SEO score checks
  const checks = [
    {
      label: "Meta title set",
      pass: metaTitle.length > 0,
      tip: "Add a custom meta title for better click-through rates.",
    },
    {
      label: `Meta title length (${effectiveTitle.length} chars)`,
      pass: effectiveTitle.length >= 30 && effectiveTitle.length <= 60,
      tip: "Keep between 30 and 60 characters - Google truncates longer titles.",
    },
    {
      label: "Meta description set",
      pass: metaDescription.length > 0,
      tip: "A description improves click-through rate from search results.",
    },
    {
      label: `Meta description length (${metaDescription.length} chars)`,
      pass: metaDescription.length >= 120 && metaDescription.length <= 160,
      tip: "Keep between 120 and 160 characters for best display in Google.",
    },
    {
      label: "Focus keyword set",
      pass: kw.length > 0,
      tip: "Set a focus keyword to check if it appears in key places.",
    },
    {
      label: "Keyword in meta title",
      pass: kw.length > 0 && effectiveTitle.toLowerCase().includes(kw),
      tip: "Include your focus keyword in the title.",
    },
    {
      label: "Keyword in meta description",
      pass: kw.length > 0 && metaDescription.toLowerCase().includes(kw),
      tip: "Mention your focus keyword in the description.",
    },
    {
      label: "Not set to noindex",
      pass: !noIndex,
      tip: "This post is hidden from search engines. Enable indexing to rank.",
    },
  ];

  const score = checks.filter((c) => c.pass).length;
  const scoreColor =
    score >= 7
      ? "text-green-500"
      : score >= 4
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="rounded-xl border border-edge bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-subtle transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tracking-widest uppercase text-muted">
            SEO
          </span>
          <span className={`text-xs font-medium ${scoreColor}`}>
            {score}/{checks.length}
          </span>
        </div>
        <span className="text-muted text-xs font-mono">{open ? "[-]" : "[+]"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-edge pt-4">
          {/* Meta title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted">
                Meta Title
              </label>
              <CharCount value={metaTitle} warn={50} max={60} />
            </div>
            <input
              type="text"
              placeholder={postTitle || "Leave blank to use post title"}
              className="w-full rounded-lg border border-edge bg-subtle text-ink text-sm px-3 py-2
                focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
              {...register("metaTitle" as Path<T>)}
            />
            <p className="text-[10px] text-muted">
              Shown as the clickable headline in Google. 30-60 chars ideal.
            </p>
          </div>

          {/* Meta description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted">
                Meta Description
              </label>
              <CharCount value={metaDescription} warn={140} max={160} />
            </div>
            <textarea
              rows={3}
              placeholder="A concise summary shown under the title in search results..."
              className="w-full rounded-lg border border-edge bg-subtle text-ink text-sm px-3 py-2
                resize-none focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
              {...register("metaDescription" as Path<T>)}
            />
            <p className="text-[10px] text-muted">
              120-160 chars. Appears under the title in Google results.
            </p>
          </div>

          {/* Focus keyword */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">
              Focus Keyword
            </label>
            <input
              type="text"
              placeholder="e.g. next.js tutorial"
              className="w-full rounded-lg border border-edge bg-subtle text-ink text-sm px-3 py-2
                focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
              {...register("focusKeyword" as Path<T>)}
            />
            <p className="text-[10px] text-muted">
              The main keyword you want this post to rank for.
            </p>
          </div>

          {/* Canonical URL */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted">
              Canonical URL
            </label>
            <input
              type="url"
              placeholder="https://yourdomain.com/post/...  (leave blank for default)"
              className="w-full rounded-lg border border-edge bg-subtle text-ink text-sm px-3 py-2
                focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
              {...register("canonicalUrl" as Path<T>)}
            />
            <p className="text-[10px] text-muted">
              Only set if this post is a copy of content elsewhere. Prevents
              duplicate content penalties.
            </p>
          </div>

          {/* noIndex toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register("noIndex" as Path<T>)}
              />
              <div className="w-9 h-5 rounded-full bg-subtle border border-edge peer-checked:bg-accent transition-colors" />
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-card border border-edge
                peer-checked:translate-x-4 transition-transform"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-ink">
                Hide from search engines (noindex)
              </p>
              <p className="text-[10px] text-muted">
                Prevents Google from indexing this post. Use for drafts or
                private content.
              </p>
            </div>
          </label>

          {/* Score checklist */}
          <div className="rounded-lg bg-subtle border border-edge p-4 space-y-2.5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted mb-3">
              SEO Score - {score}/{checks.length}
            </p>
            {checks.map((c, i) => (
              <ScoreRow key={i} label={c.label} pass={c.pass} tip={c.tip} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
