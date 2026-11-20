# Low-Level Design (LLD): Blog Platform

## 1. Class and Module Architecture

### 1.1 Structural Service Layer Diagram

```
+---------------------------------------------------------------------------------+
|                                APPLICATION SERVICES                             |
+---------------------------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
         v                            v                            v
+------------------+         +------------------+         +------------------+
|   authService    |         |   postService    |         |  storageService  |
|------------------|         |------------------|         |------------------|
| + createAccount  |         | + createPost     |         | + uploadFile     |
| + login          |         | + updatePost     |         | + deleteFile     |
| + logout         |         | + deletePost     |         | + deleteFiles    |
| + getCurrentUser |         | + getPostById    |         | + getFilePreview |
| + updateProfile  |         | + getPostBySlug  |         +------------------+
+------------------+         | + searchPosts    |                  |
         |                   | + listPosts      |                  |
         |                   | + addRating...   |                  |
         |                   +------------------+                  |
         |                            |                            |
         +----------------------------+----------------------------+
                                      |
                                      v
+---------------------------------------------------------------------------------+
|                               CLIENT SINGLETONS                                 |
|                                                                                 |
|  [ src/lib/appwrite/client.ts ]                                                 |
|  + getClient(): Client                                                          |
|  + getAccount(): Account                                                        |
|  + getDatabases(): Databases                                                    |
|  + getStorage(): Storage                                                        |
+---------------------------------------------------------------------------------+
                                      |
                                      v
                         [ Appwrite Cloud SDK ]
```

### 1.2 Design Patterns Implemented

#### 1. Singleton Pattern (`src/lib/appwrite/client.ts`)
Ensures only one instance of the Appwrite `Client`, `Account`, `Databases`, and `Storage` SDK controllers is instantiated per browser context, reusing existing TCP connections and session headers.

```ts
let client: Client | null = null;
let account: Account | null = null;
let databases: Databases | null = null;
let storage: Storage | null = null;

export function getClient(): Client {
  if (!client) {
    client = new Client()
      .setEndpoint(config.appwriteUrl)
      .setProject(config.appwriteProjectId);
  }
  return client;
}

export function getAccount(): Account {
  if (!account) account = new Account(getClient());
  return account;
}
```

#### 2. Service Layer / Repository Pattern (`src/lib/appwrite/`)
Encapsulates all Appwrite SDK calls behind clean TypeScript functions. UI components never import the Appwrite SDK directly; they only interact with typed domain services (`postService`, `authService`, `storageService`). This allows swapping out the backend with minimal impact on UI components.

#### 3. Command / Server Action Pattern (`src/app/actions/revalidatePost.ts`)
Encapsulates cache invalidation operations into server-executed RPC functions triggered on demand by clients without configuring custom REST route handlers.

#### 4. Composite Pattern (Tiptap Document Model)
Represents rich text as a hierarchical Abstract Syntax Tree (AST) where both container nodes (`doc`, `heading`, `paragraph`) and leaf nodes (`text`, `image`) implement a uniform tree interface.

#### 5. Observer Pattern (Redux Toolkit)
Auth state changes trigger notifications to all subscribed React components through `useAppSelector` with referential equality checks to eliminate unnecessary re-renders.

---

## 2. Component Hierarchy and Boundary Architecture

