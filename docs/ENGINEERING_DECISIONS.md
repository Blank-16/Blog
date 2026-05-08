# Engineering Decisions

Every decision here has a "why this, not that" explanation grounded in the actual code. This document exists to answer the question a recruiter or senior engineer would ask when reading the source.

---

## 1. Next.js App Router over Pages Router

**Decision:** Use the App Router introduced in Next.js 13, not the Pages Router.

**Why:** App Router enables async server components — components that `await` data directly without `getServerSideProps` or `useEffect`. `PostPage` and `HomePage` are async server components that fetch from Appwrite during SSR with zero client-side loading state:

```tsx
// src/page-components/PostPage.tsx
export default async function PostPage({ slug }: { slug: string }) {
  const post = await appwriteService.getPostByUrlParam(slug);
  if (!post) notFound();
  // renders immediately with data
}
```

The Pages Router would require either `getServerSideProps` (verbose, separate file export) or a client component with `useEffect` loading state. App Router produces cleaner, faster code for data-heavy pages.

---

## 2. Hybrid ISR: static pre-build + on-demand generation

**Decision:** Pre-build the top 20 posts at deploy time, generate all others on-demand and cache for 24 hours. Revalidate on publish/edit via server action.

**Why not full SSR:** Every request would hit Appwrite. Under load, this creates latency spikes and burns Appwrite rate limits. Page load times would be consistently 200–500ms.

**Why not full static:** A new post would not appear until the next deploy or the next revalidation cycle. A personal blog needs new content to appear within seconds of publishing.

**The hybrid:**

```ts
// src/app/post/[slug]/page.tsx
export async function generateStaticParams() {
  // top 20 pre-built at deploy
}
export const revalidate = 86400; // 24h cache for on-demand pages
```

```ts
// src/app/actions/revalidatePost.ts
export async function revalidatePost(urlParam: string): Promise<void> {
  revalidatePath(`/post/${urlParam}`, 'layout');
  revalidatePath('/', 'layout');
}
```

Top 20 posts serve from CDN in ~10ms. New posts generate on first request (~300ms), then serve from CDN for 24 hours. On publish, `revalidatePath` immediately invalidates the cache so the updated post is visible within seconds. Three different performance characteristics, each appropriate for its traffic pattern.

---

## 3. `revalidatePath` with `'layout'` type

**Decision:** Pass `'layout'` as the second argument to `revalidatePath`, not the default `'page'`.

**Why this matters:**

```ts
revalidatePath('/', 'layout'); // busts entire layout subtree
revalidatePath('/');           // busts only the leaf page
```

The home page featured post slot is a server component rendered inside the layout tree. With `'page'` type, only the leaf `/` page is invalidated. The layout-level featured post can remain stale for up to 60 seconds after a publish, showing the old featured post to visitors. With `'layout'` type, the entire subtree is invalidated and the featured post updates immediately.

---

## 4. Cursor pagination over offset pagination

**Decision:** Use `Query.cursorAfter(lastDocumentId)` for all paginated lists. Never use `Query.offset(n)`.

**Why:** Offset pagination breaks when the underlying dataset changes between page fetches. If a new post is published while a user is mid-scroll:

- Offset `n=9` at time T0 returns posts 10–18
- New post inserted at position 1
- Offset `n=9` at time T1 returns posts 9–17 — post 9 appears on both pages

The user sees post 9 twice and never sees post 18. Cursor pagination is position-independent. `cursorAfter(id)` returns documents after that specific document ID regardless of insertions elsewhere in the collection.

```ts
// src/components/client/MoreStories.tsx
const result = await appwriteService.getPosts([
  Query.cursorAfter(cursor), // stable regardless of new inserts
  Query.limit(PAGE_SIZE),
]);
```

Used in `MoreStories`, `PublicPostsPage`, `AllPostsPage`, and `sitemap.ts`.

---

## 5. Service functions throw `AppError`, not return null

**Decision:** Write functions (`createPost`, `updatePost`, `deletePost`, `uploadFile`, `addRating`, `addReview`) throw `AppError` on failure. Read functions (`getPosts`, `getPost`) return `null`/`[]`.

**Why throw for writes:** If `createPost` returns `null`, every caller must null-check. When they forget (and they will), a failed post creation silently redirects the user to `/post/null`. Throwing forces the caller to handle the failure:

```ts
// PostForm — before
const dbPost = await appwriteService.createPost(params);
if (!dbPost) { toast.error('...'); return; }  // easy to forget

// PostForm — after
try {
  const dbPost = await appwriteService.createPost(params);
  // dbPost is always a Post here — no null check needed
} catch (e) {
  toast.error(getErrorMessage(e)); // specific, user-facing message
}
```

**Why return null for reads:** A failed `getPosts` on the home page should show an empty feed, not crash. A failed `getPost` for a related-posts query should simply show no related posts. The empty state is a valid UI outcome for reads.

---

## 6. Centralized `AppError` with Appwrite code mapping

