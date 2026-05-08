# Blog Platform

A production-grade full-stack blogging platform and developer portfolio built with **Next.js 15 App Router** and **Appwrite**.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Appwrite](https://img.shields.io/badge/Appwrite-18-pink?logo=appwrite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764abc?logo=redux)

**Live:** [your-domain.vercel.app](https://your-domain.vercel.app) &nbsp;|&nbsp; **Portfolio:** [your-domain.vercel.app/portfolio](https://your-domain.vercel.app/portfolio)

---

## Overview

A full-stack blogging platform where the writer is also the product. Posts are written in a rich text editor, published with full SEO metadata, and served via Hybrid ISR for sub-100ms page loads. A public reading experience sits alongside a private authoring dashboard, analytics panel, and a developer portfolio at `/portfolio` — isolated from the blog shell with its own font and layout.

---

## Features

### Reading experience
- Public post feed at `/public-posts` with cursor-based infinite scroll
- Reading time estimate on every post card and post page
- Reading progress bar on post pages (2px fixed bar, fills as you scroll)
- Related posts at the end of every post — fetched server-side by matching tag
- Tag-based navigation — clicking any tag goes to `/search?tag=<tag>` for live results or `/tag/<tag>` for the SEO-indexed page
- Full-text search with 300ms debounce, title and tag modes, `?tag=` URL param sync
- Star ratings and text reviews with optimistic UI
- Copy link button on every post
- Dark / light theme toggle synced with OS preference
- Devlog panel — floating button on all pages, lazy-fetched only on first hover, shows posts tagged `devlog`

### Writing
- Tiptap rich text editor: headings, lists, blockquotes, code blocks, inline images
- Markdown import — upload a `.md` file and it converts into the editor
- Client-side image compression via Canvas API — reduces payloads by ~85%
- Drag-and-drop featured image upload
- Word count and reading time in editor footer, updated on every keystroke
- Draft auto-save to `localStorage` with live save indicator ("Draft saved · 12:04")
- URL-slug routing: `/post/author-name-post-title--documentId`
- Per-user post rate limiting: 1/day, 5/week — bypassed for admins
- Full SEO panel: meta title, description, focus keyword, canonical URL, noIndex toggle

### SEO & performance
- Dynamic `generateMetadata` per post: title, description, Open Graph, Twitter cards
- JSON-LD `BlogPosting` structured data on every post page
- Paginated `sitemap.xml` — cursor-paginated loop, covers all active posts, never truncates at 25
- `robots.txt` — auth, admin, and private pages disallowed
- On-demand ISR revalidation after publish or edit using `revalidatePath` with `'layout'` type
- `serverExternalPackages` for Tiptap/ProseMirror to prevent Vercel SSR crashes
- View counter on every post — fire-and-forget, non-blocking

### Admin dashboard

> Add screenshots to `public/screenshots/` — see [Adding Screenshots](#adding-screenshots)

- Six Recharts panels: posts per week, active ratio donut, top tags, ratings distribution, top posts by rating, authors radar
- Post management: search, filter by status, delete with full storage cleanup
- Admin management: add by user ID, remove, self-protection
- Stat cards: total posts, active/inactive split, ratings count, reviews count

### My Posts (`/all-posts`)
- Auth-gated, cursor-paginated list of the user's own posts
- Edit and delete action bar attached to every card
- Status badge (published / draft) per card
- Two-tap delete confirm: first tap shows "Confirm?", auto-reverts after 3s if ignored

### Profile (`/profile`)
- Display name update
- Email update (requires current password — Appwrite requirement)
- Password update with confirmation
- Danger zone: delete all posts, delete account (typed confirmation)

### Portfolio (`/portfolio`)
- Completely isolated from the blog shell — no Header, Footer, DevlogPanel, or Redux Provider
- JetBrains Mono via `next/font/google`, scoped to the `/portfolio` subtree
- Live IST clock in the hero section
- Skills section: evidence-based entries (what you built with each skill) + primary / secondary / familiar pill groupings — no percentage bars
- `← back to blog` link in the nav bar
- All content in `src/app/portfolio/data.ts` — edit without touching UI code

---

## Architecture

### Rendering strategy

| Page | Strategy | Revalidation |
|---|---|---|
| `/` | ISR 60s | + on-demand after publish |
| `/post/[slug]` | Hybrid ISR 24h | Top 20 pre-built; new slugs SSR on first visit; on-demand after edit |
| `/tag/[tag]` | ISR 1h | Hourly rebuild |
| `/portfolio` | Static | No dynamic data |
| `/public-posts` | CSR | Cursor-paginated, client fetch on mount |
| `/all-posts` | CSR | Auth-gated, user-specific |
| `/search` | CSR | Live debounced queries, `?tag=` URL param |
| `/admin` | CSR | Auth-gated, admin-only |

### Server / client split

`page-components/HomePage.tsx` and `page-components/PostPage.tsx` are async server components — they fetch from Appwrite during SSR with no `useEffect`. `components/client/` carries `'use client'` throughout. `PostContent` is client-rendered but SSR-safe via `isomorphic-dompurify`.

### State management

Redux is used for exactly one thing: auth state (`status`, `loading`, `userData`). `StoreProvider` uses `useRef` to create one store per component tree mount, preventing cross-request state leaking in App Router's concurrent SSR.

### Error handling

All service functions throw `AppError` (defined in `src/lib/errors.ts`) on failure. `AppError` maps Appwrite HTTP codes and type strings to user-facing messages. `getErrorMessage(e)` is safe to call from any catch block. `logServiceError` centralizes logging — swap `console.error` for Sentry in one place.

### Image lifecycle

On post delete, `extractEmbeddedFileIds()` walks the Tiptap JSON tree and returns every Appwrite file ID found in image `src` attributes. The featured image and all embedded images are deleted via `Promise.allSettled`. On edit, old and new embedded ID sets are diffed and removed files are deleted.

### URL slug strategy

Posts live at `/post/author-name-post-title--documentId`. The `--` separator lets `getPostByUrlParam` extract the Appwrite document ID from the end of the slug for the database query, while the prefix improves SEO and readability.

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: Redux, Header, MainContent, BlogChrome
│   ├── page.tsx                      # Home (ISR 60s)
│   ├── post/[slug]/page.tsx          # Post page: metadata, JSON-LD, hybrid ISR
│   ├── public-posts/page.tsx         # Public infinite-scroll feed
│   ├── all-posts/page.tsx            # Auth-gated user posts with edit/delete
│   ├── search/page.tsx               # Search (Suspense boundary for useSearchParams)
│   ├── tag/[tag]/page.tsx            # ISR tag pages (revalidate: 3600)
│   ├── profile/page.tsx              # Auth-gated profile management
│   ├── portfolio/
│   │   ├── layout.tsx                # Isolated layout: JetBrains Mono, no blog shell
│   │   ├── page.tsx                  # Portfolio page
│   │   ├── LiveClock.tsx             # Client: live IST clock with setInterval
│   │   └── data.ts                   # All portfolio content — edit here
│   ├── sitemap.ts                    # Paginated, covers all active posts
│   ├── robots.ts                     # Disallows admin/auth routes
│   └── actions/revalidatePost.ts     # Server action: 'layout' type revalidation
│
├── page-components/                  # One file per route, co-located logic
│
├── components/
│   ├── client/
│   │   ├── Header.tsx                # Sidebar desktop / hamburger mobile
│   │   ├── MainContent.tsx           # lg:ml-56 offset, skipped on /portfolio
│   │   ├── BlogChrome.tsx            # Hides Footer + DevlogPanel on /portfolio
│   │   ├── FeaturedPost.tsx          # Client: tag links, no nested anchor
│   │   ├── MoreStories.tsx           # Infinite scroll continuation on home
│   │   ├── HomeGrid.tsx              # IntersectionObserver scroll-reveal
│   │   ├── DevlogPanel.tsx           # Floating devlog drawer, lazy-fetched
│   │   ├── PostContentBoundary.tsx   # Error boundary for corrupted content
│   │   ├── ReadingProgress.tsx       # Fixed 2px progress bar
│   │   └── ...
│   └── ui/
│       ├── PostCard.tsx              # div+onClick: no nested anchor
│       └── PostContent.tsx           # Tiptap JSON → sanitized HTML
│
└── lib/
    ├── errors.ts                     # AppError, getErrorMessage, logServiceError
    ├── appwrite/
    │   ├── postService.ts            # Throws AppError on all write failures
    │   ├── adminService.ts
    │   ├── auth.ts                   # Memoized Account instance
    │   ├── config.ts                 # Env var validation in all environments
    │   └── appwriteService.ts        # Barrel re-export
    ├── utils.ts                      # formatDate, extractPreview, readingTime, ...
    └── compressImage.ts              # Canvas API: JPEG, max 1280px
```

---

## Getting started

### Prerequisites

- Node.js 18+
- An [Appwrite](https://appwrite.io) project (Cloud or self-hosted)

### Appwrite collection setup

**Posts collection attributes:**

| Attribute | Type | Required | Notes |
|---|---|---|---|
| title | String (255) | Yes | |
| content | String (1,048,576) | Yes | Tiptap JSON |
| featuredImage | String (255) | Yes | Appwrite file ID |
| status | String (255) | Yes | `active` or `inactive` |
| userId | String (255) | Yes | |
| authorName | String (255) | No | |
| tags | String[] (255 each) | No | |
| ratings | Integer[] | No | |
| reviews | String[] (2048 each) | No | |
| urlSlug | String (512) | No | |
| views | Integer | No | Default: 0 |
| metaTitle | String (255) | No | |
| metaDescription | String (512) | No | |
| focusKeyword | String (255) | No | |
| canonicalUrl | String (512) | No | |
| noIndex | Boolean | No | |

**Admins collection attributes:**

| Attribute | Type | Required |
|---|---|---|
| userId | String (255) | Yes |
| addedBy | String (255) | Yes |
| addedAt | String (255) | Yes |

**Indexes to create:**
- Posts collection: full-text index on `tags` (enables `Query.contains` without full scans)
- Posts collection: index on `status` + `$createdAt` (for feed queries)

### Installation

```bash
git clone https://github.com/Blank-16/Blog.git
cd Blog
npm install
cp .env.local.sample .env.local
# Fill in .env.local
npm run dev
```

### Environment variables

```env
NEXT_PUBLIC_APPWRITE_URL=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=your-posts-collection-id
NEXT_PUBLIC_APPWRITE_BUCKET_ID=your-storage-bucket-id
NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID=your-admins-collection-id
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

---

## Deployment

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all environment variables under `Settings > Environment Variables`
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain — no trailing slash
5. Deploy
6. Submit `https://your-domain.vercel.app/sitemap.xml` to [Google Search Console](https://search.google.com/search-console)

---

## First admin

1. Sign up through the app
2. Find your user ID in the Appwrite console under `Auth > Users`
3. Manually insert a document into the `admins` collection with `userId` set to your ID
4. All subsequent admins can be added through the `/admin` dashboard UI

---

## Adding screenshots

Place screenshots in `public/screenshots/` and add them to the README sections below.

| What to capture | Suggested filename |
|---|---|
| Admin overview — stat cards visible | `screenshots/admin-overview.png` |
| Admin charts — all six panels | `screenshots/admin-charts.png` |
| Post management table | `screenshots/admin-posts.png` |
| Tiptap editor with SEO panel open | `screenshots/editor-seo.png` |
| A published post with reading progress bar | `screenshots/post-page.png` |
| Search page with tag mode active | `screenshots/search-tags.png` |
| Devlog panel open | `screenshots/devlog-panel.png` |
| Portfolio page desktop | `screenshots/portfolio.png` |
| Home page on mobile (~390px) | `screenshots/mobile-home.png` |

---

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

---

## Key engineering decisions

**Cursor pagination over offset** — `Query.cursorAfter(lastId)` is stable when new posts are inserted. Offset pagination shifts all subsequent pages when a new post appears at the top, causing duplicates or skipped items in infinite scroll.

**`'layout'` type in `revalidatePath`** — busts the full layout subtree, not just the leaf page. Without it, layout-level shared components (the featured post slot) remain stale after a new post is published.

**Nested anchor fix** — `PostCard` and `FeaturedPost` use `<div onClick>` outer wrappers so tag links inside can be proper `<Link>` elements. HTML forbids `<a>` inside `<a>` — nested anchors break keyboard navigation and screen readers.

**`serverExternalPackages` for Tiptap** — Tiptap and ProseMirror reference `window` and `document` during module init. Without externalization, Vercel's SSR worker evaluates these modules server-side and crashes.

**`AppError` over null returns** — service functions that write data throw `AppError` instead of returning `null`/`false`. Callers never need to null-check. `AppError` maps Appwrite's HTTP codes and type strings to specific user-facing messages rather than generic "Something went wrong" toasts.

**Memoized `Account` instance** — `AuthService.account` previously ran `new Account(getClient())` on every call. Now uses a `_account` field with lazy init — one instance per service lifetime.

**Fire-and-forget view counter** — `getPostByUrlParam` increments the view count with `.catch(() => {})` after returning the post. A failed increment never delays or crashes a page load.

**`MainContent` + `BlogChrome` client wrappers** — the root layout is a server component, so `lg:ml-56` (sidebar offset) and the visibility of `Footer`/`DevlogPanel` are controlled by two thin client components that read `usePathname()`. The portfolio gets zero blog chrome with no special casing in the layout server component.