```
src/app/layout.tsx (Server Component Shell)
  |-- StoreProvider (Client Redux Provider)
  |-- AuthInitializer (Client Auth Session Bootstrapper)
  |-- BlogChrome (Client Layout Controller based on usePathname)
  |     |-- Header (Client Nav, Auth Status, ThemeToggle)
  |     +-- DevlogPanel (Floating lazy-loaded drawer)
  |
  +-- MainContent (Client Container adding margin offsets)
        |
        +-- [ROUTE LEVEL COMPONENTS]
              |-- page-components/HomePage.tsx (Async Server Component)
              |     |-- FeaturedPost (Interactive Preview Card)
              |     +-- HomeGrid (Cursor-paginated post grid)
              |
              |-- page-components/PostPage.tsx (Async Server Component)
              |     |-- PostContent (Isomorphic HTML sanitizer and viewer)
              |     |-- ReadingProgress (Scroll listener progress bar)
              |     |-- ViewCounter (Detached async analytics beacon)
              |     +-- RatingsSection (Optimistic UI ratings controller)
              |
              |-- page-components/AddPostPage.tsx / EditPostPage.tsx (Client Components)
              |     |-- AuthGuard (Route level authentication barrier)
              |     |-- PostForm (React Hook Form controller)
              |     |     |-- RTE (Tiptap editor container)
              |     |     |-- SeoPanel (Metadata inputs)
              |     |     +-- Drag-and-drop Image Uploader
              |
              +-- app/portfolio/layout.tsx & page.tsx (Isolated Route Subtree)
                    |-- LiveClock (Client IST time ticker)
                    +-- Clean layout without BlogChrome or Header
```

---

## 3. Algorithmic Specifications and Core Logic

### 3.1 Algorithm 1: Client-Side Image Downsampling and Aspect Ratio Quantization

**File**: `src/lib/compressImage.ts`

#### Mathematical Specification
Given an input image with original width $W_{0}$ and original height $H_{0}$, and a maximum allowable dimension $D_{\max} = 1280$:

1. If $W_{0} \le D_{\max}$ and $H_{0} \le D_{\max}$, dimensions remain unchanged:
$$W' = W_{0}, \quad H' = H_{0}$$

2. If $W_{0} \ge H_{0}$ (landscape or square):
$$W' = D_{\max}, \quad H' = \operatorname{round}\left(H_{0} \times \frac{D_{\max}}{W_{0}}\right)$$

3. If $H_{0} > W_{0}$ (portrait):
$$H' = D_{\max}, \quad W' = \operatorname{round}\left(W_{0} \times \frac{D_{\max}}{H_{0}}\right)$$

#### Step-by-Step Execution Workflow
```
Input File (File object)
    |
    v
Check: Is type === "image/gif"? ---> YES ---> Return File unchanged (Preserve animation)
    | NO
Check: Is size < 100 KB? ----------> YES ---> Return File unchanged (Skip low-yield cost)
    | NO
Generate Object URL via URL.createObjectURL(file)
Load into HTMLImageElement (img.onload)
    |
    v
Invoke URL.revokeObjectURL(objectUrl) [Prevent V8 heap memory leak]
Compute new dimensions (W', H') via aspect ratio equations
Create HTML5 Canvas element: canvas.width = W', canvas.height = H'
Get 2D rendering context (ctx)
    |
    v
Fill background with #FFFFFF [Eliminates black transparency artifact in JPEG]
Draw image: ctx.drawImage(img, 0, 0, W', H')
Export to Blob: canvas.toBlob(callback, 'image/jpeg', 0.82)
    |
    v
Check: Is compressedSize >= originalSize? ---> YES ---> Return original File
    | NO
Wrap Blob in File object and return
```

- **Time Complexity**: $O(W' \times H')$ pixel interpolation operations handled by hardware-accelerated 2D canvas context.
- **Space Complexity**: $O(W' \times H' \times 4 \text{ bytes})$ in canvas frame buffer memory, immediately collected on canvas dereference.

---

### 3.2 Algorithm 2: AST Depth-First Search for Text and Asset Extraction

**File**: `src/lib/utils.ts`

#### Mathematical Specification
Let $T$ be an n-ary Rose Tree where each node $u \in T$ has a type $\tau(u)$ and an ordered list of children $C(u) = [v_1, v_2, \dots, v_k]$.

```
Algorithm DFS_CollectText(u):
  out <- []
  if u.type == "text" and u.text is defined:
    out.append(u.text)
  if u.content is defined:
    for each child v in u.content:
      out.extend(DFS_CollectText(v))
  return out
```

