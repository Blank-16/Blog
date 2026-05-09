# Known Limitations

Grounded in actual source code. Every limitation references the specific file and behaviour causing it.

---

## 1. Authentication

### 1.1 Account deletion is soft-only

**File:** `src/lib/appwrite/auth.ts` — `deleteAccount()`

`deleteAccount()` calls `account.deleteSessions()`, which logs the user out and blocks re-entry, but the Appwrite user record remains. The email cannot be reused. A hard delete requires an Appwrite Server Function with the Management API key — not currently implemented.

### 1.2 No email verification

Accounts are created directly via `account.create()` with no `createVerification()` call. Any email address — real or invented — can register and post.

### 1.3 No password reset flow

There is no "Forgot password" page. Users who lose their password cannot recover without direct Appwrite console intervention.

### 1.4 Session expiry handling is coarse

**File:** `src/components/client/AuthInitializer.tsx`

Both auth errors (`user_session_not_found`) and transient network errors resolve to `dispatch(logout())` as a safe default. A user on a flaky connection may be logged out despite having a valid session.

---

## 2. Data layer

### 2.1 View counter lacks session deduplication

**File:** `src/components/client/ViewCounter.tsx`

Views are incremented via a client-side component using `useRef` to ensure the call fires exactly once per mount, preventing increments on SSR or re-renders. However, there is still no IP, session, or 24-hour cooldown deduplication. Multiple visits by the same user will still inflate the counter.

### 2.2 Ratings allow repeat submissions

**File:** `src/lib/appwrite/postService.ts` — `addRatingAndReview()`

Ratings and reviews are consolidated into a single atomic update to prevent state inconsistency. However, they are still appended to arrays with no `userId` stored alongside each entry. One user can submit unlimited ratings on the same post.

### 2.3 `getPosts` returns null on failure instead of throwing

**File:** `src/lib/appwrite/postService.ts` — `getPosts()`

`getPosts` returns `null` on failure for read stability, unlike write functions which throw `AppError`. Callers that do not null-check (sitemap.ts) silently produce incomplete results. This is an intentional inconsistency in the service contract.

### 2.4 `searchPosts` uses substring match, not full-text search

**File:** `src/lib/appwrite/postService.ts` — `searchPosts()`

`Query.contains('title', query)` performs a substring match. It does not tokenise, stem, or rank by relevance. "javascript tutorial" will not match posts with both words as separate tokens.

### 2.5 Tag search capped at 50 results

**File:** `src/lib/appwrite/postService.ts` — `searchPostsByTag()`

`Query.limit(50)` — a platform with more than 50 posts under a popular tag silently truncates results on both `/search?tag=` and `/tag/[tag]`.

### 2.6 `getUserPosts` capped at 100

**File:** `src/lib/appwrite/postService.ts` — `getUserPosts()`

`Query.limit(100)` — used by the profile "Delete all posts" flow. A user with more than 100 posts will have surplus posts silently skipped during deletion.

---

## 3. Editor

### 3.1 Markdown import is regex-based, not spec-compliant

**File:** `src/components/client/TiptapEditor.tsx` — `importMarkdown()`

Conversion uses a chain of `.replace()` calls. It does not handle: nested lists, tables, footnotes, escaped characters (`\*`), hard line breaks, or HTML inside markdown. Complex markdown requires manual correction after import.

### 3.2 Draft auto-save only works for new posts

**File:** `src/components/client/PostForm.tsx`

```ts
useEffect(() => {
  if (post) return; // skips edit mode
```

Editing an existing post at `/edit-post/[slug]` has no auto-save. Accidental navigation loses all unsaved edits.

### 3.3 All drafts share one localStorage key

**File:** `src/components/client/PostForm.tsx`

```ts
const DRAFT_KEY = 'blog-draft';
```

Two open tabs writing new posts simultaneously will overwrite each other. Last save wins.

---

## 4. Performance

### 4.1 Admin dashboard fetches all posts client-side

**File:** `src/page-components/AdminPage.tsx`

Uses `fetchAllPostsPaginated()` — walks cursor pages until exhausted. All chart computations run in-browser on the full dataset. Scales poorly beyond ~500 posts.

### 4.2 Only top 20 posts are pre-rendered at deploy

**File:** `src/app/post/[slug]/page.tsx`

```ts
export async function generateStaticParams() { /* top 20 */ }
export const revalidate = 86400;
```

First visitors to any post outside the top 20 experience SSR latency (~200–500ms) rather than static serving.

### 4.3 Canvas compression runs on the main thread

**File:** `src/lib/compressImage.ts`

`drawImage` and `toBlob` block the UI during compression. Large images (e.g., 12MP phone photos) produce a visible freeze. A Web Worker would fix this.

### 4.4 `extractPreview` and `readingTime` each parse the same JSON

**File:** `src/lib/utils.ts`

Both functions call `JSON.parse(raw)` independently on the same post content string. In `PostCard`, both are called on every render. The double-parse is negligible for typical post sizes but is avoidable.

---

## 5. Security

### 5.1 All credentials are client-side `NEXT_PUBLIC_*` vars

**File:** `src/lib/appwrite/config.ts`

All Appwrite keys are embedded in the client bundle. Security relies entirely on Appwrite collection-level permission rules. A misconfigured collection permission exposes the database directly.

### 5.2 Rate limiting is client-enforced

**File:** `src/lib/appwrite/adminService.ts` — `getPostCountToday()`, `getPostCountThisWeek()`

The 1/day, 5/week post limits are checked by the client querying the database before calling `createPost`. A user with devtools or a direct API client can bypass them entirely by calling the Appwrite endpoint directly.

### 5.3 Admin check is a database query, not a JWT claim

**File:** `src/lib/appwrite/adminService.ts` — `isAdmin()`

```ts
const result = await getDatabases().listDocuments<Admin>(/* ... */,
  [Query.equal('userId', userId), Query.limit(1)],
);
```

Admin status is determined by querying the `admins` collection client-side. The check cannot be forged (userId comes from the authenticated session), but the `admins` collection read permission must be restricted to prevent users from querying it directly.

---

## 6. UX gaps

### 6.1 No unsaved-changes warning on post edit

Navigating away from `/edit-post/[slug]` silently discards changes. No `beforeunload` guard and no Next.js router event handler is implemented.

### 6.2 No pagination fallback on deleted cursor

If a document referenced by `cursorAfter` is deleted mid-scroll, Appwrite returns a `document_not_found` error. Infinite scroll stops and cannot resume. There is no fallback to offset pagination or cursor reset.

### 6.3 Portfolio clock flashes empty on first render

**File:** `src/app/portfolio/LiveClock.tsx`

`useState('')` suppresses hydration mismatch by rendering nothing on first paint. The clock appears after the first `useEffect` tick (~16ms), causing a one-frame flash of empty space.

---

## 7. Deployment constraints

### 7.1 Vercel free tier function timeout is 10s

`sitemap.ts` and `fetchAllPostsPaginated()` make multiple sequential Appwrite requests. On large collections these could exceed the 10-second timeout and return partial results or a 504 error.

### 7.2 `NEXT_PUBLIC_SITE_URL` silently falls back to localhost

**File:** `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/post/[slug]/page.tsx`

```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
```

Without this variable, all canonical URLs, OG tags, and sitemap entries point to `localhost:3000`. The build succeeds with wrong values — not caught at build time.
