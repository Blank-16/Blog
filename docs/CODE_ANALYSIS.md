# Code Analysis

A structural analysis of the codebase. Covers architecture patterns, module responsibilities, data flow, and notable implementation details grounded in the actual source.

---

## Module map

```
src/
├── app/                    Next.js App Router — route segments only
│   ├── layout.tsx          Root layout — Redux provider, Header, MainContent, BlogChrome
│   ├── [route]/page.tsx    Thin shell — imports from page-components, exports metadata
│   └── portfolio/          Self-contained route group with its own layout and data
│
├── page-components/        Route-level components — one file per page, contain all logic
│
├── components/
│   ├── client/             'use client' components — side effects, hooks, event handlers
│   └── ui/                 Presentational components — may be server or client
│
├── lib/
│   ├── appwrite/           All Appwrite SDK calls — isolated from UI
│   ├── errors.ts           AppError class and helpers — single source of truth
│   ├── utils.ts            Pure functions: formatting, parsing, extraction
│   └── compressImage.ts    Canvas API image compression
│
└── store/                  Redux Toolkit — auth state only
```

---

## Data flow

### Read path (public post page)

```
Browser request
  → Next.js Edge Runtime (route matching)
  → src/app/post/[slug]/page.tsx (generateStaticParams pre-built top 20, else SSR)
  → src/app/post/[slug]/loading.tsx         [Streaming skeleton]
  → page-components/PostPage.tsx (async server component)
      → postService.getPostByUrlParam()     [Appwrite SDK, server-side]
          → getPost(realId)                 [single document fetch]
      → searchPostsByTag(post.tags[0])      [related posts, server-side]
  → React Server Component renders HTML
  → ReadingProgress, RatingsSection         [client hydration]
  → ViewCounter (client component)
      → postService.incrementPostViews()    [Fired exactly once on mount]
```

### Write path (create post)

```
PostForm.handleSubmit()
  → react-hook-form validates
  → compressImage(file)                         [Canvas API, main thread]
  → storageService.uploadFile(compressed)       [Appwrite Storage, throws AppError]
  → postService.createPost(params)              [Appwrite DB, throws AppError]
  → postService.updatePost({ urlSlug })         [writes slug back, fire-and-forget catch]
  → localStorage.removeItem(DRAFT_KEY)
  → revalidatePost(urlParam)                    [server action, revalidatePath 'layout']
  → router.push('/post/[urlParam]')
```

### Auth flow

```
App mount
  → AuthInitializer (client component, useEffect)
  → authService.getCurrentUser()
      → account.get()                           [single Appwrite call]
      → 401 / session_not_found → returns null
  → dispatch(login({ userData })) or dispatch(logout())
  → authSlice updates state.auth

Route navigation
  → AuthGuard reads useAppSelector(state => state.auth)
  → Renders children or redirect
```

---

### Service layer design

### Error contract

Write functions (`createPost`, `updatePost`, `deletePost`, `uploadFile`, `addRatingAndReview`, `addAdmin`, `removeAdmin`) throw `AppError` on all failures. Callers do not null-check — they `try/catch`.


Read functions (`getPost`, `getPosts`, `getUserPosts`, `searchPosts`, `searchPostsByTag`) return `null` or `[]` on failure for read stability. Callers check the return value.

This asymmetry is intentional: a failed write must be surfaced to the user (nothing was saved), while a failed read can degrade gracefully (show fewer results, show empty state).

### `AppError` mapping

```ts
// src/lib/errors.ts
export class AppError extends Error {
  readonly code: number;    // HTTP status from Appwrite
  readonly type: string;    // Appwrite error type string
  readonly userMessage: string; // user-facing, mapped from code+type
```

`AppError.toUserMessage()` maps every Appwrite HTTP code (400–503) and every known type string (`user_invalid_credentials`, `document_not_found`, etc.) to a specific English sentence. Unmapped errors fall through to "Something went wrong."

Three computed properties enable caller branching:
- `isNotFound` — 404 or `document_not_found` — show empty state
- `isUnauthorized` — 401 or session errors — redirect to login
- `isRetryable` — 429, 500+ — show retry UI

### Appwrite client singleton