#### Reading Time Calculation
Given the collected words list $W$:
$$\text{TotalWords} = |W|$$
$$\text{ReadingTimeInMinutes} = \max\left(1, \left\lceil \frac{\text{TotalWords}}{200} \right\rceil\right)$$
Where 200 words per minute represents the standard adult reading speed.

- **Time Complexity**: $O(|V|)$ where $|V|$ is the total number of nodes in the AST document.
- **Space Complexity**: $O(H)$ where $H$ is the maximum tree depth, representing call stack frames.

---

### 3.3 Algorithm 3: Set Difference for Orphaned Asset Garbage Collection

**Files**: `src/lib/utils.ts` (`extractEmbeddedFileIds`), `src/components/client/PostForm.tsx`

#### Mathematical Specification
Let $S_{\text{initial}}$ be the set of Appwrite storage file IDs embedded in the original post AST, and $S_{\text{current}}$ be the set of IDs in the edited AST.

The set of orphaned files to delete is:
$$S_{\text{delete}} = S_{\text{initial}} \setminus S_{\text{current}} = \{ x \in S_{\text{initial}} \mid x \notin S_{\text{current}} \}$$

#### Implementation
```ts
const initialIds = new Set(extractEmbeddedFileIds(initialContent));
const currentIds = new Set(extractEmbeddedFileIds(currentContent));

const idsToDelete: string[] = [];
for (const id of initialIds) {
  if (!currentIds.has(id)) {
    idsToDelete.push(id);
  }
}

// Concurrently delete without fail-fast abortion
await deleteFiles(idsToDelete);
```

- **Time Complexity**: $O(|S_{\text{initial}}| + |S_{\text{current}}|)$ using hash set lookups.
- **Space Complexity**: $O(|S_{\text{initial}}| + |S_{\text{current}}|)$ for storing sets in memory.

---

### 3.4 Algorithm 4: Cursor-Based Pagination Traversal

**File**: `src/lib/appwrite/postService.ts`

```ts
export async function fetchAllPostsPaginated(
  baseQueries: string[] = []
): Promise<Post[]> {
  const all: Post[] = [];
  let cursor: string | null = null;
  const PAGE = 100;

  while (true) {
    const queries = [
      ...baseQueries,
      Query.orderDesc('$createdAt'),
      Query.limit(PAGE),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      queries,
    );
    
    all.push(...result.documents);
    if (result.documents.length < PAGE) break;
    cursor = result.documents[result.documents.length - 1].$id;
  }

  return all;
}
```

- **Time Complexity**: $O(M / \text{PAGE} \times \log N)$ where $M$ is total matched rows and $N$ is total database rows. Each step performs a direct B-Tree index seek using the cursor rather than scanning offset rows.
- **Space Complexity**: $O(M)$ array accumulation buffer.

---

### 3.5 Algorithm 5: Debounced Event Throttling Closure

**File**: `src/page-components/SearchPage.tsx`

```ts
useEffect(() => {
  if (!query.trim()) {
    setResults([]);
    return;
  }

  const timer = setTimeout(() => {
    executeSearch(query);
  }, 300);

  return () => clearTimeout(timer);
}, [query]);
```

- **Invariants**:
  1. No search request is dispatched while keystrokes arrive with inter-arrival time $\Delta t < 300\text{ms}$.
  2. Cleaning up via `clearTimeout(timer)` guarantees that unexecuted timers in previous render frames are canceled, preventing out-of-order race conditions.

---

### 3.6 Algorithm 6: Optimistic UI with Transactional Rollback

**File**: `src/components/client/RatingsSection.tsx`

