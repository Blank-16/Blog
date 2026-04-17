"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import appwriteService, { Post } from "@/lib/appwrite/appwriteService";

interface RatingsSectionProps {
  post: Post;
}

/** Splits a stored review string "AuthorName|||Body" into its parts. */
function parseReview(raw: string): { author: string; body: string } {
  const sep = raw.indexOf("|||");
  if (sep === -1) return { author: "Anonymous", body: raw };
  return { author: raw.slice(0, sep) || "Anonymous", body: raw.slice(sep + 3) };
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="w-4 h-4"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32L2.27 7.12l5.34-.78L10 1.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const display = readonly ? value : hovered || value;

  return (
    <div
      className={`flex items-center gap-0.5 ${readonly ? "" : "cursor-pointer"}`}
      onMouseLeave={() => !readonly && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`text-amber-400 transition-transform duration-100 ${!readonly ? "hover:scale-110 focus:outline-none" : ""}`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onClick={() => !readonly && onChange?.(star)}
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <StarIcon filled={display >= star} />
        </button>
      ))}
    </div>
  );
}

function AverageStars({ ratings }: { ratings: number[] }) {
  if (!ratings.length) return null;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const rounded = Math.round(avg * 2) / 2;

  return (
    <div className="flex items-center gap-2">
      <StarRating value={rounded} readonly />
      <span className="text-sm font-medium text-ink">{avg.toFixed(1)}</span>
      <span className="text-xs text-muted">
        ({ratings.length} {ratings.length === 1 ? "rating" : "ratings"})
      </span>
    </div>
  );
}

export default function RatingsSection({ post }: RatingsSectionProps) {
  const userData = useAppSelector((s) => s.auth.userData);
  const isLoggedIn = !!userData;
  const isAuthor = userData?.$id === post.userId;

  const [ratings, setRatings] = useState<number[]>(post.ratings ?? []);
  const [reviews, setReviews] = useState<string[]>(post.reviews ?? []);

  const [starValue, setStarValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userData) return;
    if (starValue === 0) {
      setError("Please select a star rating.");
      return;
    }
    if (reviewText.trim().length < 3) {
      setError("Review must be at least 3 characters.");
      return;
    }

    setError(null);
    setSubmitting(true);

    // Optimistic update: append locally before the network calls complete.
    // The user sees their review appear instantly.
    const encoded = `${userData.name}|||${reviewText.trim()}`;
    const optimisticRatings = [...ratings, starValue];
    const optimisticReviews = [...reviews, encoded];
    setRatings(optimisticRatings);
    setReviews(optimisticReviews);
    setStarValue(0);
    setReviewText("");

    try {
      const updatedWithRating = await appwriteService.addRating(
        post.$id,
        ratings,
        starValue,
      );
      if (!updatedWithRating) {
        // Roll back the optimistic update on failure
        setRatings(ratings);
        setReviews(reviews);
        setError("Failed to save rating. Please try again.");
        return;
      }

      const updatedWithReview = await appwriteService.addReview(
        post.$id,
        updatedWithRating.reviews ?? reviews,
        encoded,
      );
      if (!updatedWithReview) {
        // Roll back the optimistic update on failure
        setRatings(ratings);
        setReviews(reviews);
        setError("Failed to save review. Please try again.");
        return;
      }

      // Reconcile with the server's authoritative state
      setRatings(updatedWithRating.ratings ?? optimisticRatings);
      setReviews(updatedWithReview.reviews ?? optimisticReviews);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-edge space-y-10">
      {/* Header + average */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink mb-1">
            Ratings &amp; Reviews
          </h2>
          {ratings.length > 0 ? (
            <AverageStars ratings={ratings} />
          ) : (
            <p className="text-sm text-muted">No ratings yet - be the first!</p>
          )}
        </div>
      </div>

      {/* Submit form */}
      {isLoggedIn && !isAuthor && (
        <div className="rounded-xl border border-edge p-6 space-y-4 bg-card">
          <p className="text-xs font-medium tracking-widest uppercase text-muted">
            Leave a review
          </p>

          <div className="space-y-1">
            <p className="text-sm text-ink">Your rating</p>
            <StarRating value={starValue} onChange={setStarValue} />
          </div>

          <div className="space-y-1">
            <label htmlFor="review-input" className="text-sm text-ink">
              Your review
            </label>
            <textarea
              id="review-input"
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="What did you think of this post?"
              className="w-full rounded-lg border border-edge bg-subtle text-ink text-sm px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Submit Review"}
          </button>
        </div>
      )}

      {!isLoggedIn && (
        <p className="text-sm text-muted border border-edge rounded-xl px-5 py-4">
          <a
            href="/login"
            className="underline underline-offset-2 text-ink hover:opacity-60 transition"
          >
            Sign in
          </a>{" "}
          to leave a rating and review.
        </p>
      )}

      {isAuthor && (
        <p className="text-sm text-muted border border-edge rounded-xl px-5 py-4">
          You can't review your own post.
        </p>
      )}

      {/* Review list */}
      {reviews.length > 0 && (
        <div className="space-y-5">
          <p className="text-xs font-medium tracking-widest uppercase text-muted">
            {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
          </p>
          {[...reviews].reverse().map((raw, i) => {
            const { author, body } = parseReview(raw);
            const reviewIndex = reviews.length - 1 - i;
            const reviewRating = ratings[reviewIndex] ?? null;
            return (
              <div
                key={i}
                className="flex gap-4 pb-5 border-b border-edge last:border-0"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-subtle border border-edge flex items-center justify-center text-xs font-medium text-muted uppercase">
                  {author.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-ink">
                      {author}
                    </span>
                    {reviewRating !== null && (
                      <StarRating value={reviewRating} readonly />
                    )}
                  </div>
                  <p className="text-sm text-muted leading-relaxed">{body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviews.length === 0 && ratings.length === 0 && (
        <p className="text-sm text-muted text-center py-6 border border-dashed border-edge rounded-xl">
          No reviews yet.
        </p>
      )}
    </section>
  );
}
