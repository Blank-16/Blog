"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import { Post } from "@/lib/appwrite/appwriteService";

interface Stats {
  totalPosts: number;
  activePosts: number;
  inactivePosts: number;
  totalRatings: number;
  totalReviews: number;
}

interface DashboardChartsProps {
  posts: Post[];
  stats: Stats;
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-edge bg-card p-5">
      <p className="text-xs font-medium tracking-widest uppercase text-muted mb-4">
        {title}
      </p>
      {children}
    </div>
  );
}

// Custom tooltip shared across charts
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-edge bg-card px-3 py-2 text-xs shadow-md">
      {label && <p className="text-muted mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-ink font-medium">
          {p.name ? `${p.name}: ` : ""}
          {p.value}
        </p>
      ))}
    </div>
  );
}

// Posts per week - last 8 weeks
function PostsPerWeekChart({ posts }: { posts: Post[] }) {
  // Week boundaries only change weekly, not with the posts array.
  // Compute them separately so they are not recalculated on every post update.
  const weekBoundaries = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const end = new Date(now);
      end.setUTCDate(now.getUTCDate() - i * 7);
      end.setUTCHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setUTCDate(end.getUTCDate() - 6);
      start.setUTCHours(0, 0, 0, 0);
      return {
        start,
        end,
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    }).reverse();
  // Empty dependency array - boundaries are computed once per mount.
  // They are stable for the lifetime of the dashboard session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const data = useMemo(() => {
    return weekBoundaries.map(({ start, end, label }) => {
      const count = posts.filter((p) => {
        const d = new Date(p.$createdAt);
        return d >= start && d <= end;
      }).length;
      return { week: label, posts: count };
    });
  }, [posts, weekBoundaries]);

  return (
    <ChartCard title="Posts per week (last 8 weeks)">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={24}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={20}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--bg-subtle)" }}
          />
          <Bar dataKey="posts" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Active vs Inactive donut
function ActiveRatioChart({ stats }: { stats: Stats }) {
  const data = [
    { name: "Active", value: stats.activePosts },
    { name: "Inactive", value: stats.inactivePosts },
  ];
  const COLORS = ["var(--accent)", "var(--bg-subtle)"];

  return (
    <ChartCard title="Active vs Inactive">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {v}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Top 5 tags horizontal bar
function TopTagsChart({ posts }: { posts: Post[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p) =>
      p.tags?.forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      }),
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts]);

  if (!data.length)
    return (
      <ChartCard title="Top tags">
        <p className="text-sm text-muted text-center py-8">No tags yet.</p>
      </ChartCard>
    );

  return (
    <ChartCard title="Top tags">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" barSize={16}>
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="tag"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--bg-subtle)" }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent)"
            radius={[0, 4, 4, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Ratings distribution 1-5
function RatingsDistributionChart({ posts }: { posts: Post[] }) {
  const data = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    posts.forEach((p) =>
      p.ratings?.forEach((r) => {
        if (r >= 1 && r <= 5) counts[r - 1]++;
      }),
    );
    return counts.map((count, i) => ({ star: `${i + 1}*`, count }));
  }, [posts]);

  const hasRatings = data.some((d) => d.count > 0);

  if (!hasRatings)
    return (
      <ChartCard title="Ratings distribution">
        <p className="text-sm text-muted text-center py-8">No ratings yet.</p>
      </ChartCard>
    );

  return (
    <ChartCard title="Ratings distribution">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} barSize={32}>
          <XAxis
            dataKey="star"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={20}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--bg-subtle)" }}
          />
          <Bar
            dataKey="count"
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Top 5 posts by avg rating
function TopPostsChart({ posts }: { posts: Post[] }) {
  const data = useMemo(() => {
    return posts
      .filter((p) => p.ratings && p.ratings.length > 0)
      .map((p) => ({
        title: p.title.length > 28 ? p.title.slice(0, 28) + "..." : p.title,
        avg: parseFloat(
          (p.ratings!.reduce((a, b) => a + b, 0) / p.ratings!.length).toFixed(
            1,
          ),
        ),
        count: p.ratings!.length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [posts]);

  if (!data.length)
    return (
      <ChartCard title="Top posts by avg rating">
        <p className="text-sm text-muted text-center py-8">
          No rated posts yet.
        </p>
      </ChartCard>
    );

  return (
    <ChartCard title="Top posts by avg rating">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" barSize={16}>
          <XAxis
            type="number"
            domain={[0, 5]}
            allowDecimals
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="title"
            tick={{ fontSize: 9, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--bg-subtle)" }}
          />
          <Bar
            dataKey="avg"
            fill="var(--accent)"
            radius={[0, 4, 4, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// Authors leaderboard radar
function AuthorsRadarChart({ posts }: { posts: Post[] }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p) => {
      const name = p.authorName ?? "Unknown";
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([author, posts]) => ({ author, posts }));
  }, [posts]);

  if (data.length < 2)
    return (
      <ChartCard title="Authors leaderboard">
        <p className="text-sm text-muted text-center py-8">
          Need at least 2 authors.
        </p>
      </ChartCard>
    );

  return (
    <ChartCard title="Authors leaderboard">
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius={65}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="author"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          />
          <Radar
            dataKey="posts"
            fill="var(--accent)"
            fillOpacity={0.25}
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function DashboardCharts({
  posts,
  stats,
}: DashboardChartsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PostsPerWeekChart posts={posts} />
        <ActiveRatioChart stats={stats} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopTagsChart posts={posts} />
        <RatingsDistributionChart posts={posts} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopPostsChart posts={posts} />
        <AuthorsRadarChart posts={posts} />
      </div>
    </div>
  );
}