**Decision:** A single `AppError` class in `src/lib/errors.ts` wraps all Appwrite errors. `AppError.toUserMessage()` maps every known HTTP code and type string to a specific English sentence.

**Why not just catch and log:** Generic "Something went wrong" toasts are useless to users. A user submitting a post during an Appwrite outage should see "The server is temporarily unavailable" — not "Something went wrong." A user who enters the wrong password should see "Incorrect email or password" — not "Something went wrong."

```ts
// src/lib/errors.ts
case 'user_invalid_credentials': return 'Incorrect email or password.';
case 'storage_invalid_file_size': return 'File size exceeds the limit.';
case 429: return 'Too many requests. Please wait a moment and try again.';
```

One place to update when Appwrite adds new error codes. One place to swap for Sentry or another observability platform:

```ts
export function logServiceError(context: string, error: unknown): void {
  const appErr = error instanceof AppError ? error : new AppError(error);
  console.error(`[${context}]`, { code: appErr.code, type: appErr.type, message: appErr.message });
  // Replace console.error with Sentry.captureException(appErr) here
}
```

---

## 7. Redux for auth only

**Decision:** Use Redux Toolkit for the `auth` slice only. No other application state is in Redux.

**Why Redux at all:** Auth state is read by many components simultaneously — `Header`, `AuthGuard`, `PostForm`, `RatingsSection`, `PostCard`, `DevlogPanel`, `AdminPage`. Prop-drilling auth through the component tree is untenable. Context re-renders the entire subtree on every state change. Redux updates only connected components.

**Why not more Redux:** Every other piece of state is local to its component. Infinite scroll state is in `PublicPostsPage`. Form state is in `PostForm` via `react-hook-form`. Modal state is in individual components. Adding Redux for these would add boilerplate with no benefit — no sharing across the tree, no time-travel debugging needed.

---

## 8. Redux store as factory, not singleton

**Decision:** `makeStore()` factory instead of `export const store = configureStore(...)`.

**Why:** In Next.js App Router, multiple server-side renders can occur concurrently. A module-level singleton `store` would be shared across requests — one user's auth state could leak into another user's render. The factory pattern creates one store per `StoreProvider` mount:

```ts
// src/store/store.ts
export function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}
```

```tsx
// src/components/client/StoreProvider.tsx
export default function StoreProvider({ children }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) storeRef.current = makeStore(); // one per mount
  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

`useRef` ensures the same store instance is reused across re-renders of `StoreProvider` without creating a new store on every render.

---

## 9. `div onClick` pattern for cards with inner links

**Decision:** `PostCard` and `FeaturedPost` use a `<div onClick={() => router.push(href)}>` outer wrapper instead of a `<Link>` or `<a>` element, so tag links inside can be proper `<Link>` elements.

**Why not `<Link>` wrapper:** HTML forbids `<a>` inside `<a>`. Browsers handle nested anchors inconsistently — some ignore the inner link, some ignore the outer. Screen readers and keyboard navigation break entirely.

```tsx
// PostCard — entire card is clickable, tags are independent links
<div onClick={() => router.push(href)} role="article" className="cursor-pointer">
  ...
  <Link
    href={`/search?tag=${tag}`}
    onClick={(e) => e.stopPropagation()} // prevents outer click
  >
    {tag}
  </Link>
