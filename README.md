# Blogging Web

A production-grade full-stack blogging platform built with **Next.js 15 App Router** and **Appwrite**. Write and publish posts with a rich text editor, manage images with automatic compression, rate and review posts, and administrate the platform through a live analytics dashboard.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Appwrite](https://img.shields.io/badge/Appwrite-18-pink?logo=appwrite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764abc?logo=redux)

---

## Features

**Content**
- Rich text editor (Tiptap) with headings, lists, blockquotes, code blocks, inline images
- Client-side image compression via Canvas API before every upload (featured images and inline content images)
- Draft auto-save to `localStorage` every second while writing
- URL-slug routing: posts live at `/post/author-name-title--documentId`
- Full-text search with 400ms debounce

**User experience**
- Dark / light theme toggle synced with OS preference, persisted to `localStorage`
- GSAP fade-up animations on every route transition
- Intersection Observer scroll-reveal on post grids
- Skeleton loaders and spinner during auth resolution — no blank screens or content flash

**Auth and access control**
- Sign up, log in, session persistence via Appwrite Auth
- `AuthGuard` component with redirect logic for protected and public-only routes
- Per-user post rate limiting (1/day, 5/week) enforced server-side, shown in real time
- Admin role system: admins are stored in a separate collection and bypass all limits

**SEO**
- Dynamic `generateMetadata` per post: title, description, Open Graph, Twitter cards
- JSON-LD `BlogPosting` structured data on every post page
- Auto-generated `sitemap.xml` and `robots.txt`
- On-demand ISR revalidation after publish or edit
- Custom meta title, meta description, focus keyword, canonical URL, noindex toggle per post

**Admin dashboard**
- Tabbed interface: Overview, Posts, Admins
- Live stat cards: total posts, active/inactive split, total ratings and reviews, admin count
- Six Recharts data visualisations: posts per week, active ratio donut, top tags, ratings distribution, top posts by rating, authors radar
- Post management: search, filter by status, delete with full storage cleanup
- Admin management: add by user ID, remove, self-protection

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | ISR, server components, server actions, file-based routing |
| Backend | Appwrite Cloud | Auth, Database, Storage — no custom server needed |
| State | Redux Toolkit | Shared auth state across server/client boundary |
| Rich text | Tiptap | Extensible ProseMirror editor with JSON storage format |
| Forms | React Hook Form | Zero re-renders on input, built-in validation |
| Charts | Recharts | Composable chart primitives |
| Animations | GSAP | Route-transition fade-up and IntersectionObserver grid reveals |
| Styling | Tailwind CSS v4 | CSS variable design tokens, class-based dark mode |
| Language | TypeScript 5 | Strict mode throughout |

---

## Project Structure

```
src/
├── app/                              # Next.js App Router pages
│   ├── layout.tsx                    # Root layout: Redux, Header, Footer, SmoothScroll
│   ├── page.tsx                      # Home (ISR, 60s revalidation)
│   ├── post/[slug]/page.tsx          # Post page: metadata, JSON-LD, hybrid ISR
│   ├── add-post/page.tsx
│   ├── edit-post/[slug]/page.tsx
│   ├── all-posts/page.tsx
│   ├── admin/page.tsx
│   ├── search/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── not-found.tsx
│   ├── sitemap.ts                    # Auto-generated sitemap.xml
│   ├── robots.ts                     # Auto-generated robots.txt
│   ├── globals.css                   # Design tokens, Tiptap content styles
│   └── actions/
│       └── revalidatePost.ts         # Server Action: revalidates post + home + sitemap
│
├── page-components/                  # Full-page component implementations
│   ├── HomePage.tsx                  # Server component, featured post + grid
│   ├── PostPage.tsx                  # Server component, post detail
│   ├── AddPostPage.tsx               # Client, rate-limit aware
│   ├── EditPostPage.tsx              # Client, loads post then renders PostForm
│   ├── AllPostsPage.tsx              # Client, cursor-paginated user posts
│   ├── AdminPage.tsx                 # Client, tabbed dashboard
│   ├── SearchPage.tsx                # Client, debounced live search
│   ├── LoginPage.tsx
│   └── SignupPage.tsx
│
├── components/
│   ├── client/                       # Interactive components ('use client')
│   │   ├── Header.tsx                # Sticky nav, mobile menu, admin badge
│   │   ├── AuthGuard.tsx             # Redirect logic + spinner skeleton
│   │   ├── AuthInitializer.tsx       # Session check on mount, populates Redux
│   │   ├── PostForm.tsx              # Create/edit form, draft save, image compression
│   │   ├── PostActions.tsx           # Edit/delete links (author only)
│   │   ├── HomeGrid.tsx              # IntersectionObserver scroll-reveal grid
│   │   ├── RatingsSection.tsx        # Star ratings + review form and list
│   │   ├── TiptapEditor.tsx          # Rich text editor with image upload
│   │   ├── RTE.tsx                   # react-hook-form Controller wrapper for Tiptap
│   │   ├── SeoPanel.tsx              # Admin-only SEO fields + live score checker
│   │   ├── DashboardCharts.tsx       # Six Recharts visualisations
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── LogoutBtn.tsx
│   │   ├── ThemeToggle.tsx           # Dark/light, OS sync, persisted preference
│   │   └── SmoothScroll.tsx          # GSAP route-transition animations
│   │
│   └── ui/                           # Server-safe UI primitives
│       ├── Button.tsx                # variant prop, built-in disabled styles
│       ├── Input.tsx                 # forwardRef, label, disabled styles
│       ├── Select.tsx                # forwardRef, options array, disabled styles
│       ├── Logo.tsx                  # SVG logo, optional priority preload
│       ├── PostCard.tsx              # Card with image, tags, preview, meta
│       ├── PostContent.tsx           # Tiptap JSON -> HTML renderer with DOMPurify
│       ├── Container.tsx             # Max-width wrapper
│       └── Footer.tsx
│
├── lib/
│   ├── appwrite/
│   │   ├── types.ts                  # Post, Admin, CreatePostParams, UpdatePostParams
│   │   ├── config.ts                 # Env var bindings + dev-time validation warnings
│   │   ├── client.ts                 # Appwrite client, Databases, Storage singletons
│   │   ├── auth.ts                   # AuthService: login, signup, getCurrentUser, logout
│   │   ├── postService.ts            # CRUD, search, ratings, reviews
│   │   ├── adminService.ts           # Admin CRUD, rate limit queries, analytics queries
│   │   ├── storageService.ts         # Upload, delete, deleteFiles (batch), getFilePreview
│   │   ├── slugUtils.ts              # buildPostSlug, buildUrlParam
│   │   └── appwriteService.ts        # Barrel re-export + default object for legacy imports
│   ├── utils.ts                      # formatDate, extractPreview, toastStyle, extractEmbeddedFileIds
│   ├── compressImage.ts              # Canvas API image compression (JPEG, max 1280px)
│   └── usePostLimits.ts              # Hook: isAdmin + today/week post counts + canPost
│
└── store/
    ├── store.ts                      # makeStore factory + RootState/AppDispatch types
    ├── authSlice.ts                  # Auth state: status, loading, userData
    ├── hooks.ts                      # useAppDispatch, useAppSelector (typed)
    └── StoreProvider.tsx             # useRef-based per-tree store (SSR safe)
```

---

## Rendering Strategy

| Page | Strategy | Revalidation |
|---|---|---|
| Home (`/`) | ISR | 60 seconds + on-demand after publish |
| Post (`/post/[slug]`) | Hybrid ISR | Top 20 pre-built at deploy; new posts SSR on first visit, then cached 24h; on-demand after edit |
| All Posts | CSR | Auth-gated, user-specific |
| Add Post / Edit Post | CSR | Auth-gated, interactive |
| Admin Dashboard | CSR | Auth-gated, admin-only |
| Search | CSR | Live debounced queries |
| Login / Signup | CSR | No SEO value |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Appwrite](https://appwrite.io) project (Cloud or self-hosted)

### Appwrite Setup

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

**Storage bucket:** Create a bucket, enable file upload. The app sets per-file read permissions to `any()` and write permissions to the uploading user.

### Installation

```bash
# 1. Clone
git clone https://github.com/yourusername/blogging-web.git
cd blogging-web

# 2. Install
npm install

# 3. Environment
cp .env.local.sample .env.local
# Edit .env.local with your Appwrite credentials

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```bash
NEXT_PUBLIC_APPWRITE_URL=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=your-posts-collection-id
NEXT_PUBLIC_APPWRITE_BUCKET_ID=your-storage-bucket-id
NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID=your-admins-collection-id
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Scripts

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all environment variables in `Settings > Environment Variables`
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain (no trailing slash)
5. Deploy

After deploying, submit `https://yourdomain.vercel.app/sitemap.xml` to [Google Search Console](https://search.google.com/search-console).

---

## Making Someone an Admin

1. Have the user sign up through the app
2. Find their user ID in the Appwrite console under **Auth > Users**
3. Go to `/admin` while logged in as an existing admin and paste the ID into the **Add Admin** field
4. The first admin must be created by manually inserting a document into the `admins` collection via the Appwrite console
