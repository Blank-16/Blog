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

Beyond bug fixes, these are deliberate quality improvements:

**Store architecture**
`store.ts` was refactored from a singleton (`const store = configureStore(...)`) to a factory (`makeStore()`). `StoreProvider` uses `useRef` to create one store per component tree. This prevents cross-request state leaking in SSR — a real production concern in App Router.

**`Button`, `Input`, `Select` disabled states**
All three form primitives now include `disabled:opacity-50 disabled:cursor-not-allowed` Tailwind utilities. Previously a disabled `<Input>` looked identical to an enabled one.

**`Button` variant type narrowing**
`variantClass` was `Record<string, string>` — TypeScript accepted any string as a key. Changed to `Record<'primary' | 'outline' | 'ghost', string>` for proper exhaustiveness checking.

**`Logo` optional `priority`**
The Next.js `<Image>` `priority` prop was hardcoded `true` everywhere. Made it optional (default `false`). Header passes `priority` because the logo is always above the fold. Login/Signup forms do not.

**`config.ts` dev-time validation**
Missing environment variables now log a warning at startup in development mode rather than failing silently at the first Appwrite API call with a cryptic network error.

**`HomeGrid` GPU layer management**
Added `willChange: 'opacity, transform'` before each card's entrance animation to hint compositor layer promotion. After the transition completes, `willChange` is reset to `'auto'` to free the layer — leaving it set permanently would consume GPU memory for every card on screen.

**`AuthGuard` loading state**
The auth loading state previously returned `<div className="min-h-screen" />` — an invisible blank div. Replaced with a centered spinner and "Loading..." text so users see feedback during session resolution.

**`PostForm` content image compression**
Images uploaded directly into the Tiptap editor content body are now compressed with `compressImage()` before upload, matching the behaviour of featured image uploads.

**`slugUtils.ts` JSDoc corrected**
The example in the JSDoc showed a capital letter in the output slug despite `slugify` always lowercasing everything. Corrected to an accurate example.

**`signupForm.tsx` password validation**
Added `minLength: 8` validation with a user-facing error message. The previous form only required the field to be non-empty.

**`SmoothScroll` cleanup safety**
Added a `cancelled` boolean checked both after the dynamic GSAP import resolves and inside the `setTimeout`, preventing animation and timer setup on stale/unmounted component trees during fast navigation.

---

## What More Can Be Done

These are the next features that would meaningfully improve the project. Each includes why it matters for the codebase and what it demonstrates technically.

### High impact

**1. Optimistic UI for ratings**
Currently the star rating submit button is disabled and shows a spinner while waiting for two sequential Appwrite calls (`addRating` then `addReview`). The user sees no feedback for ~500ms on each interaction. Implement optimistic updates: immediately update local state on submit, then reconcile with the server response or roll back on failure. Demonstrates understanding of React state, async patterns, and perceived performance.

**2. Pagination on the home page**
The home page fetches exactly 7 posts. There is no way to browse older posts except through the auth-gated `/all-posts`. Add a public infinite-scroll or "Load more" section below the grid using cursor-based pagination (`Query.cursorAfter`). This pattern already exists in `AllPostsPage` and could be extracted into a reusable hook.

**3. Tag-based filtering**
The admin dashboard shows top tags but clicking a tag does nothing. Add tag filter pages at `/tag/[tag]` using Appwrite's `Query.contains('tags', tag)`. These pages would be ISR-cached, SEO-indexed, and linkable — meaningfully improving content discoverability.

**4. Reading time estimate**
`extractPreview` already walks the Tiptap JSON tree to count characters. Adding a reading time estimate (`Math.ceil(wordCount / 200)` minutes) requires the same tree walk. Display it on `PostCard` and `PostPage`. Simple to implement, noticeably improves UX.

**5. Image upload via drag-and-drop on the featured image field**
The featured image input is a plain `<input type="file">`. Adding drag-and-drop requires listening to `dragover`, `dragleave`, `drop` events on a wrapper div, extracting `e.dataTransfer.files[0]`, and passing it through the existing `compressImage` pipeline. Demonstrates event handling without adding any dependencies.

### Medium impact

**6. Toast notifications for network errors in `AllPostsPage`**
The `loadMore` function has a `catch` block that silently swallows errors. Add a `react-hot-toast` error notification on failure so the user knows the request failed and can retry. The `Toaster` is already rendered by `PostForm` on those pages.

**7. Post view count**
Appwrite's database supports atomic increments. Add a `views` integer field to the posts collection and increment it in `getPostByUrlParam` on each visit. Display it on the post page and in the admin dashboard. This demonstrates understanding of atomic operations and the tradeoff between accuracy and performance (incrementing on every SSR render vs. client-side after hydration).

**8. Markdown import**
Add a toolbar button to `TiptapEditor` that accepts a `.md` file upload and converts it to Tiptap JSON. Tiptap's `@tiptap/pm` parser can convert markdown to ProseMirror nodes. Demonstrates file handling and format conversion.

**9. Post scheduling**
Add a `publishAt` datetime field to the posts collection. Set `status: 'inactive'` at creation time and use a cron job (Appwrite Functions or a Vercel cron route) to flip posts active at the scheduled time and trigger ISR revalidation. Demonstrates background job patterns and the full content lifecycle.

**10. Full-text search upgrade**
The current `searchPosts` uses `Query.contains('title', query)` — it only matches on the title field and requires an exact substring match. Appwrite supports full-text search indexes. Adding one on the `title` field (and optionally `content`) enables prefix matching and relevance ranking. Update the index in the Appwrite console and change `Query.contains` to `Query.search`.

### Lower priority / polish

**11. Unit tests for pure utilities**
`slugUtils.ts`, `utils.ts`, `compressImage.ts`, and `usePostLimits.ts` are all pure functions or deterministic hooks with no Appwrite dependency. These are ideal candidates for Vitest or Jest unit tests. Testing `buildPostSlug` edge cases (special characters, very long names, empty strings) is a concrete starting point.

**12. Error boundary**
There is no React Error Boundary in the tree. If `PostContent`'s `generateHTML` throws an unhandled exception during render (malformed Tiptap JSON from a future schema change), the entire page crashes. Wrapping `PostContent` in an error boundary with a fallback "Content unavailable" message provides graceful degradation.

**13. Keyboard navigation in the Tiptap toolbar**
The toolbar buttons are focusable but there is no `Tab` order management or `aria-pressed` state. Adding `role="toolbar"`, `aria-pressed={item.active}`, and arrow-key navigation between buttons would make the editor screen-reader accessible.

**14. `robots.ts` disallow admin routes**
Currently `robots.ts` allows all paths. Search engines should not index `/admin`, `/add-post`, `/edit-post/*`, `/login`, or `/signup`. Add `disallow` rules for these paths.

---

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
