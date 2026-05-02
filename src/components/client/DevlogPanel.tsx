'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import { formatDate } from '@/lib/utils';

type LoadState = 'idle' | 'loading' | 'done' | 'error';

export default function DevlogPanel() {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Prevent duplicate fetches
  const fetchedRef = useRef(false);

  const fetchDevlogs = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoadState('loading');
    try {
      const result = await appwriteService.searchPostsByTag('devlog');
      setPosts(result.slice(0, 12));
      setLoadState('done');
    } catch {
      setLoadState('error');
      // Allow retry on next hover/click
      fetchedRef.current = false;
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleInteract = () => {
    fetchDevlogs();
    setOpen((v) => !v);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Devlog entries"
        className={`w-72 sm:w-80 rounded-2xl border border-edge bg-card shadow-2xl shadow-black/20
          transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right
          ${open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium tracking-widest uppercase text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Devlog
            </span>
          </div>
          <Link
            href="/search?tag=devlog"
            onClick={() => setOpen(false)}
            className="text-[10px] text-muted underline underline-offset-2 hover:text-ink transition-colors"
          >
            View all &rarr;
          </Link>
        </div>

        {/* Body */}
        <div className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain">
          {loadState === 'loading' && (
            <div className="divide-y divide-edge">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 animate-pulse space-y-1.5">
                  <div className="h-3.5 bg-subtle rounded w-4/5" />
                  <div className="h-2.5 bg-subtle rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {loadState === 'error' && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted mb-3">Failed to load devlogs.</p>
              <button
                onClick={() => { fetchedRef.current = false; fetchDevlogs(); }}
                className="text-xs underline underline-offset-2 text-muted hover:text-ink transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {loadState === 'done' && posts.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted">No devlog posts yet.</p>
            </div>
          )}

          {loadState === 'done' && posts.length > 0 && (
            <div className="divide-y divide-edge">
              {posts.map((post) => (
                <Link
                  key={post.$id}
                  href={`/post/${post.urlSlug ?? post.$id}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 hover:bg-subtle transition-colors duration-150 group"
                >
                  <p className="text-sm font-medium text-ink line-clamp-2 group-hover:opacity-70 transition-opacity leading-snug">
                    {post.title}
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    {post.$createdAt ? formatDate(post.$createdAt) : ''}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={handleInteract}
        onMouseEnter={fetchDevlogs}
        aria-label="Toggle devlog panel"
        aria-expanded={open}
        className={`group flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg
          shadow-black/10 transition-all duration-200 active:scale-95
          ${open
            ? 'bg-ink text-base border-ink'
            : 'bg-card text-ink border-edge hover:border-ink hover:shadow-xl hover:shadow-black/15'
          }`}
      >
        {/* Terminal icon */}
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3" />
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
        <span className="text-xs font-medium tracking-wide">Devlog</span>
        {loadState === 'done' && posts.length > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
            ${open ? 'bg-base/20 text-base' : 'bg-subtle text-muted'}`}>
            {posts.length}
          </span>
        )}
      </button>
    </div>
  );
}
