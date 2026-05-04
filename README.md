# Blog Platform

A production-grade full-stack blogging platform and developer portfolio built with **Next.js 15 App Router** and **Appwrite**.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Appwrite](https://img.shields.io/badge/Appwrite-18-pink?logo=appwrite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764abc?logo=redux)

**Live:** [your-domain.vercel.app](https://your-domain.vercel.app) &nbsp;|&nbsp; **Portfolio:** [your-domain.vercel.app/portfolio](https://your-domain.vercel.app/portfolio)

---

## What it is

A full-stack blogging platform where the writer is also the product. Posts are written in a rich text editor, published with full SEO metadata, and served via Hybrid ISR for sub-100ms page loads. A public reading experience sits alongside a private authoring dashboard, analytics panel, and a developer portfolio at `/portfolio`.

---

## Features

### Reading experience
- Public post feed at `/public-posts` with infinite scroll via cursor-based pagination
- Tag-based search routing — clicking any tag navigates to `/search?tag=<tag>` and runs a live query
- Devlog panel — floating button on every page, lazy-fetched only on first hover, shows all posts tagged `devlog`
- Full-text search with 300ms debounce, title and tag modes, mode toggle, URL param sync
- Star ratings and text reviews on every post
- Dark / light theme toggle synced with OS preference

### Writing
- Tiptap rich text editor: headings, lists, blockquotes, code blocks, inline images
- Client-side image compression via Canvas API before every upload — reduces payloads by ~85%
- Draft auto-save to `localStorage` every second
- URL-slug routing: `/post/author-name-post-title--documentId`
- Per-user post rate limiting (1/day, 5/week) enforced in real time, bypassed for admins

### SEO
- Dynamic `generateMetadata` per post: title, description, Open Graph, Twitter cards
- JSON-LD `BlogPosting` structured data on every post page
- Paginated `sitemap.xml` — fetches all active posts in cursor-paginated batches, never truncates at 25
- `robots.txt` auto-generated
- On-demand ISR revalidation after publish or edit using `revalidatePath` with `'layout'` type
- Per-post SEO panel: meta title, meta description, focus keyword, canonical URL, noindex toggle

### Admin dashboard

> Screenshot suggestions — see [Adding Screenshots](#adding-screenshots)

- Tabbed interface: Overview, Posts, Admins
- Live stat cards: total posts, active/inactive split, total ratings and reviews, admin count
- Six Recharts visualisations: posts per week, active ratio donut, top tags, ratings distribution, top posts by rating, authors radar
- Post management: search, filter by status, delete with full storage cleanup (featured image + all embedded content images)
- Admin management: add by user ID, remove, self-protection

### Portfolio
- Available at `/portfolio` — completely isolated from the blog shell (no Header, Footer, or DevlogPanel)
- JetBrains Mono font scoped to the `/portfolio` subtree via `next/font/google`
- Skills section uses evidence-based display (what you built with each skill) + usage-context grouping (primary / secondary / familiar) — no percentage bars
- Data lives in `src/app/portfolio/data.ts` — edit content without touching UI code

---

## Architecture

### Rendering strategy

| Page | Strategy | Revalidation |
|---|---|---|
| Home (`/`) | ISR | 60s + on-demand after publish |
| Post (`/post/[slug]`) | Hybrid ISR | Top 20 pre-built at deploy; new slugs SSR on first visit, cached 24h; on-demand after edit |
| Public posts (`/public-posts`) | CSR | Cursor-paginated, client fetch on mount |
| All Posts (`/all-posts`) | CSR | Auth-gated, user-specific |
| Search (`/search`) | CSR | Live debounced queries, `?tag=` URL param |
| Admin dashboard | CSR | Auth-gated, admin-only |
| Portfolio (`/portfolio`) | Static | No dynamic data |

### Server / client boundary

`page-components/HomePage.tsx` and `page-components/PostPage.tsx` are async server components — they fetch from Appwrite during SSR with no `useEffect`. `components/client/` carries `'use client'` throughout. `PostContent` is client-rendered but SSR-safe via `isomorphic-dompurify`.

### State management

Redux is used for exactly one thing: auth state (`status`, `loading`, `userData`). `StoreProvider` uses `useRef` to create one store per component tree mount, preventing cross-request state leaking in App Router's concurrent SSR.

### Image lifecycle

Images are stored in Appwrite Storage, not the database. On post delete, `extractEmbeddedFileIds()` walks the Tiptap JSON tree and returns every Appwrite file ID found in image `src` attributes. The featured image and all embedded images are deleted via `Promise.allSettled` so one bad ID does not block the rest. On edit, old and new embedded ID sets are diffed and removed files are deleted.

### URL slug strategy

Posts live at `/post/author-name-post-title--documentId`. The `--` separator lets `getPostByUrlParam` extract the Appwrite document ID from the end of the slug for the database query, while the prefix improves SEO and readability. Posts without a slug fall back to raw `$id`.

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: Redux, Header, Footer, DevlogPanel
│   ├── page.tsx                      # Home (ISR, 60s revalidation)
│   ├── post/[slug]/page.tsx          # Post page: metadata, JSON-LD, hybrid ISR
│   ├── public-posts/page.tsx         # Public infinite-scroll feed
│   ├── all-posts/page.tsx            # Auth-gated user posts
│   ├── search/page.tsx               # Search with Suspense boundary
│   ├── portfolio/
│   │   ├── layout.tsx                # Isolated layout: JetBrains Mono, no blog shell
│   │   ├── page.tsx                  # Portfolio page
│   │   └── data.ts                   # All portfolio content (edit here)
│   ├── sitemap.ts                    # Paginated sitemap, covers all active posts
│   ├── robots.ts
│   └── actions/revalidatePost.ts     # Server action: revalidates post + home, layout type
│
├── page-components/
│   ├── HomePage.tsx                  # Server: featured post + MoreStories client handoff
│   ├── PostPage.tsx                  # Server: post detail, tag links
│   ├── PublicPostsPage.tsx           # Client: public infinite scroll
│   ├── AllPostsPage.tsx              # Client: auth-gated, cursor-paginated user posts
│   ├── SearchPage.tsx                # Client: tag/title modes, URL param sync
│   └── ...
│
├── components/
│   ├── client/
│   │   ├── FeaturedPost.tsx          # Client: featured post with tag links, no nested anchors
│   │   ├── MoreStories.tsx           # Client: infinite scroll continuation from home page
│   │   ├── HomeGrid.tsx              # Client: IntersectionObserver scroll-reveal
│   │   ├── DevlogPanel.tsx           # Client: floating devlog drawer, lazy-fetched
│   │   └── ...
│   └── ui/
│       ├── PostCard.tsx              # div+onClick pattern: no nested anchor bug
│       ├── PostContent.tsx           # Tiptap JSON → HTML, isomorphic-dompurify
│       └── ...
│
└── lib/
    ├── appwrite/
    │   ├── postService.ts            # CRUD, searchPosts, searchPostsByTag, ratings
    │   ├── adminService.ts           # Admin CRUD, analytics, getTotalPostCount
    │   ├── auth.ts                   # AuthService with memoized Account instance
    │   ├── config.ts                 # Env var bindings, server-side warning in all envs
    │   └── appwriteService.ts        # Barrel re-export
    ├── utils.ts                      # formatDate, extractPreview, toastStyle, extractEmbeddedFileIds
    └── compressImage.ts              # Canvas API: JPEG, max 1280px
```

---

## Getting started

### Prerequisites

- Node.js 18+
- An [Appwrite](https://appwrite.io) project (Cloud or self-hosted)

### Appwrite setup

**Posts collection attributes:**

| Attribute | Type | Size | Required |
|---|---|---|---|
| title | String | 255 | Yes |
| content | String | 1,048,576 | Yes |
| featuredImage | String | 255 | Yes |
| status | String | 255 | Yes |
| userId | String | 255 | Yes |
| authorName | String | 255 | No |
| tags | String[] | 255 each | No |
| ratings | Integer[] | — | No |
| reviews | String[] | 2048 each | No |
| urlSlug | String | 512 | No |
| metaTitle | String | 255 | No |
| metaDescription | String | 512 | No |
| focusKeyword | String | 255 | No |
| canonicalUrl | String | 512 | No |
| noIndex | Boolean | — | No |

**Admins collection attributes:**

| Attribute | Type | Required |
|---|---|---|
| userId | String (255) | Yes |
| addedBy | String (255) | Yes |
| addedAt | String (255) | Yes |

**Storage bucket:** Create one bucket. Enable file upload. The app sets per-file read permissions to `any()` and write permissions to the uploading user.

**Full-text search index:** On the posts collection, add a full-text index on the `tags` attribute to support `searchPostsByTag`. Without it, `Query.contains('tags', tag)` performs a document scan.

### Installation

```bash
git clone https://github.com/Blank-16/Blog.git
cd Blog
npm install
cp .env.local.sample .env.local
# fill in .env.local
npm run dev
```

### Environment variables

```bash
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

## Making the first admin

1. Sign up through the app
2. Find your user ID in the Appwrite console under `Auth > Users`
3. Manually insert a document into the `admins` collection via the Appwrite console with `userId` set to your ID
4. All subsequent admins can be added through the `/admin` dashboard UI

---

## Adding screenshots

The admin dashboard is the most complex part of the project and the hardest to communicate in a README. Screenshots here would close that gap immediately.

**Recommended shots and where to put them:**

Place the images in `public/screenshots/` and reference them in the README sections below each description.

| Screenshot | What to capture | Suggested filename |
|---|---|---|
| Admin overview | Stat cards + first chart visible above fold | `screenshots/admin-overview.png` |
| Admin charts | All six Recharts panels visible (scroll to show) | `screenshots/admin-charts.png` |
| Post management | Posts table with search active and delete modal open | `screenshots/admin-posts.png` |
| Admin management | Admins tab with add-admin field focused | `screenshots/admin-admins.png` |
| Editor | Tiptap editor mid-post with SEO panel open on the right | `screenshots/editor-seo.png` |
| Post page | A published post with ratings section visible | `screenshots/post-page.png` |
| Search | Search page with tag mode active and results showing | `screenshots/search-tags.png` |
| Devlog panel | Panel open, showing devlog post list | `screenshots/devlog-panel.png` |
| Portfolio | Full portfolio page desktop view | `screenshots/portfolio.png` |
| Mobile | Home page on a ~390px mobile viewport | `screenshots/mobile-home.png` |

**Suggested README sections to add after the Features list:**

```markdown
### Admin dashboard

![Admin overview](public/screenshots/admin-overview.png)
![Admin charts](public/screenshots/admin-charts.png)

### Editor

![Editor with SEO panel](public/screenshots/editor-seo.png)

### Portfolio

![Portfolio page](public/screenshots/portfolio.png)
```

Use [Shottr](https://shottr.cc) (macOS) or [Flameshot](https://flameshot.org) (Linux/Windows) for clean, consistent captures. Set browser zoom to 100% before capturing so text renders at native resolution.

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

**Cursor pagination over offset** — `Query.cursorAfter(lastId)` is stable when new posts are inserted. Offset pagination shifts all subsequent pages when a new post appears at the top, causing duplicates or skipped items in infinite scroll. Every paginated list in the app uses cursors.

**`'layout'` type in `revalidatePath`** — passing `'layout'` to `revalidatePath` busts the full layout subtree, not just the leaf page. Without it, a layout-level shared component (the featured post slot) can remain stale after a new post is published.

**Nested anchor fix** — `PostCard` and `FeaturedPost` use a `<div onClick={() => router.push(href)}>` outer wrapper instead of `<Link>`, so tag links inside can be proper `<Link>` elements. HTML forbids `<a>` inside `<a>`; nested anchors break keyboard navigation and screen readers.

**`serverExternalPackages` for Tiptap** — Tiptap and ProseMirror reference `window` and `document` during module initialisation. Without externalization, Vercel's SSR worker evaluates these modules server-side and crashes. Listing them in `serverExternalPackages` keeps them browser-only.

**Memoized `Account` instance** — `AuthService.account` previously ran `new Account(getClient())` on every property access. The getter now uses a `_account` field with lazy init so one instance is reused for the lifetime of the service.