```ts
// src/lib/appwrite/client.ts
let client: Client | null = null;
let databases: Databases | null = null;
let storage: Storage | null = null;

export function getClient(): Client {
  if (!client) client = new Client()...
  return client;
}
```

Module-level lazy singletons. Safe in Vercel serverless because each cold start gets a fresh module context. No cross-request state contamination.

`AuthService` additionally memoizes the `Account` instance:

```ts
private _account: Account | null = null;
private get account(): Account {
  if (!this._account) this._account = new Account(getClient());
  return this._account;
}
```

---

## State management

Redux is used for exactly one slice: `authSlice`. It holds:

```ts
interface AuthState {
  status: boolean;   // logged in?
  loading: boolean;  // session check in progress?
  userData: Models.User<Models.Preferences> | null;
}
```

The store is created by a factory function, not as a singleton:

```ts
// src/store/store.ts
export function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}
```

`StoreProvider` calls `makeStore()` inside a `useRef` so the same store instance is reused across re-renders, but a fresh store is created per component tree (preventing cross-request state leaking in App Router's concurrent SSR).

No other state is in Redux. Infinite scroll state, form state, modal state, and UI state are all local to their components.

---

## Rendering architecture

### Root layout shell

```tsx
// src/app/layout.tsx
<StoreProvider>
  <AuthInitializer />
  <SmoothScroll />
  <Header />
  <MainContent>{children}</MainContent>  // applies lg:ml-56 conditionally
  <BlogChrome>                           // hides Footer + DevlogPanel on /portfolio
    <DevlogPanel />
    <Footer />
  </BlogChrome>
</StoreProvider>
```

`MainContent` and `BlogChrome` are `'use client'` wrappers that read `usePathname()`. Server components cannot call hooks, so these two components gate the sidebar offset and blog chrome without special-casing in the layout server component.

### Server vs client component split

| Component | Type | Reason |
|---|---|---|
| `HomePage` | Server async | Fetches featured post at request time |
| `PostPage` | Server async | Fetches post + related posts, generates metadata |
| `FeaturedPost` | Client | Tag links use `e.stopPropagation()` — requires event handler |
| `MoreStories` | Client | Infinite scroll with `IntersectionObserver` |
| `HomeGrid` | Client | `IntersectionObserver` for scroll-reveal animation |
| `PostCard` | Client | `useRouter` for programmatic navigation (avoids nested `<a>`) |
| `PostContent` | Client | `isomorphic-dompurify` requires DOM on client |
| `ReadingProgress` | Client | `window.scrollY` listener |
| `DevlogPanel` | Client | `useState`, `useEffect`, lazy fetch on hover |
| `Header` | Client | `usePathname`, `useAppSelector`, event handlers |
| `RatingsSection` | Client | Optimistic state, form submission |

### Nested anchor fix

HTML forbids `<a>` inside `<a>`. The pattern used throughout:

```tsx
// PostCard, FeaturedPost — outer div handles navigation
<div onClick={() => router.push(href)} role="article">
  ...
  <Link
    href={`/search?tag=${tag}`}
    onClick={(e) => e.stopPropagation()}  // prevents outer click
  >
    {tag}
  </Link>
</div>
```

`e.stopPropagation()` prevents the tag click from also triggering the outer `router.push`.

---

## Image lifecycle

### Compression pipeline

```
User selects file (or drops onto dropzone)
  → handleFileDrop / handleImageChange
  → compressImage(file)
      → skip if GIF (animation)
      → skip if < 100KB
      → draw onto Canvas at max 1280px
      → toBlob('image/jpeg', 0.82)
      → return original if compressed > original
  → setCompressedFile(result)
  → setLocalPreview(URL.createObjectURL(result))
  → setCompressionInfo({ before, after })
```

On form submit, `compressedFile ?? data.image[0]` is passed to `uploadFile` — the compressed version is used if available, otherwise the original.

### Orphan prevention

On post delete (`adminDeletePost`):
1. Fetch the post document before deleting it
2. Delete the document
3. `deleteFile(post.featuredImage)`
4. `extractEmbeddedFileIds(post.content)` — walks Tiptap JSON for `/files/{id}/` URL patterns
5. `deleteFiles(embeddedIds)` — `Promise.allSettled`, one bad ID does not block others

On post edit:
```ts
const oldEmbeddedIds = extractEmbeddedFileIds(post.content);
const newEmbeddedIds = new Set(extractEmbeddedFileIds(data.content));
const removedIds = oldEmbeddedIds.filter(id => !newEmbeddedIds.has(id));
if (removedIds.length > 0) await appwriteService.deleteFiles(removedIds);
```

Images removed from the editor during editing are deleted from storage.

---

## URL slug strategy

Posts are accessible at `/post/{authorName}-{postTitle}--{documentId}`.

```
"Ansuman Pal" + "My First Post" + "$id=abc123"
→ "ansuman-pal-my-first-post--abc123"
```

The `--` double-dash separator is the extraction key:

```ts
// postService.getPostByUrlParam
const sep = urlParam.lastIndexOf('--');
const realId = sep !== -1 ? urlParam.slice(sep + 2) : urlParam;
return getPost(realId);
```

---

## Cursor pagination

All infinite scroll and paginated list features use `Query.cursorAfter(lastId)` rather than `Query.offset(n)`.

**Why this matters:** With offset pagination, inserting a new post at the top shifts every subsequent page by one document. Users mid-scroll see duplicate or skipped posts. `cursorAfter` is position-independent — it fetches documents after a specific document ID, regardless of what has been inserted at the top.

Pattern used consistently across `MoreStories`, `PublicPostsPage`, `AllPostsPage`, and `sitemap.ts`.

---

## ISR revalidation

On publish or edit, `revalidatePost(urlParam)` is called as a server action:

```ts
// src/app/actions/revalidatePost.ts
export async function revalidatePost(urlParam: string): Promise<void> {
  revalidatePath(`/post/${urlParam}`, 'layout');
  revalidatePath('/', 'layout');
  revalidatePath('/public-posts', 'layout');
}
```

`'layout'` type is used rather than the default `'page'`. This busts the cache for the entire layout subtree at each path — including any shared layout components. Without `'layout'`, a layout-level shared component (e.g., the featured post slot on the home page) can remain stale after a publish.

---

## Portfolio isolation

The `/portfolio` route uses three mechanisms to be fully independent of the blog:

1. **`src/app/portfolio/layout.tsx`** — nested layout that loads JetBrains Mono via `next/font/google` and scopes it via CSS variable. Does not include `Header`, `Footer`, or Redux `StoreProvider`.

2. **`src/components/client/Header.tsx`** — returns `null` when `pathname.startsWith('/portfolio')`:
   ```ts
   if (pathname.startsWith('/portfolio')) return null;
   ```

3. **`src/components/client/MainContent.tsx`** and **`BlogChrome.tsx`** — client wrappers that read `usePathname()` and conditionally apply `lg:ml-56` or render `DevlogPanel`/`Footer`.

The portfolio has no Redux dependency, no Appwrite calls, and no shared component state with the blog.

---

## Notable utility functions

### `extractEmbeddedFileIds(tiptapJson: string): string[]`

Recursively walks a Tiptap JSON document tree looking for `image` nodes. Extracts the Appwrite file ID from the URL pattern `/files/{fileId}/`:

```ts
const match = node.attrs.src.match(/\/files\/([^/]+)\//);
if (match?.[1]) out.push(match[1]);
```

Used for storage cleanup on delete and orphan prevention on edit.

### `readingTime(raw: string): number`

Handles both legacy HTML and Tiptap JSON content:
- HTML: strips tags with regex, counts whitespace-delimited tokens
- JSON: walks the Tiptap tree via `collectText()`, joins text nodes, counts tokens
- Returns `Math.max(1, Math.ceil(words / 200))` — minimum 1 minute, standard 200 WPM

### `compressImage(file, options): Promise<File>`

Four early returns before touching Canvas:
1. GIF → return as-is (Canvas strips animation)
2. `file.size < skipUnder` (default 100KB) → return as-is
3. `canvas.getContext('2d')` returns null → return as-is
4. `blob.size >= file.size` → return original (compression made it larger)

The function always resolves — never rejects. `img.onerror` revokes the object URL and resolves with the original file.
