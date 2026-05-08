# Project Documentation

Complete technical documentation covering architecture decisions, every bug fixed, every improvement made, and what remains as future work.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Decisions](#design-decisions)
3. [Bugs Fixed](#bugs-fixed)
4. [Improvements Made](#improvements-made)
5. [What More Can Be Done](#what-more-can-be-done)
6. [Interview Talking Points](#interview-talking-points)

---

## Architecture Overview

### The boundary between server and client

Next.js 15 App Router blurs the line between server and client in ways that trip up most developers. This project handles it explicitly:

- `page-components/HomePage.tsx` and `page-components/PostPage.tsx` are **async server components** — they fetch data directly from Appwrite during SSR with no useEffect or loading states.
- Every component under `components/client/` carries `'use client'` and only runs interactively in the browser.
- `PostContent` carries `'use client'` but is **still server-rendered to HTML during prerendering**. This is why `dompurify` (browser-only) caused a build crash and `isomorphic-dompurify` is required instead.

### State management scope

Redux is used for exactly one thing: auth state (`status`, `loading`, `userData`). This is the only piece of state that must be shared across the entire component tree — from the `Header` (nav items) to `AuthGuard` (redirects) to `PostForm` (user ID for uploads). Nothing else is in Redux.

### Appwrite as a complete backend

No custom API routes exist. Appwrite provides:
- **Auth** — session management, user creation
- **Database** — posts collection, admins collection, full-text search, cursor pagination
- **Storage** — file upload with per-file permission model (read: anyone, write: owner)

The Appwrite client runs in the browser. There is no server-side Appwrite SDK call except during ISR page generation, where the public client works because post data is not sensitive.

### ISR + Hybrid rendering

The home page revalidates every 60 seconds. Post pages use a hybrid strategy:

- `generateStaticParams` pre-builds the 20 most recent active posts at deploy time
- `dynamicParams = true` means any slug not in that list is server-rendered on first request
- `revalidate = 86400` means cached post pages rebuild after 24 hours
- `revalidatePost()` server action is called after every publish or edit, which immediately purges the specific post page, the home page, and the sitemap

This gives search engines fast, fully-rendered HTML while keeping build times short.

---

## Design Decisions

### Tiptap JSON storage format

Post content is stored as a JSON string (Tiptap's document model), not HTML. This means:
- Content is renderer-agnostic — the same JSON could be rendered by any Tiptap-compatible client
- `extractPreview()` and `extractEmbeddedFileIds()` walk the JSON tree directly rather than parsing HTML
- The content validation in `PostForm` must parse the JSON to check for actual text nodes, not strip HTML tags (which was the original bug)

### URL slug strategy

Posts are accessed via `/post/author-name-post-title--documentId`. The `--` separator lets `getPostByUrlParam` extract the real Appwrite document ID from the end of the slug, while the readable prefix improves SEO and shareability. Old posts that pre-date this system are accessed by raw `$id` as a fallback.

### Image cleanup as a graph problem

When a post is deleted or its content is edited, storage objects can become orphaned. The solution treats embedded images as a graph: `extractEmbeddedFileIds()` walks the Tiptap JSON tree and extracts every Appwrite file ID found in image `src` URLs. On delete, all those IDs plus the featured image are deleted. On edit, the old and new sets of embedded IDs are diffed and the removed ones are deleted.

### Per-tree Redux store

The standard pattern of `const store = configureStore(...)` at module level creates a singleton. In Next.js App Router, the same Node.js module can serve concurrent requests — so multiple users could share the same Redux store, leaking auth state across requests. `StoreProvider` uses `useRef` to create one store per component tree mount, avoiding this entirely.

### Admin system

Admins are stored as documents in a separate Appwrite collection, not as custom JWT claims or user labels. This means:
- Admin checks are database reads (`Query.equal('userId', id)`)
- Adding/removing admins requires only collection document CRUD
- The first admin must be seeded manually via the Appwrite console (documented in README)
- Admins bypass post rate limits and have access to the SEO panel and admin dashboard

---

## Bugs Fixed

### Critical

**1. TiptapEditor image upload broken after store refactor**
`TiptapEditor` was doing `import('@/store/store').then(({ default: store }) => store.getState())` to get the user ID. After `store.ts` was refactored to export only `makeStore()` (no default export), this dynamic import returned an object with no `.getState` method, silently breaking all image uploads inside the editor. Fixed by adding a `userId` prop to `TiptapEditor` and threading it down from `PostForm > RTE > TiptapEditor > Toolbar`.

**2. `dompurify` crashes SSR build**
`PostContent` imported browser-native `dompurify`. During `generateStaticParams` prerendering at build time, Next.js runs components in Node.js where `document` does not exist. `dompurify` detects no DOM and exports a stub — `DOMPurify.sanitize` is not a function, crashing the build with `TypeError: hL.sanitize is not a function`. Fixed by reverting to `isomorphic-dompurify` which ships a JSDOM fallback for server environments.

**3. `PostActions` and admin delete leaving orphaned storage files**
Deleting a post only deleted the database document. The featured image and every image embedded in the post content remained in the Appwrite storage bucket indefinitely, consuming quota with no way to clean them up. Fixed by:
- `PostActions.handleDelete`: after deleting the document, deletes the featured image then calls `deleteFiles(extractEmbeddedFileIds(post.content))`
- `adminService.adminDeletePost`: same pattern — fetches the post first, deletes document, then deletes all associated files
- `PostForm` on edit: diffs old vs new embedded file IDs and deletes removed ones

**4. `urlSlug` write-back was fire-and-forget**
After creating a post, the readable URL slug was written back to the document with `.catch(() => {})` and `router.push` was called immediately after regardless. If the write failed (network hiccup, timeout), the post had no `urlSlug` and was only accessible via raw `$id`. Fixed by `await`-ing the write before navigating. If it fails, the post is still accessible via `$id` as graceful degradation.

**5. `sitemap.ts` generating wrong URLs**
Posts were listed in the sitemap using raw `$id` — e.g. `/post/abc123xyz` — but the actual route served to users and search engines was `/post/author-title--abc123xyz`. Sitemap links were broken for all posts with a `urlSlug`. Fixed to use `post.urlSlug ?? post.$id`.

**6. Admin post links using raw `$id`**
Both the overview "Recent Posts" list and the posts management table in the admin dashboard linked to `/post/${post.$id}`. These links 404'd for posts that had a `urlSlug`. Fixed to use `post.urlSlug ?? post.$id`.

**7. Content validation always passing for Tiptap JSON**
The `PostForm` content field validator used `content.replace(/<[^>]*>/g, '').trim().length > 0`. HTML tag stripping does nothing to a JSON string — a Tiptap document like `{"type":"doc","content":[{"type":"paragraph"}]}` has no HTML tags, so the check always passes even when the editor is visually empty. Fixed by parsing the JSON and recursively checking for non-empty `text` nodes.

**8. `useTransition` with async callbacks**
`AdminPage` used `startTransition(async () => { ... })` in three places. React 18's `startTransition` does not support async functions — the async callbacks complete but state updates inside them are not reliably batched. The pending state (`isPending`) was also incorrect. Replaced with plain `async/await + useState` and `try/finally` for reliable state reset.

### Logic and race conditions

**9. `usePostLimits` flashing "limit reached" for admins**
During the async admin check, `isAdmin` was `false`. The hook returned `canPost: false` before the check completed, causing admins to briefly see the limit-reached UI. Fixed by returning `canPost: true` unconditionally while `loading` is `true`.

**10. `AllPostsPage` double-fetch on mount**
`fetchPosts` was wrapped in `useCallback` with `[userData]` as dependency. When auth resolved, Redux created a new `userData` object reference, causing `useCallback` to produce a new function reference, which re-triggered the `useEffect`. Posts were fetched twice on every mount. Fixed by extracting `fetchUserPosts` to module scope (a plain async function) and depending only on `userData?.$id`.

**11. `SearchPage` stale state after unmount**
The debounced search callback ran `setResults`, `setSearched`, `setLoading` after an async `searchPosts` call. If the user navigated away before the request completed, these state updates ran on an unmounted component. Added a `cancelledRef` boolean set in cleanup, checked before every state update inside the async callback.

**12. `EditPostPage` unstable `useEffect` dependency**
`useEffect` depended on `params?.slug` — an optional-chain expression that re-evaluates every render and is not referentially stable. Extracted to `const slug = params?.slug ?? null` before the effect so the dependency is a plain primitive string.

**13. `ThemeToggle` not reacting to OS preference changes**
System theme changes after page load were ignored. Added a `MediaQueryList` `'change'` event listener that updates the theme when the OS preference changes — but only when the user has not set an explicit preference in `localStorage`. Listener is cleaned up on unmount.

**14. Mobile menu not closing on navigation**
The `Header` had a `useEffect(() => { setMobileMenuOpen(false); }, [])` with an empty dependency array — it ran once on mount and never again. The mobile menu stayed open after route changes. Fixed to depend on `pathname` from `usePathname()`.

**15. `Header` admin badge flash on login**
Admin status was checked via `import('@/lib/appwrite/appwriteService')` — a dynamic import that adds a module-evaluation delay. The Admin badge appeared late, creating a visible flash. Replaced with a direct static import so the check runs immediately when `userData` changes.

**16. `LogoutBtn` double-click risk**
The logout handler had no guard against being called while already running. Rapid double-clicks could send two `deleteSessions` calls. Added `loggingOut` state with an early return guard and `disabled` prop.

**17. `LoginForm` / `SignupForm` double-submit**
Forms had no protection against submitting while already submitting. Added `formState.isSubmitting` from react-hook-form to disable the submit button during the async call.

**18. `PostForm` submit not resetting `submitting` on success**
On both the create and update success paths, `router.push()` was called without first calling `setSubmitting(false)`. If navigation was slow, the button remained disabled on the still-mounted form. Fixed by calling `setSubmitting(false)` before `router.push()`.

**19. `robots.ts` producing `undefined/sitemap.xml`**
`process.env.NEXT_PUBLIC_SITE_URL` was used directly with no fallback. If the env var was unset, the sitemap URL became the literal string `"undefined/sitemap.xml"`. Fixed with a `localhost:3000` fallback constant.

**20. `SmoothScroll` timer leak on fast navigation**
The GSAP dynamic import was `await`ed inside a `useEffect`. If the route changed before the import resolved, the cleanup function ran (`clearTimeout`, `ctx.revert()`) but the import promise was still pending. When it resolved, it would set a timer and run animations on the stale route. Added a `cancelled` boolean flag checked after the dynamic import resolves and inside the `setTimeout` callback.

**21. `revalidatePost` not revalidating home or sitemap**
After publishing or editing a post, only the specific post page was purged from the cache. The home page (which shows the post in the featured slot or grid) and the sitemap (which lists the post URL) remained stale until their next scheduled revalidation. Fixed by also calling `revalidatePath('/')` and `revalidatePath('/sitemap.xml')`.

**22. `AdminPage.handleDeletePost` leaving stats stale**
After an admin deleted a post, only `totalPosts` was decremented. The "Active" and "Inactive" stat cards kept their pre-deletion values. Fixed by looking up the deleted post's `status` before removal and decrementing the correct counter.

**23. `RatingsSection` fake review timestamps**
`formatReviewDate()` always returned `new Date().toLocaleDateString(...)` — today's date — for every review regardless of when it was submitted. Reviews have no stored timestamp in the database, so the field was removed from the UI rather than displaying false data.

**24. `AuthService` creating a second Appwrite client**
`auth.ts` instantiated its own `Client` using `new Client().setEndpoint(...).setProject(...)` — a second instance separate from the singleton in `client.ts`. Two Appwrite clients ran simultaneously. Fixed by using `getClient()` from `client.ts`.

### Code quality

**25. Seven copies of `extractPreview`**
The Tiptap JSON walking function that extracts plain text preview from post content existed in: `HomePage`, `PostCard`, `app/post/[slug]/page.tsx` (as `extractDescription`), `AllPostsPage`, `SearchPage`, `AdminPage`, and `PostContent`. Consolidated into `src/lib/utils.ts`.

**26. Six copies of `formatDate`**
Six separate inline `new Date(iso).toLocaleDateString(...)` implementations. Consolidated into `src/lib/utils.ts` with an `options` parameter for format variants.

**27. Four copies of `toastStyle`**
The react-hot-toast style object was copy-pasted across `AddPostPage`, `EditPostPage`, `AdminPage`, and `PostForm`. Consolidated into `src/lib/utils.ts`.

**28. `console.log` in auth service**
`AuthService` used `console.log` instead of `console.error` for error reporting. All service files now use `console.error`.

**29. Decorative Unicode comments throughout**
All `──`, `│`, `→`, `←`, `★`, `✓`, `○`, `▲`, `▼`, `❝`, `↩`, `↪`, `🖼`, emoji, and Unicode ellipsis characters in code comments, JSX text nodes, and string literals replaced with plain ASCII equivalents or proper HTML entities.

---

## Improvements Made

Beyond bug fixes, these are deliberate quality improvements added through iterative development.

### Core architecture

**Store architecture**
`store.ts` refactored from a singleton to a `makeStore()` factory. `StoreProvider` uses `useRef` to create one store per component tree — prevents cross-request auth state leaking in App Router's concurrent SSR.

**`revalidatePost` uses `'layout'` type**
Changed `revalidatePath` calls to pass `'layout'` as the second argument. Busts the full layout subtree rather than just the leaf page, so shared layout components (the featured post slot) are correctly purged after a publish or edit.

**`serverExternalPackages` for Tiptap and ProseMirror**
All Tiptap and ProseMirror packages added to `serverExternalPackages` in `next.config.mjs`. These packages reference `window` and `document` at module init — without externalization, Vercel's SSR worker crashes.

**Memoized `Account` instance in `AuthService`**
`AuthService.account` previously ran `new Account(getClient())` on every property access. Changed to a `_account` field with lazy init — one instance reused for the service lifetime.

**`config.ts` env var validation in all environments**
Missing env var warnings now run server-side in all environments, logging `console.error` to Vercel function logs rather than silently failing at the first Appwrite API call.

**`sitemap.ts` paginated fetch**
Replaced a single `getPosts()` call (Appwrite's 25-doc default limit) with a cursor-paginated loop fetching 100 at a time. Sites with more than 25 posts now have complete sitemaps. Added `/public-posts` and `/search` to static entries.

### New features

**Public posts page (`/public-posts`)**
A fully public, infinitely scrolling feed of all active posts — separate from the auth-gated `/all-posts`. Uses `IntersectionObserver` sentinel with `cursorAfter` pagination.

**`MoreStories` component on the home page**
Home page was capped at 7 posts. Extracted the "More stories" grid into a `MoreStories` client component seeded with the initial 6 posts from the server fetch. Infinite scroll loads more inline.

**Tag-based search routing**
`searchPostsByTag` added using `Query.contains('tags', tag)`. `SearchPage` gains a title/tag mode toggle and reads `?tag=` on mount. Clicking any tag anywhere navigates to `/search?tag=<tag>` and auto-runs the search.

**Tag links throughout**
All tag renders across `PostCard`, `FeaturedPost`, `PostPage`, and `SearchPage` are now `<Link href="/search?tag=...">` elements. Consistent and clickable everywhere.

**`DevlogPanel`**
Floating panel fixed to `bottom-6 right-6` on all pages. Fetch fires only on first hover or click via `fetchedRef` dedup guard. Renders skeleton, retry on error, post count badge, Escape key and outside-click dismissal.

**`FeaturedPost` client component**
Extracted from `HomePage`. Outer `<div onClick>` handles card navigation; tag `<Link>` elements are proper anchors. Eliminates nested `<a>` bug.

**`PostCard` nested anchor fix**
Converted from `<Link>` outer wrapper to `<div onClick>`. Tag pills are now proper `<Link>` elements — eliminates HTML-invalid `<a>` inside `<a>` that broke keyboard navigation.

**`AllPostsPage` ordering**
Added `Query.orderDesc('$createdAt')` to `fetchUserPosts`. Previously posts returned in undefined Appwrite order.

**Portfolio at `/portfolio`**
Isolated layout — no `Header`, `Footer`, `DevlogPanel`, or Redux Provider. JetBrains Mono via `next/font/google`. Skills use evidence-based entries + primary/secondary/familiar pill groupings. All content in `src/app/portfolio/data.ts`.

**`PostContent` module-scope refactor**
`nodeToHtml` and `tiptapToHtml` extracted to module scope — stable references not recreated per render. `attrs` type fixed from `Record<string, string>` to `Record<string, string | number>` for correct heading `level` typing.

**`HomeGrid` dead code removal**
Removed `animatedIds` ref that was populated but never read. The `:not([data-animated])` selector already prevented re-observation.

**Portfolio mobile optimisation**
Nav collapses to logo + resume button on mobile with a scrollable sub-nav row below. Project title truncation removed. `pl-8` indents become `sm:pl-7`. Hero links stack vertically. Contact rows stack on mobile. All long values use `break-all`.

## Shipped Features — Complete List

All features that were built and shipped across the iterative development of this project.

### Reading
- Cursor-based infinite scroll on `/public-posts`, `/all-posts`, and home page
- Reading time estimate computed from Tiptap JSON word count
- Reading progress bar (2px fixed, fills on scroll)
- Related posts fetched server-side by primary tag
- Optimistic UI for star ratings and text reviews (immediate update, rollback on failure)
- Tag links on all post cards, featured post, post pages, and search results
- `/tag/[tag]` ISR pages for SEO-friendly tag browsing
- Copy link button using Clipboard API with 1.5s "Copied!" feedback
- Devlog panel — floating, lazy-fetched on first hover, Escape + outside-click dismissal

### Writing
- Tiptap rich text editor: headings, lists, blockquotes, code blocks, inline images
- Markdown import via `.md` file upload — converts to Tiptap content
- Canvas API image compression (~85% reduction, max 1280px JPEG)
- Drag-and-drop featured image upload (injects into react-hook-form via DataTransfer)
- Word count + reading time in editor footer (live, updates on every keystroke)
- Draft auto-save to localStorage with live save indicator
- Full SEO panel: meta title, description, focus keyword, canonical URL, noIndex

### Admin
- Six Recharts visualisations
- Post management with full storage cleanup on delete
- Admin management with self-protection guard
- View counter (fire-and-forget on every post page visit)

### User accounts
- Profile page: name, email, password update
- Danger zone: delete all posts, delete account (typed confirmation)
- Edit/delete action bar on every card in `/all-posts`

### Infrastructure
- Hybrid ISR: home (60s), posts (24h + on-demand), tags (1h), portfolio (static)
- Paginated sitemap covering all active posts
- `robots.txt` disallowing auth/admin routes
- `AppError` class with Appwrite code mapping
- `PostContentBoundary` error boundary for corrupted content
- `serverExternalPackages` for Tiptap/ProseMirror
- Env var validation at server startup in all environments

### Portfolio
- Isolated layout at `/portfolio` — no blog chrome
- JetBrains Mono via next/font/google
- Live IST clock
- Evidence-based skills display
- Mobile-optimised nav

## Interview Talking Points

These are the decisions an interviewer is most likely to ask about and the reasoning behind each.

**"Why Redux for auth state instead of React Context?"**
Context re-renders every consumer on every update. `useAppSelector` with a selector function only re-renders when the selected slice changes. For auth state that is read by many components (Header, AuthGuard, PostForm, PostActions, RatingsSection, AdminPage), Context would cause cascading re-renders on every login/logout. Redux Toolkit's `createSlice` also gives us free immutability guarantees via Immer.

**"Why Appwrite instead of a custom Node.js backend?"**
For a portfolio project, Appwrite eliminates the need to write and host auth, file storage, database migrations, and permission systems. The interesting engineering is in the frontend patterns — ISR, Redux, Tiptap, image compression. A custom Express backend would add thousands of lines of boilerplate for login, sessions, and CRUD that adds nothing novel to the discussion.

**"How does ISR work here? What happens when a new post is published?"**
`generateStaticParams` pre-builds the 20 most recent posts at deploy time. Any slug not in that set hits the fallback — Next.js SSRs it and caches it. After publish, `revalidatePost()` is a server action that calls `revalidatePath` for the post page, home page, and sitemap. The CDN cache is purged and the next request gets a fresh render. `dynamicParams = true` means unknown slugs are never 404d — they are just built on demand.

**"Why not store images as base64 in the database?"**
Base64 inflates file size by ~33%. A 500KB image becomes ~670KB in the database, bloating every post document fetch. Appwrite Storage returns a CDN URL (`getFileView`), so images are served from a CDN with proper caching headers rather than inlined in API responses. The URL is stored in the document; the binary is in the bucket.

**"What was the hardest bug to find?"**
The `useTransition` with async callbacks. The code ran — no exception was thrown — but state updates inside the `startTransition` callback were not reliably batched, leading to intermittent UI inconsistencies in the admin dashboard. The fix (plain `async/await + useState`) is simpler than the broken code, which is a good lesson about reaching for React primitives only when you understand their contract.

**"How do you prevent orphaned files in storage?"**
`extractEmbeddedFileIds()` walks the Tiptap JSON tree and extracts every Appwrite file ID from image `src` URLs using a regex match on the Appwrite URL pattern (`/files/{id}/`). On post delete, all extracted IDs plus the featured image ID are passed to `deleteFiles()`, which uses `Promise.allSettled` so one bad ID does not block the rest. On post edit, the old and new sets are diffed and only removed IDs are deleted.
