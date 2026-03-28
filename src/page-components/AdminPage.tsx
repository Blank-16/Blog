"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/client/AuthGuard";
import Container from "@/components/ui/Container";
import { useAppSelector } from "@/store/hooks";
import appwriteService, { Admin, Post } from "@/lib/appwrite/appwriteService";
import { DAILY_LIMIT, WEEKLY_LIMIT } from "@/lib/usePostLimits";

// Types
type Tab = "overview" | "posts" | "admins";

interface Stats {
  totalPosts: number;
  activePosts: number;
  inactivePosts: number;
  recentPosts: number; // last 7 days
  totalRatings: number;
  totalReviews: number;
  totalAdmins: number;
  topAuthor: { name: string; count: number } | null;
}

// Helpers
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function avgRating(ratings?: number[]): string {
  if (!ratings?.length) return "—";
  return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
}

// Stat card
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-edge bg-card p-5 space-y-1">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      <p className="text-3xl font-display text-ink">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

// Tab button
function TabBtn({
  id,
  active,
  onClick,
  children,
}: {
  id: Tab;
  active: boolean;
  onClick: (t: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-sm rounded-full transition-colors duration-150
        ${
          active
            ? "bg-accent text-accent-fg font-medium"
            : "text-muted hover:text-ink hover:bg-subtle"
        }`}
    >
      {children}
    </button>
  );
}

// Overview tab
function OverviewTab({ stats, posts }: { stats: Stats; posts: Post[] }) {
  const recentPosts = [...posts]
    .sort(
      (a, b) =>
        new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Posts"
          value={stats.totalPosts}
          sub={`${stats.recentPosts} this week`}
        />
        <StatCard
          label="Active"
          value={stats.activePosts}
          sub={`${stats.inactivePosts} inactive`}
        />
        <StatCard
          label="Total Ratings"
          value={stats.totalRatings}
          sub="across all posts"
        />
        <StatCard
          label="Total Reviews"
          value={stats.totalReviews}
          sub="across all posts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          label="Admins"
          value={stats.totalAdmins}
          sub="with full access"
        />
        <StatCard
          label="Daily Limit"
          value={`${DAILY_LIMIT} post`}
          sub="per user per day"
        />
        <StatCard
          label="Weekly Limit"
          value={`${WEEKLY_LIMIT} posts`}
          sub="per user per week"
        />
      </div>

      {/* Top author */}
      {stats.topAuthor && (
        <div className="rounded-xl border border-edge bg-card p-5 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full bg-subtle border border-edge flex items-center
            justify-center text-sm font-medium text-muted uppercase flex-shrink-0"
          >
            {stats.topAuthor.name.charAt(0)}
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-0.5">
              Most Active Author
            </p>
            <p className="font-medium text-ink">{stats.topAuthor.name}</p>
            <p className="text-xs text-muted">
              {stats.topAuthor.count} posts total
            </p>
          </div>
        </div>
      )}

      {/* Recent posts */}
      <section>
        <h2 className="font-display text-xl mb-4">Recent Posts</h2>
        <div className="divide-y divide-edge border border-edge rounded-xl overflow-hidden">
          {recentPosts.map((post) => (
            <div
              key={post.$id}
              className="flex items-center gap-4 px-5 py-4 bg-card hover:bg-subtle transition-colors"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/post/${post.$id}`}
                  className="text-sm font-medium text-ink hover:opacity-60 transition-opacity truncate block"
                >
                  {post.title}
                </Link>
                <p className="text-[11px] text-muted mt-0.5">
                  {post.authorName ?? "Unknown"} · {formatDate(post.$createdAt)}
                </p>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium
                ${
                  post.status === "active"
                    ? "border-green-200 text-green-600 dark:border-green-900 dark:text-green-400"
                    : "border-edge text-muted"
                }`}
              >
                {post.status}
              </span>
              <span className="text-xs text-muted">
                ★ {avgRating(post.ratings)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Posts tab
function PostsTab({
  posts,
  onDelete,
}: {
  posts: Post[];
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [isPending, startTrans] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = posts.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.authorName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const handleDelete = (post: Post) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeletingId(post.$id);
    startTrans(async () => {
      const ok = await appwriteService.adminDeletePost(post.$id);
      if (ok) {
        onDelete(post.$id);
        toast.success("Post deleted.");
      } else {
        toast.error("Failed to delete post.");
      }
      setDeletingId(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or author…"
          className="flex-1 min-w-48 rounded-lg border border-edge bg-subtle text-ink text-sm
            px-4 py-2 focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
        />
        <div className="flex gap-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors capitalize
                ${filter === f ? "bg-accent text-accent-fg font-medium" : "text-muted hover:text-ink hover:bg-subtle"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted ml-auto">{filtered.length} posts</p>
      </div>

      {/* Table */}
      <div className="divide-y divide-edge border border-edge rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">
            No posts match your filters.
          </p>
        ) : (
          filtered.map((post) => (
            <div
              key={post.$id}
              className="flex items-center gap-3 px-5 py-4 bg-card hover:bg-subtle transition-colors"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <Link
                  href={`/post/${post.$id}`}
                  className="text-sm font-medium text-ink hover:opacity-60 transition-opacity truncate block"
                >
                  {post.title}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span>{post.authorName ?? "Unknown"}</span>
                  <span className="opacity-40">·</span>
                  <span>{formatDate(post.$createdAt)}</span>
                  <span className="opacity-40">·</span>
                  <span>
                    ★ {avgRating(post.ratings)} ({post.ratings?.length ?? 0})
                  </span>
                  <span className="opacity-40">·</span>
                  <span>{post.reviews?.length ?? 0} reviews</span>
                </div>
              </div>

              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0
              ${
                post.status === "active"
                  ? "border-green-200 text-green-600 dark:border-green-900 dark:text-green-400"
                  : "border-edge text-muted"
              }`}
              >
                {post.status}
              </span>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  href={`/edit-post/${post.$id}`}
                  className="text-xs px-3 py-1 rounded-lg text-muted hover:text-ink hover:bg-subtle transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(post)}
                  disabled={isPending && deletingId === post.$id}
                  className="text-xs px-3 py-1 rounded-lg text-red-500 hover:bg-red-50
                  dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
                >
                  {isPending && deletingId === post.$id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Admins tab
function AdminsTab({
  admins,
  currentUserId,
  onAdd,
  onRemove,
  isPending,
}: {
  admins: Admin[];
  currentUserId: string;
  onAdd: (id: string) => void;
  onRemove: (admin: Admin) => void;
  isPending: boolean;
}) {
  const [newUserId, setNewUserId] = useState("");

  const handleAdd = () => {
    const trimmed = newUserId.trim();
    if (!trimmed) {
      toast.error("Please enter a user ID.");
      return;
    }
    onAdd(trimmed);
    setNewUserId("");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Add form */}
      <section className="rounded-xl border border-edge p-6 space-y-4 bg-card">
        <div>
          <h2 className="font-display text-xl mb-1">Add Admin</h2>
          <p className="text-xs text-muted leading-relaxed">
            Paste the Appwrite user ID of the person you want to promote. You
            can find user IDs in the Appwrite console under Auth → Users.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="e.g. 6643f3a1b2c9d…"
            className="flex-1 rounded-lg border border-edge bg-subtle text-ink text-sm px-4 py-2.5
              focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted transition"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium
              transition hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? "Adding…" : "Add Admin"}
          </button>
        </div>
      </section>

      {/* Admin list */}
      <section className="space-y-3">
        <h2 className="font-display text-xl">
          Admins{" "}
          <span className="text-sm font-sans font-normal text-muted">
            ({admins.length})
          </span>
        </h2>
        {admins.length === 0 ? (
          <p className="text-sm text-muted py-8 text-center border border-dashed border-edge rounded-xl">
            No admins yet.
          </p>
        ) : (
          <div className="divide-y divide-edge border border-edge rounded-xl overflow-hidden">
            {admins.map((admin) => (
              <div
                key={admin.$id}
                className="flex items-center gap-4 px-5 py-4 bg-card hover:bg-subtle transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-full bg-subtle border border-edge flex-shrink-0
                  flex items-center justify-center text-xs font-medium text-muted uppercase"
                >
                  {admin.userId.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-ink truncate">
                    {admin.userId}
                  </p>
                  <p className="text-[11px] text-muted">
                    Added {formatDate(admin.addedAt)}
                    {admin.userId === currentUserId && (
                      <span className="ml-2 text-accent font-medium">
                        (you)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(admin)}
                  disabled={isPending || admin.userId === currentUserId}
                  className="text-xs text-red-500 hover:text-red-600 px-3 py-1 rounded-lg
                    hover:bg-red-50 dark:hover:bg-red-950/30 transition
                    disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Limits card */}
      <section className="rounded-xl border border-edge p-6 bg-card space-y-4">
        <h2 className="font-display text-xl">Post Limits for Regular Users</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-subtle border border-edge px-4 py-3">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">
              Daily
            </p>
            <p className="text-2xl font-display">
              {DAILY_LIMIT}{" "}
              <span className="text-sm font-sans text-muted">post</span>
            </p>
          </div>
          <div className="rounded-lg bg-subtle border border-edge px-4 py-3">
            <p className="text-xs text-muted uppercase tracking-widest mb-1">
              Weekly
            </p>
            <p className="text-2xl font-display">
              {WEEKLY_LIMIT}{" "}
              <span className="text-sm font-sans text-muted">posts</span>
            </p>
          </div>
        </div>
        <p className="text-xs text-muted">
          Resets midnight UTC. Admins are exempt.
        </p>
      </section>
    </div>
  );
}

// Main dashboard
function AdminDashboard() {
  const userData = useAppSelector((s) => s.auth.userData);
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isPending, startTrans] = useTransition();

  // Access check
  useEffect(() => {
    if (!userData) return;
    appwriteService.isAdmin(userData.$id).then((ok) => {
      setChecking(false);
      setHasAccess(ok);
      if (!ok) {
        toast.error("Admins only.");
        router.replace("/");
      }
    });
  }, [userData, router]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    const [allPosts, allAdmins, totalCount, recentCount] = await Promise.all([
      appwriteService.getAllPosts(200),
      appwriteService.getAdmins(),
      appwriteService.getTotalPostCount(),
      appwriteService.getRecentPostCount(7),
    ]);

    setPosts(allPosts);
    setAdmins(allAdmins);

    // Compute stats from loaded posts
    const active = allPosts.filter((p) => p.status === "active").length;
    const inactive = allPosts.filter((p) => p.status === "inactive").length;
    const ratings = allPosts.reduce((s, p) => s + (p.ratings?.length ?? 0), 0);
    const reviews = allPosts.reduce((s, p) => s + (p.reviews?.length ?? 0), 0);

    // Top author by post count
    const authorMap: Record<string, number> = {};
    allPosts.forEach((p) => {
      if (p.authorName)
        authorMap[p.authorName] = (authorMap[p.authorName] ?? 0) + 1;
    });
    const topEntry = Object.entries(authorMap).sort((a, b) => b[1] - a[1])[0];

    setStats({
      totalPosts: totalCount,
      activePosts: active,
      inactivePosts: inactive,
      recentPosts: recentCount,
      totalRatings: ratings,
      totalReviews: reviews,
      totalAdmins: allAdmins.length,
      topAuthor: topEntry ? { name: topEntry[0], count: topEntry[1] } : null,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess, loadData]);

  // Admin actions
  const handleAddAdmin = (userId: string) => {
    if (!userData) return;
    startTrans(async () => {
      const result = await appwriteService.addAdmin(userId, userData.$id);
      if (!result) {
        toast.error("Could not add admin. Already one, or invalid ID.");
        return;
      }
      setAdmins((prev) => [...prev, result]);
      setStats((s) => (s ? { ...s, totalAdmins: s.totalAdmins + 1 } : s));
      toast.success("Admin added.");
    });
  };

  const handleRemoveAdmin = (admin: Admin) => {
    if (admin.userId === userData?.$id) {
      toast.error("Can't remove yourself.");
      return;
    }
    startTrans(async () => {
      const ok = await appwriteService.removeAdmin(admin.$id);
      if (!ok) {
        toast.error("Failed to remove admin.");
        return;
      }
      setAdmins((prev) => prev.filter((a) => a.$id !== admin.$id));
      setStats((s) => (s ? { ...s, totalAdmins: s.totalAdmins - 1 } : s));
      toast.success("Admin removed.");
    });
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.$id !== postId));
    setStats((s) => (s ? { ...s, totalPosts: s.totalPosts - 1 } : s));
  };

  // Render
  if (checking)
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted text-sm">Verifying access…</p>
      </div>
    );
  if (!hasAccess) return null;

  return (
    <div className="py-10">
      <Container>
        {/* Page header */}
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.2em] uppercase mb-1 text-muted">
              Admin
            </p>
            <h1 className="text-4xl font-display">Dashboard</h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs px-4 py-2 rounded-full border border-edge text-muted
              hover:text-ink hover:bg-subtle transition disabled:opacity-40"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-edge pb-3">
          <TabBtn
            id="overview"
            active={activeTab === "overview"}
            onClick={setActiveTab}
          >
            Overview
          </TabBtn>
          <TabBtn
            id="posts"
            active={activeTab === "posts"}
            onClick={setActiveTab}
          >
            Posts{" "}
            {!loading && (
              <span className="ml-1 opacity-60">({posts.length})</span>
            )}
          </TabBtn>
          <TabBtn
            id="admins"
            active={activeTab === "admins"}
            onClick={setActiveTab}
          >
            Admins{" "}
            {!loading && (
              <span className="ml-1 opacity-60">({admins.length})</span>
            )}
          </TabBtn>
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-edge bg-card h-24"
              />
            ))}
          </div>
        ) : (
          <>
            {activeTab === "overview" && stats && (
              <OverviewTab stats={stats} posts={posts} />
            )}
            {activeTab === "posts" && (
              <PostsTab posts={posts} onDelete={handleDeletePost} />
            )}
            {activeTab === "admins" && userData && (
              <AdminsTab
                admins={admins}
                currentUserId={userData.$id}
                onAdd={handleAddAdmin}
                onRemove={handleRemoveAdmin}
                isPending={isPending}
              />
            )}
          </>
        )}
      </Container>
    </div>
  );
}

// Export
export default function AdminPage() {
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
      <AdminDashboard />
    </AuthGuard>
  );
}