</div>
```

`e.stopPropagation()` on tag clicks prevents the outer `onClick` from firing — the tag navigates to search, not to the post.

---

## 10. `serverExternalPackages` for Tiptap

**Decision:** List all Tiptap and ProseMirror packages in `serverExternalPackages` in `next.config.mjs`.

**Why:** Tiptap's packages (and the underlying ProseMirror packages) reference `window`, `document`, and `navigator` at module evaluation time — not inside functions, but at the top level during import. When Next.js's SSR bundler evaluates these modules server-side (Vercel Node.js runtime), it throws `ReferenceError: window is not defined` and crashes the build or the serverless function.

```js
// next.config.mjs
serverExternalPackages: [
  '@tiptap/core', '@tiptap/react', '@tiptap/starter-kit',
  'prosemirror-model', 'prosemirror-state', 'prosemirror-view',
  // ...
],
```

`serverExternalPackages` tells Next.js to not bundle these packages into the server bundle — they remain as `require()` calls evaluated only when the module is actually imported in a browser context.

---

## 11. Canvas compression on the client

**Decision:** Compress images client-side using the Canvas API before uploading to Appwrite, rather than after upload or server-side.

**Why client-side:** The alternative approaches:
- **Server-side after upload:** User uploads full 5MB image, waits for upload, server compresses, uploads again. Slower for user, double the storage writes.
- **Server-side on serve:** `getFilePreview` URL parameters can resize images in Appwrite, but the original large file remains in storage. Storage costs accumulate.
- **Client-side before upload:** The payload that leaves the browser is already compressed. Upload is faster, storage costs are lower, no server processing required.

**Why Canvas specifically:** The Canvas API is available in all modern browsers with no dependencies. Libraries like `browser-image-compression` add ~100KB to the bundle. The custom `compressImage` function is 60 lines and handles every edge case:

```ts
if (file.type === 'image/gif') return file;   // preserve animation
if (file.size < skipUnder) return file;        // skip small files
if (blob.size >= file.size) return file;       // skip if compressed is larger
```

---

## 12. Fire-and-forget view counter

**Decision:** Increment the view counter asynchronously after returning the post, with `.catch(() => {})`.

**Why not await:** A failed view counter increment should never delay a page load. The post content is already fetched and ready. Making the user wait for a non-critical counter update is the wrong trade-off.

```ts
// src/lib/appwrite/postService.ts
const post = await getPost(realId);   // this is awaited — it's the page content
if (post) {
  getDatabases()
    .updateDocument(/* ... */, { views: (post.views ?? 0) + 1 })
    .catch(() => {});                 // this is not — it's a side effect
}
return post;
```

**Why not a separate API route:** An API route would add latency for the client, complexity in the implementation, and another network request per page view. The server component already has an Appwrite connection open — using it for an extra `updateDocument` call costs almost nothing.

---

## 13. `MainContent` and `BlogChrome` as client wrappers

**Decision:** Two thin `'use client'` components handle the sidebar offset and blog chrome visibility, rather than special-casing in the root layout server component.

**Why:** The root `layout.tsx` is a server component. Server components cannot call `usePathname()`. The two options:

1. Convert `layout.tsx` to a client component — loses all server-side rendering benefits for the root layout
2. Wrap only the parts that need `usePathname` in client components

Option 2:

```tsx
// src/components/client/MainContent.tsx — 8 lines
'use client';
export default function MainContent({ children }) {
  const pathname = usePathname();
  const isPortfolio = pathname.startsWith('/portfolio');
  return <main className={`flex-1 ${isPortfolio ? '' : 'lg:ml-56'}`}>{children}</main>;
}
```

The root layout stays a server component. Only the specific `className` decision and the `DevlogPanel`/`Footer` visibility are handled client-side, which is the minimal client surface needed.

---

## 14. Portfolio as an isolated route group

**Decision:** `/portfolio` has its own `layout.tsx` that loads JetBrains Mono and omits all blog chrome. Three mechanisms cooperate to achieve full isolation.

**Why three mechanisms instead of one:**

The issue is that `/portfolio` sits inside the root layout (`src/app/layout.tsx`), which always renders `Header`, `MainContent`, `DevlogPanel`, and `Footer`. Overriding individual pieces requires different approaches:

- **`Header`** has its own `usePathname` check and returns `null` — handled inside the component because `Header` already reads pathname for active-link highlighting
- **`MainContent`** wraps `children` in a client component that removes the `lg:ml-56` offset
- **`BlogChrome`** wraps `DevlogPanel` and `Footer` to hide them

An alternative would be a route group `(blog)` with a separate layout. That would cleanly separate the two apps at the routing level. The current approach was chosen because it avoids restructuring the entire `src/app/` directory mid-project. The three-mechanism approach works correctly.

---

## 15. `isomorphic-dompurify` for HTML sanitization

**Decision:** Use `isomorphic-dompurify` to sanitize Tiptap-generated HTML before rendering with `dangerouslySetInnerHTML`.

**Why sanitize at all:** Tiptap generates HTML from user-authored content. Image URLs in the content could theoretically be crafted to execute scripts if rendered without sanitization. `dangerouslySetInnerHTML` disables React's built-in escaping.

**Why `isomorphic-dompurify` specifically:** The Tiptap-to-HTML conversion runs in `PostContent`, which is a `'use client'` component but is also SSR'd on the server. Standard `dompurify` requires a DOM environment and crashes on Node.js. `isomorphic-dompurify` detects the environment and uses jsdom on the server and the real DOM on the client.

```tsx
// src/components/ui/PostContent.tsx
import DOMPurify from 'isomorphic-dompurify';
// ...
return DOMPurify.sanitize(nodeToHtml(parsed));
```

---

## 16. Slug strategy: `author-title--documentId`

**Decision:** Post URLs use the format `/post/author-name-post-title--documentId`.

**Why include the document ID:** Appwrite document IDs are the stable database key. Without the ID in the URL, `getPostByUrlParam` would need a full-collection search by `urlSlug` field — an `Query.equal` on a non-indexed string field. By embedding the ID at the end, extraction is a single `lastIndexOf('--')` and then a direct document fetch:

```ts
const sep = urlParam.lastIndexOf('--');
const realId = sep !== -1 ? urlParam.slice(sep + 2) : urlParam;
return getPost(realId); // O(1) document lookup
```

**Why `--` separator:** Single hyphens appear in both author names and post titles. A double-hyphen is unusual in natural language and serves as an unambiguous separator. `lastIndexOf` handles the case where a post title itself contains `--`.

**Why the author-title prefix:** Pure ID URLs (`/post/abc123def456`) are SEO-opaque. Search engines cannot infer page topic from the URL. `ansuman-pal-how-i-built-a-blog--abc123` gives crawlers and humans both meaningful signal.
