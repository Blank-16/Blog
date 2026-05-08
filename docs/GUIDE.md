# Codebase Guide

A walkthrough of every meaningful part of the codebase. Written for someone reading the source for the first time — a new contributor, a technical interviewer, or future you returning after six months away. Assumes TypeScript and React familiarity but explains every project-specific pattern from scratch.

---

## Table of Contents

1. [How to read this project](#1-how-to-read-this-project)
2. [Entry points and request lifecycle](#2-entry-points-and-request-lifecycle)
3. [Root layout — the shell everything runs inside](#3-root-layout)
4. [The Appwrite service layer](#4-the-appwrite-service-layer)
5. [Error handling](#5-error-handling)
6. [Auth — Redux slice, initializer, and guard](#6-auth)
7. [Home page — server component + client handoff](#7-home-page)
8. [Post page — ISR, metadata, JSON-LD, and content rendering](#8-post-page)
9. [The editor — Tiptap, compression, and draft save](#9-the-editor)
10. [Infinite scroll — the cursor pagination pattern](#10-infinite-scroll)
11. [Search — debounce, modes, and URL param sync](#11-search)
12. [Ratings — optimistic UI with rollback](#12-ratings)
13. [Admin dashboard](#13-admin-dashboard)
14. [Navigation — sidebar and hamburger](#14-navigation)
15. [Portfolio — isolated route group](#15-portfolio)
16. [Utilities — the shared toolkit](#16-utilities)
17. [Theme system](#17-theme-system)
18. [SEO pipeline](#18-seo-pipeline)
19. [Reading time and progress bar](#19-reading-time-and-progress-bar)
20. [DevlogPanel — lazy-fetched floating drawer](#20-devlog-panel)
21. [Image compression pipeline](#21-image-compression-pipeline)
22. [How a post gets created end-to-end](#22-how-a-post-gets-created-end-to-end)
23. [How a post gets deleted end-to-end](#23-how-a-post-gets-deleted-end-to-end)

---

## 1. How to read this project

The project follows a strict file responsibility contract:

| Directory | Purpose | Rule |
|---|---|---|
| `src/app/[route]/page.tsx` | Route shell | Thin — imports from `page-components`, exports `metadata` and `generateStaticParams` |
| `src/page-components/` | Route logic | One file per page. Contains the real JSX, data fetching for CSR pages, state management |
| `src/components/client/` | Reusable client components | Always have `'use client'` at top. Hooks, events, side effects live here |
| `src/components/ui/` | Presentational components | Can be server or client. No data fetching, no auth checks |
| `src/lib/appwrite/` | All Appwrite SDK calls | No JSX. Pure TypeScript service functions |
| `src/lib/errors.ts` | Error handling | Single source of truth for all error types and messages |
| `src/lib/utils.ts` | Pure utilities | No imports from the rest of the project — only standard library |
| `src/store/` | Redux | Auth slice only |
| `src/app/portfolio/` | Portfolio | Self-contained. No imports from blog components |

**The most important rule:** app routes are thin shells. All logic lives in `page-components`. This means you can read `PostPage`, `HomePage`, `SearchPage` etc. in isolation without digging through Next.js route conventions.

---

## 2. Entry points and request lifecycle

### Static request (cached post page)

```
Browser → Vercel CDN
  → Cache hit → serve pre-rendered HTML instantly (~10ms)
  → Cache miss → Vercel Node.js runtime
      → src/app/post/[slug]/page.tsx
          → generateMetadata() → Appwrite getPostByUrlParam()
          → Page() → PostPage server component → Appwrite getPostByUrlParam()
      → Next.js renders HTML
      → Stores in CDN cache (24h TTL)
      → Serves to browser
  → Browser receives HTML + JS
  → React hydrates: ReadingProgress, RatingsSection, PostActions become interactive
```

### Dynamic request (new post, not yet cached)

Same path, but `generateStaticParams` didn't include this slug, so `dynamicParams = true` kicks in and Next.js falls back to SSR on the first request. After that, the rendered output is cached.

### Client-side request (search, profile, all-posts)

```
Browser → Vercel CDN
  → Serves static HTML shell (empty content, just the chrome)
  → React mounts
  → 'use client' component calls useEffect
  → Appwrite SDK called directly from browser
  → State updates → component re-renders with data
```

---

## 3. Root layout

**File:** `src/app/layout.tsx`

The root layout is a server component. It does three things no other component does:

**1. Theme detection without flash**

```tsx
<script dangerouslySetInnerHTML={{ __html: `(function(){
  try {
    var hasCookie = document.cookie.indexOf('theme=') !== -1;
    if (hasCookie) return;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
      document.cookie = 'theme=dark; ...';
    }
  } catch(e) {}
})();` }} />
```

This inline script runs before any React code — before the HTML body is even parsed. It prevents the "flash of wrong theme" by setting the correct class on `<html>` synchronously. The server also reads the `theme` cookie to set the initial class server-side, making the two consistent.

**2. Layout shell**

```tsx
<StoreProvider>
  <AuthInitializer />    {/* resolves session on mount */}
  <SmoothScroll />       {/* GSAP smooth scrolling */}
  <Header />             {/* sidebar or hamburger nav */}
  <MainContent>          {/* applies lg:ml-56, skips it on /portfolio */}
    {children}
  </MainContent>
  <BlogChrome>           {/* hides Footer + DevlogPanel on /portfolio */}
    <DevlogPanel />
    <Footer />
  </BlogChrome>
</StoreProvider>
```

**3. Why `MainContent` and `BlogChrome` are client wrappers**

`layout.tsx` is a server component and cannot call `usePathname()`. But the sidebar offset (`lg:ml-56`) and the blog chrome must be absent on `/portfolio`. Solution: wrap those elements in thin `'use client'` components that read `usePathname()`:

```tsx
// MainContent.tsx — 8 lines
'use client';
export default function MainContent({ children }) {
  const isPortfolio = usePathname().startsWith('/portfolio');
  return <main className={`flex-1 ${isPortfolio ? '' : 'lg:ml-56'}`}>{children}</main>;
}
```

The layout stays a server component. Only the minimum surface area becomes client-side.

---

## 4. The Appwrite service layer

**Files:** `src/lib/appwrite/`

All Appwrite SDK calls are isolated in five files. No component imports from the Appwrite SDK directly — everything goes through these services.

### `client.ts` — lazy singletons

```ts
let client: Client | null = null;
let databases: Databases | null = null;

export function getDatabases(): Databases {
  if (!databases) databases = new Databases(getClient());
  return databases;
}
```

Module-level `let` variables initialized lazily on first call. Safe in Vercel serverless because each cold start gets a fresh module context — no cross-request contamination.

### `config.ts` — environment validation

```ts
const config: AppConfig = {
  appwriteUrl: process.env.NEXT_PUBLIC_APPWRITE_URL ?? '',
  // ...
};

if (typeof window === 'undefined') {
  // Runs server-side only — surfaces missing vars in Vercel function logs
  for (const key of required) {
    if (!config[key]) console.error(`[config] Missing env var for "${key}"`);
  }
}
```

`typeof window === 'undefined'` is the Node.js check. The warning fires in Vercel function logs immediately on cold start rather than as a cryptic network error on the first API call.

### `postService.ts` — the main data layer

Five categories of functions:

| Function | Returns on success | Returns/throws on failure |
|---|---|---|
| `createPost` | `Post` | throws `AppError` |
| `updatePost` | `Post` | throws `AppError` |
| `deletePost` | `void` | throws `AppError` |
| `getPost` | `Post` | returns `null` (not found is valid) |
| `getPosts` | `DocumentList<Post>` | returns `null` (degraded read) |
| `searchPosts` | `Post[]` | throws `AppError` |
| `searchPostsByTag` | `Post[]` | throws `AppError` |
| `addRating` | `Post` | throws `AppError` |
| `addReview` | `Post` | throws `AppError` |

Write functions throw because a caller that ignores a write failure leaves the user confused ("did it save or not?"). Read functions return null/empty because degraded reads are visible in the UI as empty states — acceptable outcomes.

### `auth.ts` — memoized `Account`

```ts
export class AuthService {
  private _account: Account | null = null;

  private get account(): Account {
    if (!this._account) this._account = new Account(getClient());
    return this._account;
  }
```

Before this change, every `getCurrentUser()`, `login()`, `logout()` call allocated a `new Account()` instance. Now one instance is created on first access and reused. Small optimization, but the pattern matters.

---

## 5. Error handling

**File:** `src/lib/errors.ts`

### `AppError`

```ts
export class AppError extends Error {
  readonly code: number;       // Appwrite HTTP status
  readonly type: string;       // Appwrite error type string
  readonly userMessage: string; // what to show the user
}
```

`AppError` is constructed from any caught value:

```ts
throw new AppError({ code: 401, type: 'user_invalid_credentials', message: '...' });
// or from a raw Appwrite error:
} catch (error) {
  throw new AppError(error); // extracts code, type, message automatically
}
```

### The mapping table

`AppError.toUserMessage()` has two switch statements — one on HTTP code, one on Appwrite type string:

```ts
case 'user_invalid_credentials': return 'Incorrect email or password.';
case 'storage_invalid_file_size': return 'File size exceeds the limit.';
case 429: return 'Too many requests. Please wait a moment and try again.';
```

If neither matches, it checks if the raw message contains "fetch" or "network" (browser network errors), then falls back to "Something went wrong."

### Three computed properties

```ts
get isNotFound(): boolean   // 404 → show empty state
get isUnauthorized(): boolean  // 401 → redirect to login
get isRetryable(): boolean  // 429/500+ → show retry button
```

### `getErrorMessage(e)`

Safe to call from any catch block, regardless of whether `e` is an `AppError`, a regular `Error`, or an unknown thrown value:

```ts
// In any component:
} catch (e: unknown) {
  toast.error(getErrorMessage(e));
}
```

### `logServiceError(context, error)`

Structured logging from service functions:

```ts
logServiceError('postService::createPost', error);
// Outputs: [postService::createPost] { code: 503, type: 'general_server_error', message: '...' }
```

Replace `console.error` with `Sentry.captureException` in one place to get full observability.

---

## 6. Auth

### `authSlice.ts`

Three actions, three fields:

```ts
interface AuthState {
  status: boolean;    // is user logged in?
  loading: boolean;   // is session check in progress?
  userData: Models.User | null;
}

// login: set status=true, loading=false, userData=user
// logout: set status=false, loading=false, userData=null
// setAuthLoading: set loading=true/false
```

### `AuthInitializer.tsx`

Runs once on mount. Resolves the session:

```ts
useEffect(() => {
  authService.getCurrentUser()
    .then((userData) => {
      if (userData) dispatch(login({ userData }));
      else dispatch(logout());
    })
    .catch((e: unknown) => {
      const appErr = e instanceof AppError ? e : new AppError(e);
      // Auth errors → logout (session invalid)
      // Network errors → logout (safe default, prevents infinite loading)
      dispatch(logout());
    });
}, [dispatch]);
```

The catch branch distinguishes `isUnauthorized` errors (true session expiry) from network errors (transient), but currently resolves both to `logout()` as a safe default. The distinction is preserved in code for future refinement.

### `AuthGuard.tsx`

Wraps any page that requires authentication:

```ts
const { status, loading } = useAppSelector(state => state.auth);

if (loading) return <LoadingSpinner />;
if (!status) {
  redirect('/login');
  return null;
}
return children;
```

`loading` prevents a flash of the login redirect while the session is being resolved on mount. Without it, authenticated users would briefly see the login page on every refresh.

---

## 7. Home page

**File:** `src/page-components/HomePage.tsx`

The home page is a server component with a clean server/client handoff:

```tsx
export const revalidate = 60; // ISR: rebuild every 60 seconds

export default async function HomePage() {
  const result = await appwriteService.getPosts([
    Query.equal('status', 'active'),
    Query.limit(7),           // featured (1) + seed for MoreStories (6)
    Query.orderDesc('$createdAt'),
  ]);
  const [featured, ...rest] = result?.documents ?? [];

  return (
    <>
      {featured && <FeaturedPost post={featured} />}
      <MoreStories initialPosts={rest} />    {/* client component */}
    </>
  );
}
```

The server renders the featured post and the first 6 grid items. `MoreStories` is a client component that takes those 6 as its seed — the user sees content instantly without a loading state. As they scroll, `MoreStories` fetches more posts.

### `FeaturedPost.tsx`

`FeaturedPost` is a client component even though it displays static data. The reason: it contains tag links (`<Link href="/search?tag=...">`) inside a card that is itself navigable. HTML forbids nested `<a>` elements:

```tsx
// Outer: div with onClick (not <Link>)
<div onClick={() => router.push(href)} role="article">
  ...
  // Inner: proper <Link> with stopPropagation
  <Link href={`/search?tag=${tag}`} onClick={(e) => e.stopPropagation()}>
    {tag}
  </Link>
</div>
```

`e.stopPropagation()` prevents the tag click from also firing the outer `router.push`.

---

## 8. Post page

**File:** `src/app/post/[slug]/page.tsx` and `src/page-components/PostPage.tsx`

The route file does three things:

**1. Pre-build top 20 at deploy**

```ts
export async function generateStaticParams() {
  const result = await appwriteService.getPosts([
    Query.orderDesc('$createdAt'),
    Query.limit(20),
  ]);
  return (result?.documents ?? []).map(post => ({ slug: post.urlSlug ?? post.$id }));
}
export const dynamicParams = true;  // all other slugs → SSR on first visit
export const revalidate = 86400;    // 24h cache for on-demand pages
```

**2. Dynamic metadata per post**

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await appwriteService.getPostByUrlParam(slug);
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || extractDescription(post.content),
    openGraph: { type: 'article', publishedTime: post.$createdAt, ... },
    alternates: { canonical: post.canonicalUrl || defaultUrl },
  };
}
```

`extractDescription` walks the Tiptap JSON tree to extract the first 160 characters of text — it doesn't use a regex, it uses the same `collectText` recursion from `utils.ts`.

**3. JSON-LD structured data**

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.$createdAt,
    author: { '@type': 'Person', name: post.authorName },
    // ...
  })}}
/>
```

JSON-LD is safe to inject via `dangerouslySetInnerHTML` because the data comes from your own database, not user input. The `JSON.stringify` call escapes any special characters.

### `PostPage.tsx` — the server component

```tsx
export default async function PostPage({ slug }) {
  const post = await appwriteService.getPostByUrlParam(slug);
  if (!post) notFound();

  // Related posts — fetched server-side, no client loading state
  const related = (await appwriteService.searchPostsByTag(post.tags?.[0]))
    .filter(p => p.$id !== post.$id)
    .slice(0, 3);

  return (
    <div>
      <ReadingProgress />              {/* client: scroll listener */}
      {/* author · date · reading time */}
      <PostContentBoundary>           {/* error boundary */}
        <PostContent content={post.content} />
      </PostContentBoundary>
      <PostActions post={post} />     {/* client: copy link, edit, delete */}
      <RatingsSection post={post} />  {/* client: ratings, reviews */}
      {/* related posts grid */}
    </div>
  );
}
```

---

## 9. The editor

**File:** `src/components/client/TiptapEditor.tsx`

Tiptap wraps ProseMirror. The editor is configured with three extensions:

```ts
const editor = useEditor({
  extensions: [
    StarterKit,         // headings, bold, italic, code, lists, blockquote, etc.
    Image,             // inline image nodes
    Placeholder,       // empty state placeholder text
  ],
  content: parseContent(value),  // Tiptap JSON or undefined
  onUpdate: ({ editor }) => {
    const json = JSON.stringify(editor.getJSON());
    onChangeRef.current(json);  // propagates up to PostForm
  },
});
```

### Content storage format

Posts are stored as Tiptap JSON, not HTML. Tiptap JSON is a tree of typed nodes:

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [
      { "type": "text", "text": "Hello World" }
    ]},
    { "type": "paragraph", "content": [
      { "type": "text", "text": "Some content", "marks": [{ "type": "bold" }] }
    ]}
  ]
}
```

This is rendered to HTML by `PostContent` using `nodeToHtml()` — a custom recursive function that maps each node type to its HTML equivalent. Storing JSON rather than HTML gives full control over the rendering without re-parsing HTML and makes it easy to extract plain text for previews, word counts, and SEO descriptions.

### Word count in the toolbar footer

```tsx
const text = editor.getText();
const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
const readingTime = Math.max(1, Math.ceil(wordCount / 200));
```

`editor.getText()` walks the document tree and concatenates all text nodes. The word count and reading time update live on every keystroke via Tiptap's `useEditor` re-render.

### Markdown import

```ts
const importMarkdown = () => {
  const input = document.createElement('input');
  input.accept = '.md,text/markdown';
  input.onchange = async () => {
    const text = await file.text();
    const html = text
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // ... etc
    editor.chain().focus().setContent(`<p>${html}</p>`, true).run();
  };
  input.click();
};
```

The conversion is regex-based — it handles the most common patterns but is not spec-compliant (no support for nested lists, tables, or escaped characters). The `true` parameter in `setContent` parses the HTML string into Tiptap's internal JSON representation.

### Draft auto-save

```ts
useEffect(() => {
  if (post) return; // only for new posts, not edits
  let timer: ReturnType<typeof setTimeout>;
  const sub = watch((values) => {
    clearTimeout(timer);
    setDraftSaveState('saving');
    timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        title: values.title, content: values.content, tags: values.tags,
      }));
      setDraftSaveState('saved');
      setLastSavedAt(new Date());
    }, 1000); // 1s debounce
  });
  return () => { sub.unsubscribe(); clearTimeout(timer); };
}, [post, watch]);
```

`watch` from `react-hook-form` fires on every form field change. The 1-second debounce prevents localStorage writes on every keystroke. The cleanup function (`sub.unsubscribe()`) prevents memory leaks.

---

## 10. Infinite scroll

**Files:** `src/components/client/MoreStories.tsx`, `src/page-components/PublicPostsPage.tsx`, `src/page-components/AllPostsPage.tsx`

All three use the same pattern. Here's `MoreStories` in full:

```ts
const PAGE_SIZE = 6;

// State
const [posts, setPosts] = useState<Post[]>(initialPosts);
const [cursor, setCursor] = useState<string | null>(
  initialPosts.length > 0 ? initialPosts[initialPosts.length - 1].$id : null
);
const [hasMore, setHasMore] = useState(initialPosts.length > 0);
const [loadingMore, setLoadingMore] = useState(false);
const sentinelRef = useRef<HTMLDivElement>(null);

// Fetch next page
const loadMore = useCallback(async () => {
  if (!cursor || loadingMore || !hasMore) return;
  setLoadingMore(true);
  try {
    const result = await appwriteService.getPosts([
      Query.cursorAfter(cursor),   // key: position-independent pagination
      Query.limit(PAGE_SIZE),
    ]);
    const docs = result?.documents ?? [];
    setPosts(prev => [...prev, ...docs]);
    setHasMore(docs.length === PAGE_SIZE); // fewer than PAGE_SIZE → last page
    if (docs.length > 0) setCursor(docs[docs.length - 1].$id);
  } catch (e) {
    toast.error(getErrorMessage(e));
    setHasMore(false); // stop retrying automatically
  } finally {
    setLoadingMore(false);
  }
}, [cursor, loadingMore, hasMore]);

// Sentinel observation
useEffect(() => {
  const sentinel = sentinelRef.current;
  if (!sentinel || !hasMore) return;
  const observer = new IntersectionObserver(
    entries => { if (entries[0].isIntersecting) loadMore(); },
    { rootMargin: '300px' } // trigger 300px before sentinel enters viewport
  );
  observer.observe(sentinel);
  return () => observer.disconnect();
}, [hasMore, loadMore]);

// In JSX — invisible div at the bottom of the list
<div ref={sentinelRef} className="h-px" />
```

The `300px` `rootMargin` means `loadMore` fires before the user reaches the bottom — the next page starts loading while they're still reading, so there's no perceived pause.

**Why cursor over offset:** If post A is deleted between page 1 and page 2, offset pagination serves post 2's content under position 1. The user never sees what was at position 11. `cursorAfter(lastId)` is immune — it fetches documents after a specific ID regardless of insertions or deletions elsewhere.

---

## 11. Search

**File:** `src/page-components/SearchPage.tsx`

Two modes: title search (substring match) and tag search (exact tag contains). The mode toggle updates state; the debounced effect re-runs when either `query` or `mode` changes.

```ts
const [query, setQuery] = useState(initialTag);
const [mode, setMode] = useState<'title' | 'tag'>(initialTag ? 'tag' : 'title');
const ignoreSyncRef = useRef(false); // guards against URL → state re-sync loop

// URL param sync — navigating to /search?tag=javascript pre-fills the input
useEffect(() => {
  if (ignoreSyncRef.current) {
    const tag = searchParams.get('tag') ?? '';
    if (tag) { ignoreSyncRef.current = false; setQuery(tag); setMode('tag'); }
    return;
  }
  const tag = searchParams.get('tag') ?? '';
  if (tag) { setQuery(tag); setMode('tag'); }
}, [searchParams]);

// Debounced search
useEffect(() => {
  if (!query.trim()) { setResults([]); setSearched(false); return; }
  setLoading(true);
  const timer = setTimeout(async () => {
    try {
      const posts = mode === 'tag'
        ? await appwriteService.searchPostsByTag(query)
        : await appwriteService.searchPosts(query);
      setResults(posts);
      setSearched(true);
    } catch (e) {
      setSearchError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [query, mode]);
```

### The `ignoreSyncRef` guard

Without this, typing in the input, then clearing the URL via `router.replace('/search')`, then navigating back to a tag link would cause the `searchParams` effect to try to sync `?tag=` back into the input, overwriting what the user typed. `ignoreSyncRef` is set to `true` when the user types manually (to block URL sync), and reset to `false` when they clear or switch modes (to allow it again).

---

## 12. Ratings — optimistic UI with rollback

**File:** `src/components/client/RatingsSection.tsx`

Optimistic UI means updating the UI immediately before the server confirms the change, then rolling back if the server rejects it. This makes the ratings feel instant.

```ts
const handleSubmit = async () => {
  // 1. Capture current state (for rollback)
  const previousRatings = ratings;
  const previousReviews = reviews;

  // 2. Apply optimistic update immediately
  const optimisticRatings = [...ratings, starValue];
  const optimisticReviews = [...reviews, encoded];
  setRatings(optimisticRatings);
  setReviews(optimisticReviews);
  setStarValue(0);  // clear the form
  setReviewText('');

  // 3. Call the server
  try {
    const updated = await appwriteService.addRating(post.$id, ratings, starValue);
    // Reconcile with server's authoritative state
    setRatings(updated.ratings ?? optimisticRatings);
  } catch (e) {
    // 4. Rollback on failure — restore captured state
    setRatings(previousRatings);
    setReviews(previousReviews);
    setStarValue(starValue);
    setReviewText(reviewText.trim());
    setError(getErrorMessage(e));
  }
};
```

The key pattern: capture the current state before the optimistic update, apply the optimistic update, attempt the server call, reconcile on success or restore the captured state on failure.

### Review storage format

Reviews are stored in Appwrite as strings in the format `"AuthorName|||Body"`. The `|||` triple-pipe separator is unlikely to appear in natural text. On read, `parseReview` splits on the first `|||`:

```ts
function parseReview(raw: string): { author: string; body: string } {
  const sep = raw.indexOf('|||');
  if (sep === -1) return { author: 'Anonymous', body: raw };
  return { author: raw.slice(0, sep), body: raw.slice(sep + 3) };
}
```

This allows storing both fields in a single Appwrite String array attribute without a separate collection.

---

## 13. Admin dashboard

**File:** `src/page-components/AdminPage.tsx`

The dashboard is client-side only. On mount it fetches all posts via `fetchAllPostsPaginated()` — a cursor-paginated loop that fetches 100 posts at a time until the collection is exhausted. All chart data is computed from this dataset in-browser.

### Chart data transformations

Six Recharts components, each with a different transformation:

```ts
// Posts per week — count by ISO week number
const byWeek = posts.reduce((acc, post) => {
  const week = getWeekLabel(post.$createdAt);
  acc[week] = (acc[week] ?? 0) + 1;
  return acc;
}, {});

// Top tags — flatten all tags arrays, count frequency
const tagFrequency = posts.flatMap(p => p.tags ?? [])
  .reduce((acc, tag) => { acc[tag] = (acc[tag] ?? 0) + 1; return acc; }, {});

// Rating distribution — bucket ratings 1–5
const distribution = [1, 2, 3, 4, 5].map(star => ({
  star,
  count: posts.flatMap(p => p.ratings ?? []).filter(r => r === star).length,
}));
```

### Post management

The posts table in the admin has search and filter. Deletion calls `adminDeletePost(post.$id)` which:
1. Fetches the post to get file IDs
2. Deletes the document
3. Deletes the featured image file
4. Extracts all embedded image file IDs from the Tiptap JSON
5. Deletes all embedded images via `Promise.allSettled`

---

## 14. Navigation

**File:** `src/components/client/Header.tsx`

`Header` renders different components based on screen width, detected via a `resize` event listener:

```ts
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 1024);
  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

On desktop (`>= lg`): `<Sidebar>` — fixed 224px left panel with logo, nav items grouped by visibility, theme toggle, profile avatar at the bottom.

On mobile (`< lg`): `<Header>` top bar with hamburger button + `<MobileMenu>` dropdown that animates in from the top-right.

### Nav item visibility

```ts
const navItems: NavItem[] = [
  { name: 'Home',        slug: '/',             active: true },
  { name: 'All Stories', slug: '/public-posts', active: true },
  { name: 'Portfolio',   slug: '/portfolio',    active: true },
  { name: 'Login',       slug: '/login',        active: !authStatus },
  { name: 'Signup',      slug: '/signup',       active: !authStatus },
  { name: 'My Posts',    slug: '/all-posts',    active: authStatus },
  { name: 'Add Post',    slug: '/add-post',     active: authStatus },
  { name: 'Admin',       slug: '/admin',        active: authStatus && isAdmin },
];
```

`active: false` items are filtered out before rendering — they simply don't appear. Admin check is async (Appwrite query), so the Admin item fades in after the check resolves.

### Profile avatar

At the bottom of the sidebar:

```tsx
<button onClick={() => router.push('/profile')}>
  <div className="w-6 h-6 rounded-full ...">
    {initials}  {/* first letter of each name word, max 2 chars */}
  </div>
  <div>
    <p>{userData.name}</p>
    <p>{userData.email}</p>
  </div>
</button>
```

`initials` is computed from `userData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()`. Falls back to the first letter of the email if no name is set.

---

## 15. Portfolio

**Files:** `src/app/portfolio/`

The portfolio is a self-contained mini-app at `/portfolio`. Four files:

| File | Purpose |
|---|---|
| `layout.tsx` | Nested layout: loads JetBrains Mono via `next/font/google`, no blog chrome |
| `page.tsx` | Server component: renders full portfolio from `data.ts` |
| `data.ts` | All content: personal info, projects, skills, certificates |
| `LiveClock.tsx` | Client component: live IST clock with `setInterval` |

### Data-driven content

Everything visible in the portfolio comes from `data.ts`. To update any content, edit that file only — no JSX changes needed. The TypeScript types enforce the shape:

```ts
export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  repoUrl?: string;
  liveUrl?: string;
  featured: boolean;
  year: number;
};
```

### Skills display

Two sections, no percentage bars:

1. **`coreSkills`** — 8 entries with an `evidence` field: what was actually built with that skill. Rendered as a numbered list.
2. **`skillGroups`** — three groups (`primary`, `secondary`, `familiar`) rendered as pill sets with decreasing opacity.

### `LiveClock`

```ts
useEffect(() => {
  const tick = () => {
    setTime(now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    }));
  };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

`useState('')` initializes with empty string to prevent a hydration mismatch between server (no clock) and client (clock with current time). The clock appears after the first `useEffect` tick (~16ms). `clearInterval` in the cleanup prevents memory leaks on unmount.

---

## 16. Utilities

**File:** `src/lib/utils.ts`

Five exports, all pure functions:

### `formatDate(iso, options)`

```ts
export function formatDate(iso: string, options = { month: 'short', day: 'numeric', year: 'numeric' }): string {
  return new Date(iso).toLocaleDateString('en-US', options);
}
```

### `extractPreview(raw, maxLength)`

Handles both content formats:
- **Legacy HTML:** strips tags with `/<[^>]*>/g`, truncates to `maxLength`
- **Tiptap JSON:** parses JSON, calls `collectText()` recursively, joins, truncates

```ts
function collectText(nodes: TiptapNode[]): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.type === 'text' && node.text) out.push(node.text);
    if (node.content) out.push(...collectText(node.content)); // recursion
  }
  return out;
}
```

### `readingTime(raw)`

Same dual-format handling as `extractPreview`. Returns `Math.max(1, Math.ceil(words / 200))`.

### `extractEmbeddedFileIds(tiptapJson)`

Walks the Tiptap JSON tree looking for `image` nodes and extracts the Appwrite file ID from the URL:

```ts
const match = node.attrs.src.match(/\/files\/([^/]+)\//);
```

The regex matches the Appwrite file URL pattern: `https://cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/view`.

### `toastStyle`

CSS variable-based toast styling so toasts match the current theme:

```ts
export const toastStyle = {
  background: 'var(--bg-card)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
};
```

---

## 17. Theme system

**Files:** `src/app/globals.css`, `src/components/client/ThemeToggle.tsx`, `src/app/layout.tsx`

Theme is stored in a cookie (`theme=dark` or `theme=light`) and as a class on `<html>`. Tailwind uses the `dark:` prefix variant.

The inline script in `layout.tsx` runs before React and before CSS is applied. It detects the OS preference via `window.matchMedia('(prefers-color-scheme: dark)')` and sets both the class and the cookie synchronously — preventing the white flash that occurs if you wait for React to hydrate before applying the theme.

The server reads the cookie and applies the initial class server-side:

```tsx
const cookieStore = await cookies();
const theme = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';
return <html className={theme}>
```

`ThemeToggle` toggles the class on `document.documentElement` and updates the cookie via `document.cookie = 'theme=...'`.

---

## 18. SEO pipeline

Three layers of SEO, all automatically generated from post data:

### 1. `generateMetadata` (per-post)

In `src/app/post/[slug]/page.tsx`. Generates `<title>`, `<meta description>`, Open Graph tags, Twitter card, and canonical URL from the post's fields and fallbacks from the content.

### 2. JSON-LD structured data (per-post)

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  datePublished: post.$createdAt,
  dateModified: post.$updatedAt,
  author: { '@type': 'Person', name: post.authorName },
  keywords: post.tags?.join(', '),
})}} />
```

Google uses JSON-LD to identify article metadata for rich results (author, date, headline in search results).

### 3. `sitemap.ts` (whole platform)

```ts
async function getAllActivePosts(): Promise<Post[]> {
  const all: Post[] = [];
  let cursor: string | null = null;
  while (true) {
    const queries = [
      Query.equal('status', 'active'),
      Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    const result = await appwriteService.getPosts(queries);
    if (!result || result.documents.length === 0) break;
    all.push(...result.documents);
    if (result.documents.length < 100) break;
    cursor = result.documents.at(-1)!.$id;
  }
  return all;
}
```

Cursor-paginated to capture all posts regardless of collection size. Appwrite's default `listDocuments` limit is 25 — without this loop, the sitemap would silently miss posts 26 onwards.

### 4. ISR tag pages (`/tag/[tag]`)

```ts
// src/app/tag/[tag]/page.tsx
export const revalidate = 3600; // rebuild hourly
```

Each tag gets its own URL, crawlable by Google. Hourly ISR keeps them reasonably fresh.

---

## 19. Reading time and progress bar

### Reading time

**File:** `src/lib/utils.ts` — `readingTime(raw: string): number`

Uses the standard 200 WPM average. Handles both Tiptap JSON (recursive text extraction) and legacy HTML (regex tag strip). `Math.max(1, ...)` ensures the minimum is always "1 min read" — zero-word posts still show something sensible.

Displayed in two places:
- `PostCard` — in the meta row alongside author and date
- `PostPage` — in the header alongside date

### Reading progress bar

**File:** `src/components/client/ReadingProgress.tsx`

```ts
useEffect(() => {
  const calc = () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setProgress(docHeight > 0 ? Math.min(100, (scrollY / docHeight) * 100) : 0);
  };
  calc();
  window.addEventListener('scroll', calc, { passive: true });
  return () => window.removeEventListener('scroll', calc);
}, []);

return (
  <div
    className="fixed top-0 left-0 z-[60] h-[2px] bg-ink/80"
    style={{ width: `${progress}%` }}
    role="progressbar"
  />
);
```

`{ passive: true }` on the scroll listener tells the browser the handler will not call `preventDefault()` — this allows the browser to optimize scroll performance. The bar uses inline `style` for width instead of Tailwind because Tailwind can't generate arbitrary percentage values at runtime.

`z-[60]` places it above the sidebar (`z-30`) and modal overlays.

---

## 20. DevlogPanel

**File:** `src/components/client/DevlogPanel.tsx`

The devlog panel demonstrates the "lazy-fetch on demand" pattern:

```ts
const fetchedRef = useRef(false);  // prevents duplicate fetches

const fetchDevlogs = useCallback(async () => {
  if (fetchedRef.current) return;  // already fetched or in progress
  fetchedRef.current = true;
  setLoadState('loading');
  try {
    const result = await appwriteService.searchPostsByTag('devlog');
    setPosts(result.slice(0, 12));
    setLoadState('done');
  } catch {
    setLoadState('error');
    fetchedRef.current = false;  // allow retry on next hover
  }
}, []);

// Button event handlers
onMouseEnter={fetchDevlogs}    // prefetch on hover
onClick={() => { fetchDevlogs(); setOpen(v => !v); }}
```

`fetchedRef` is a `useRef`, not state, because it controls behavior without needing a re-render. The combination of `onMouseEnter` (start fetching when user hovers) and `onClick` (open panel) means data is usually ready by the time the panel opens.

The panel also handles Escape key and outside-click dismissal:

```ts
useEffect(() => {
  if (!open) return;
  const handler = (e: MouseEvent) => {
    if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
  };
  // setTimeout prevents the opening click from immediately closing the panel
  const id = setTimeout(() => document.addEventListener('mousedown', handler), 10);
  return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
}, [open]);
```

The `setTimeout(10)` delay is a well-known pattern — without it, the click that opens the panel would immediately propagate to `document` and trigger the outside-click handler, closing it again.

---

## 21. Image compression pipeline

**File:** `src/lib/compressImage.ts`

```ts
export async function compressImage(file: File, options = {}): Promise<File> {
  const { maxDimension = 1280, quality = 0.82, skipUnder = 100 * 1024 } = options;

  if (file.type === 'image/gif') return file;  // preserve animation
  if (file.size < skipUnder) return file;        // not worth compressing

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 1. Scale dimensions preserving aspect ratio
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) { height = Math.round(height / width * maxDimension); width = maxDimension; }
        else { width = Math.round(width / height * maxDimension); height = maxDimension; }
      }

      // 2. Draw to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';  // white bg for transparent PNG/WebP
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // 3. Encode as JPEG
      canvas.toBlob((blob) => {
        if (!blob || blob.size >= file.size) { resolve(file); return; }  // don't use if larger
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => resolve(file);  // always resolve, never reject
    img.src = URL.createObjectURL(file);
  });
}
```

Five safety conditions ensure the function always produces a usable result:
1. GIF → return original (animation would be destroyed)
2. Small file → return original (compression overhead not worth it)
3. `getContext('2d')` fails → return original (sandboxed environments)
4. Compressed size >= original → return original (JPEG can be larger for already-compressed images)
5. `img.onerror` → return original (corrupt image file)

The function wraps the callback-based Canvas API in a Promise so callers can `await` it cleanly.

---

## 22. How a post gets created end-to-end

Starting from the user clicking "Publish":

```
1. react-hook-form validates all fields
   → title required, content required, featured image required

2. Toast shows "Creating post..."

3. compressImage(imageFile)
   → Canvas API resizes to ≤1280px, encodes as JPEG 0.82 quality
   → Returns compressed File (or original if compression makes it larger)

4. storageService.uploadFile(compressed, userId)
   → Appwrite Storage: creates file with read=any(), write=user(userId)
   → Returns { $id: 'file123...' }
   → Throws AppError on failure → toast shows specific error message

5. postService.createPost({ title, content, featuredImage: 'file123', ... })
   → Appwrite DB: creates document with ID.unique()
   → Returns Post with $id
   → Throws AppError on failure → toast shows specific error message

6. Build URL slug:
   buildUrlParam(userData.name, data.title, dbPost.$id)
   → "ansuman-pal-my-first-post--abc123def456"

7. postService.updatePost({ slug: dbPost.$id, urlSlug: urlParam })
   → Writes the slug back to the document
   → .catch(() => {}) — failure is non-fatal, post still accessible via $id

8. localStorage.removeItem(DRAFT_KEY)
   → Clears the auto-saved draft

9. revalidatePost(urlParam) [server action]
   → revalidatePath('/post/ansuman-pal-my-first-post--abc123', 'layout')
   → revalidatePath('/', 'layout')
   → Next.js invalidates those cache entries immediately

10. router.push('/post/ansuman-pal-my-first-post--abc123')
    → User lands on their new post
    → Because the cache was just invalidated, the post renders fresh
```

---

## 23. How a post gets deleted end-to-end

From the admin dashboard's delete button, or the My Posts action bar:

```
1. User clicks Delete
   → "Confirm?" state (via two-tap confirm in AllPostsPage, or confirming dialog in admin)

2. adminDeletePost(postId) called

3. getPost(postId)
   → Fetch the post document BEFORE deleting it
   → We need the featuredImage ID and content to find embedded images
   → Returns null if already deleted → proceeds safely

4. deletePost(postId)
   → Appwrite DB: deleteDocument(postId)
   → Throws AppError on failure — function stops here

5. if (post.featuredImage):
   deleteFile(post.featuredImage)
   → Appwrite Storage: deleteFile(bucketId, fileId)

6. extractEmbeddedFileIds(post.content)
   → Parses Tiptap JSON, finds all image nodes
   → Extracts file IDs from Appwrite URLs: /files/{fileId}/
   → Returns string[]

7. deleteFiles(embeddedIds)
   → Promise.allSettled(embeddedIds.map(id => deleteFile(id)))
   → allSettled: one bad ID does not block the others
   → Files that are already deleted → silently ignored

8. Optimistic UI removal:
   setPosts(prev => prev.filter(p => p.$id !== postId))
   → Post disappears from the list immediately
   → toast.success('Post deleted')
```

The critical design choice: fetch the post document in step 3 **before** deleting it in step 4. Once the document is deleted, the file IDs embedded in it are gone — there's no way to know which storage files to clean up. The "fetch first, then delete" order ensures clean storage teardown.
