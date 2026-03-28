"use client";

import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import AuthGuard from "@/components/client/AuthGuard";
import Container from "@/components/ui/Container";
import PostForm from "@/components/client/PostForm";
import { usePostLimits, DAILY_LIMIT, WEEKLY_LIMIT } from "@/lib/usePostLimits";

function AddPostContent() {
  const { loading, isAdmin, canPost, limitReason, todayCount, weekCount } =
    usePostLimits();

  // Show toast the moment the limit is detected
  useEffect(() => {
    if (!loading && !canPost && limitReason) {
      toast.error(limitReason, { duration: 6000, id: "post-limit" });
    }
  }, [loading, canPost, limitReason]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-muted text-sm">Checking permissions…</p>
      </div>
    );
  }

  return (
    <div className="py-12">
      <Container>
        <div className="mb-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] uppercase mb-2 text-muted">
              {isAdmin ? "Admin · New Story" : "New Story"}
            </p>
            <h1 className="text-4xl font-display">
              {canPost ? "Write something great." : "Limit reached."}
            </h1>
          </div>

          {/* Post usage badge — hidden for admins */}
          {!isAdmin && (
            <div className="flex flex-col items-end gap-1 text-xs text-muted">
              <span>
                Today:{" "}
                <span
                  className={
                    todayCount >= DAILY_LIMIT
                      ? "text-red-500 font-medium"
                      : "text-ink font-medium"
                  }
                >
                  {todayCount} / {DAILY_LIMIT}
                </span>
              </span>
              <span>
                This week:{" "}
                <span
                  className={
                    weekCount >= WEEKLY_LIMIT
                      ? "text-red-500 font-medium"
                      : "text-ink font-medium"
                  }
                >
                  {weekCount} / {WEEKLY_LIMIT}
                </span>
              </span>
            </div>
          )}
        </div>

        {canPost ? (
          <PostForm />
        ) : (
          /* Blocked state */
          <div className="max-w-md mx-auto text-center py-20 space-y-4">
            <div className="text-5xl">✋</div>
            <h2 className="font-display text-2xl">You&apos;re all caught up</h2>
            <p className="text-muted text-sm leading-relaxed">{limitReason}</p>
            <div className="pt-2 text-xs text-muted border border-edge rounded-xl px-5 py-4 text-left space-y-1">
              <p>
                📅 Daily limit:{" "}
                <span className="text-ink font-medium">
                  {DAILY_LIMIT} post / day
                </span>
              </p>
              <p>
                📆 Weekly limit:{" "}
                <span className="text-ink font-medium">
                  {WEEKLY_LIMIT} posts / week
                </span>
              </p>
              <p className="pt-1 text-muted">Resets at midnight UTC.</p>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default function AddPostPage() {
  return (
    <AuthGuard authentication={true}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--bg-card)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            fontSize: "14px",
          },
        }}
      />
      <AddPostContent />
    </AuthGuard>
  );
}