```ts
const handleSubmit = async () => {
  // 1. Capture snapshot of local state
  const prevRatings = ratings;
  const prevReviews = reviews;

  // 2. Optimistic local mutation
  const encoded = `${userData.name}|||${reviewText.trim()}`;
  setRatings([...ratings, starValue]);
  setReviews([...reviews, encoded]);
  setStarValue(0);
  setReviewText("");

  try {
    // 3. Network write
    const updated = await appwriteService.addRatingAndReview(
      post.$id,
      ratings,
      reviews,
      starValue,
      encoded,
    );
    // 4. Reconcile with authoritative server state
    setRatings(updated.ratings ?? [...ratings, starValue]);
    setReviews(updated.reviews ?? [...reviews, encoded]);
  } catch (err: unknown) {
    // 5. Transactional Rollback
    setRatings(prevRatings);
    setReviews(prevReviews);
    setError(getErrorMessage(err));
  }
};
```

- **State Transition Machine**:
  - `IDLE` -> `OPTIMISTIC_COMMIT` (immediate) -> `SERVER_ACK` -> `STABLE`
  - `IDLE` -> `OPTIMISTIC_COMMIT` (immediate) -> `SERVER_ERR` -> `ROLLBACK_RESTORE` -> `IDLE`

---

## 4. Complete Data Contracts and Type Definitions

### 4.1 Post Model Interface (`src/lib/appwrite/types.ts`)

```ts
import { Models } from 'appwrite';

export interface Post extends Models.Document {
  title: string;
  content: string;
  featuredImage: string;
  status: 'active' | 'inactive';
  userId: string;
  authorName?: string;
  tags?: string[];
  urlSlug?: string;
  ratings?: number[];
  reviews?: string[];
  views?: number;
}

export interface CreatePostParams {
  title: string;
  content: string;
  featuredImage: string;
  status: 'active' | 'inactive';
  userId: string;
  authorName?: string;
  tags?: string[];
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface UpdatePostParams {
  slug: string; // Document ID
  title: string;
  content: string;
  featuredImage: string;
  status: 'active' | 'inactive';
  authorName?: string;
  tags?: string[];
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}
```

### 4.2 Portfolio Data Contract (`src/app/portfolio/data.ts`)

```ts
export type Project = {
  id: string;
  title: string;
  description: string;
  challenge?: string;
  solution?: string;
  tags: string[];
  image: string;
  liveUrl?: string;
  repoUrl?: string;
  featured: boolean;
  year: number;
};

export type CoreSkill = {
  name: string;
  proof: string;
};

export type SkillGroup = {
  context: 'primary' | 'secondary' | 'familiar';
  items: string[];
};
```

---

## 5. Error Taxonomy and Resilience Architecture

### 5.1 Custom `AppError` Class (`src/lib/errors.ts`)

The project wraps raw Appwrite SDK errors into a unified domain error type:

```ts
export class AppError extends Error {
  code: number;
  type: string;

  constructor(error: unknown) {
    if (error instanceof AppwriteException) {
      super(getAppwriteErrorMessage(error));
      this.code = error.code;
      this.type = error.type;
    } else if (error instanceof Error) {
      super(error.message);
      this.code = 500;
      this.type = 'general_error';
    } else {
      super('An unexpected error occurred');
      this.code = 500;
      this.type = 'unknown_error';
    }
    this.name = 'AppError';
  }
}
```

#### Error Code Mapping Strategy
- `401 / user_unauthorized`: Prompts session renewal or redirects to `/login`.
- `404 / document_not_found`: Triggers Next.js `notFound()` boundary.
- `409 / user_already_exists`: Form validation warning on `/signup`.
- `429 / rate_limit_exceeded`: Backoff toast warning asking user to wait before retrying.

### 5.2 React Error Boundaries (`PostContentBoundary.tsx`)
Catches any parsing failures in corrupt Tiptap JSON or malformed HTML during render time without allowing errors to propagate up to the root React tree.
```tsx
export class PostContentBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-surface border border-edge text-muted text-sm">
          Content preview unavailable.
        </div>
      );
    }
    return this.props.children;
  }
}
```
