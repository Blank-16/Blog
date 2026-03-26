# Blogging Web

A full-stack blogging platform built with Next.js 15 App Router and Appwrite. Write, publish, and manage posts with a clean minimal UI, rich text editing, image uploads, ratings, and reviews.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Appwrite](https://img.shields.io/badge/Appwrite-18-pink?logo=appwrite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

---

## Features

- **Rich text editor** — Tiptap with headings, lists, blockquotes, code blocks, and inline image upload
- **Image compression** — client-side canvas compression before upload (up to 85% size reduction)
- **Ratings & reviews** — star ratings and comments on every post
- **Draft autosave** — new posts auto-saved to localStorage every second
- **Dark mode** — full dark/light theme toggle
- **Auth** — sign up, log in, protected routes via Appwrite Auth
- **SEO** — dynamic metadata, Open Graph, Twitter cards, JSON-LD structured data, sitemap, robots.txt
- **ISR + Hybrid rendering** — top 20 posts pre-built at deploy, new posts rendered on first visit then cached
- **GSAP animations** — fade-up transitions on route change

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Backend / Database | Appwrite (Auth, Database, Storage) |
| State management | Redux Toolkit |
| Rich text editor | Tiptap |
| Forms | React Hook Form |
| Animations | GSAP |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 5 |
| Fonts | DM Serif Display, DM Sans |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — Redux, Header, Footer, GSAP
│   ├── page.tsx                  # Home page (ISR)
│   ├── post/[slug]/page.tsx      # Post page — metadata, JSON-LD, hybrid ISR
│   ├── add-post/page.tsx
│   ├── edit-post/[slug]/page.tsx
│   ├── all-posts/page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── not-found.tsx
│   ├── sitemap.ts                # Auto-generated sitemap.xml
│   ├── robots.ts                 # Auto-generated robots.txt
│   ├── globals.css
│   └── api/
│       └── revalidate/route.ts   # On-demand ISR revalidation endpoint
│
├── page-components/              # Page-level components (not Next.js routes)
│   ├── HomePage.tsx
│   ├── PostPage.tsx
│   ├── AddPostPage.tsx
│   ├── EditPostPage.tsx
│   ├── AllPostsPage.tsx
│   ├── LoginPage.tsx
│   └── SignupPage.tsx
│
├── components/
│   ├── client/                   # 'use client' components
│   │   ├── Header.tsx
│   │   ├── AuthGuard.tsx
│   │   ├── AuthInitializer.tsx
│   │   ├── PostForm.tsx
│   │   ├── PostActions.tsx
│   │   ├── HomeGrid.tsx
│   │   ├── RatingsSection.tsx
│   │   ├── TiptapEditor.tsx
│   │   ├── RTE.tsx
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── LogoutBtn.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── SmoothScroll.tsx
│   └── ui/                       # Server-safe UI primitives
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Logo.tsx
│       ├── PostCard.tsx
│       ├── PostContent.tsx
│       ├── Container.tsx
│       └── Footer.tsx
│
├── lib/
│   ├── appwrite/
│   │   ├── config.ts             # Env var bindings
│   │   ├── auth.ts               # AuthService (login, signup, session)
│   │   └── appwriteService.ts    # DB + Storage + ratings/reviews
│   └── compressImage.ts          # Canvas-based client-side compression
│
└── store/
    ├── store.ts
    ├── authSlice.ts
    ├── hooks.ts                  # Typed useAppSelector / useAppDispatch
    └── StoreProvider.tsx
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Appwrite](https://appwrite.io) project (Cloud or self-hosted)

### Appwrite Collection Schema

Your posts collection needs these attributes:

| Attribute | Type | Required |
|---|---|---|
| title | String (255) | ✅ |
| content | String (1048576) | ✅ |
| featuredImage | String (255) | ✅ |
| status | String (255) | ✅ |
| userId | String (255) | ✅ |
| authorName | String (255) | — |
| tags | String[] | — |
| ratings | Integer[] | — |
| reviews | String[] | — |

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/blogging-web.git
cd blogging-web

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.sample .env.local
# Fill in your Appwrite credentials (see below)

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```bash
# .env.local

# Appwrite — all safe to be public (security via Appwrite permissions)
NEXT_PUBLIC_APPWRITE_URL=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=your-database-id
NEXT_PUBLIC_APPWRITE_COLLECTION_ID=your-collection-id
NEXT_PUBLIC_APPWRITE_BUCKET_ID=your-bucket-id

# Site URL — no trailing slash
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-only secret for on-demand ISR revalidation
REVALIDATE_SECRET=your-random-secret-string
```

---

## Rendering Strategy

| Page | Strategy | Why |
|---|---|---|
| Home | ISR (1hr) | Public, changes as new posts are added |
| Post detail | Hybrid ISR (24hr) | Top 20 pre-built, new posts SSR on first visit |
| All posts | CSR | Auth-gated, user-specific data |
| Add / Edit post | CSR | Auth-gated, fully interactive |
| Login / Signup | CSR | No SEO value |

---

## Deployment

### Vercel (recommended)

1. Push your repo to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add all environment variables from `.env.local` in `Settings → Environment Variables`
4. Change `NEXT_PUBLIC_SITE_URL` to your actual Vercel domain
5. Deploy

After deploying, submit `https://yourdomain.vercel.app/sitemap.xml` to [Google Search Console](https://search.google.com/search-console).

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

