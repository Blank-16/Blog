'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import { formatDate } from '@/lib/utils';

function ResultSkeleton() {
  return (
    <div className="flex gap-4 py-5 border-b border-edge animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-subtle rounded w-3/4" />
        <div className="h-3 bg-subtle rounded w-full" />
        <div className="h-3 bg-subtle rounded w-1/2" />
      </div>
      <div className="w-20 h-16 bg-subtle rounded-lg flex-shrink-0" />
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cancellation flag so async results that arrive after a query change
  // or component unmount do not update stale state.
  const cancelledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { cancelledRef.current = true; };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const posts = await appwriteService.searchPosts(query);
        if (cancelledRef.current) return;
        setResults(posts);
        setSearched(true);
      } catch {
        if (cancelledRef.current) return;
        setResults([]);
        setSearched(true);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-2">Search</p>
        <h1 className="font-display text-4xl mb-8">Find a story</h1>

        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title..."
            className="w-full rounded-xl border border-edge bg-card text-ink text-base
              pl-11 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent
              placeholder:text-muted transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div>
          {[1, 2, 3].map((i) => <ResultSkeleton key={i} />)}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <p className="font-display text-2xl text-ink mb-2">No results found</p>
          <p className="text-sm text-muted">Try a different keyword or check your spelling.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p className="text-xs text-muted mb-4">
            {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          </p>
          <div className="divide-y divide-edge">
            {results.map((post) => {
              const imageUrl = post.featuredImage
                ? appwriteService.getFilePreview(post.featuredImage)
                : null;
              return (
                <Link
                  key={post.$id}
                  href={`/post/${post.urlSlug ?? post.$id}`}
                  className="flex gap-4 py-5 group hover:opacity-70 transition-opacity"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <h2 className="font-display text-lg leading-snug text-ink line-clamp-2">
                      {post.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      {post.authorName && <span>{post.authorName}</span>}
                      {post.authorName && post.$createdAt && <span className="opacity-40">&middot;</span>}
                      {post.$createdAt && <span>{formatDate(post.$createdAt)}</span>}
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-edge text-muted uppercase tracking-wide">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {imageUrl && (
                    <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={post.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {!query && !searched && (
        <p className="text-sm text-muted text-center py-16">
          Start typing to search published stories.
        </p>
      )}
    </div>
  );
}
