# High-Level Design (HLD): Blog Platform

## 1. System Overview

The Blog Platform is a high-performance, full-stack content publishing and portfolio system designed for sub-50ms global read latency, strong SEO indexing, efficient client-side media processing, and automated edge cache invalidation.

The architecture decouples the presentation tier from the backend using Next.js 15 App Router (hosted on Vercel Edge Network) and Appwrite Backend-as-a-Service (BaaS) for authentication, document storage, and object storage.

---

## 2. Requirements Engineering

### 2.1 Functional Requirements
1. **Content Authoring**: Rich text creation with Tiptap editor supporting headings, code blocks, blockquotes, inline images, and markdown imports.
2. **Media Management**: Featured and inline image uploads with automated compression and storage lifecycle cleanup.
3. **Reading Experience**: Fast post reading with reading progress tracking, reading time calculations, tag filtering, full-text search, and related post recommendations.
4. **Social & Engagement**: 1-to-5 star ratings and textual reviews with instant optimistic updates.
5. **SEO & Discovery**: Automated sitemap generation, dynamic OpenGraph/Twitter cards, JSON-LD structured data, and human-readable URL slugs.
6. **Administration**: Visual analytics dashboard (post trends, active ratios, author metrics) and user/admin role management.
7. **Developer Portfolio**: Completely isolated, zero-chrome portfolio sub-application at `/portfolio`.

### 2.2 Non-Functional Requirements
1. **Latency**: P95 read latency < 50ms globally for cached posts; P95 write latency < 500ms (excluding raw file network transfer).
2. **Availability**: 99.9% uptime for content consumption through Edge CDN shielding.
3. **Scalability**: Capable of absorbing traffic spikes (e.g. Hacker News / social trending) without origin database exhaustion.
4. **Data Integrity & Consistency**: Eventual consistency for public read caches; strong consistency for author post edits and auth sessions.
5. **Security**: Zero Stored XSS vulnerabilities; Role-Based and Discretionary Access Control on storage assets; zero exposed database credentials on client.

---

## 3. Capacity Estimation and Back-of-the-Envelope Calculations

### 3.1 Traffic Estimates
- **Daily Active Users (DAU)**: 50,000 readers
- **Read-to-Write Ratio**: 100:1
- **Read Operations per Day**: 50,000 * 5 page views = 250,000 reads/day
- **Write Operations per Day**: 2,500 writes/day (new posts, edits, ratings, reviews)
- **Queries Per Second (QPS)**:
  - Read QPS (Average): $250,000 / 86,400 \approx 2.9 \text{ QPS}$
  - Read QPS (Peak 5x): $\approx 15 \text{ QPS}$
  - Write QPS (Average): $2,500 / 86,400 \approx 0.03 \text{ QPS}$

### 3.2 Storage Estimates
- **Average Post Metadata**: ~2 KB (JSON document with title, tags, review arrays)
- **Average Post Content (Tiptap AST JSON)**: ~15 KB
- **Average Featured Image**:
  - Raw client input: ~4 MB
  - Post client-side Canvas compression: ~200 KB (85% reduction)
- **Storage per Post**: $\approx 217 \text{ KB}$
- **Annual Storage (1,000 posts/year)**: $\approx 217 \text{ MB/year}$ (negligible disk footprint due to client-side compression)

### 3.3 Bandwidth Estimates
- **Inbound Bandwidth (Writes)**: $2,500 \text{ posts} \times 220 \text{ KB} / 86,400 \approx 6.4 \text{ KB/s}$
- **Outbound Bandwidth (Reads with 90% CDN Cache Hit Ratio)**:
  - Total Bandwidth: $250,000 \times 220 \text{ KB} \approx 55 \text{ GB/day} \approx 636 \text{ KB/s}$
  - Origin Bandwidth (10% Cache Miss): $\approx 63.6 \text{ KB/s}$ (vast majority absorbed by Vercel Edge CDN)

---

## 4. High-Level Architecture Topology

```
+----------------------------------------------------------------------------------+
|                                CLIENT TIER                                       |
|                                                                                  |
|  [ Modern Browser / Mobile ]                                                     |
|    |-- React Virtual DOM Tree (Hydrated Client Components)                       |
|    |-- Redux Toolkit Store (Auth Session Singleton)                              |
|    |-- Canvas Compression Engine (compressImage.ts)                              |
|    +-- LocalStorage Draft Engine                                                 |
+----------------------------------------------------------------------------------+
                                  |
                                  | HTTPS / HTTP/2 / TLS 1.3
                                  v
+----------------------------------------------------------------------------------+
|                              EDGE / CDN TIER                                     |
|                                                                                  |
|  [ Vercel Edge Network (Global Anycast PoPs) ]                                   |
|    |-- TLS Termination & HTTP/2 Multiplexing                                     |
|    |-- Static Route Caching (SSG / Static Assets)                                |
|    |-- Full Route Cache (Hybrid ISR 24h Post Pages)                              |
|    +-- On-Demand Tag Invalidation Router                                         |
+----------------------------------------------------------------------------------+
          |                                               |
          | Cache Hit (sub-20ms)                          | Cache Miss / Dynamic / Mutation
          v                                               v
   [ Cached HTML / RSC Payload ]          +----------------------------------------+
                                          |        APPLICATION SERVER TIER         |
                                          |                                        |
                                          |  [ Next.js 15 Compute (Node.js) ]      |
                                          |    |-- React Server Components (RSC)   |
                                          |    |-- Dynamic Prerender Engine        |
                                          |    |-- Server Actions (revalidatePost) |
                                          |    +-- SEO Metadata Engine             |
                                          +----------------------------------------+
                                                              |
                                                              | HTTPS REST / SDK
                                                              v
+----------------------------------------------------------------------------------+
|                                BACKEND-AS-A-SERVICE TIER                         |
|                                                                                  |
|  [ Appwrite Cloud Instance ]                                                     |
|    |-- Authentication Service (Argon2 Hashing, JWT Sessions, RBAC)               |
|    |-- Document Database (MariaDB / InnoDB B-Tree Indexes)                       |
|    |     |-- Posts Collection                                                    |
|    |     +-- Admins Collection                                                   |
|    +-- Object Storage Service (S3-Compatible Binary Storage)                     |
|          +-- Images Bucket (Public Read / Owner Write ACL)                       |
+----------------------------------------------------------------------------------+
```

---

## 5. End-to-End Workflow & Sequence Diagrams

### 5.1 Read Workflow: Post Page Request (`/post/[slug]`)

```
User Browser             Vercel Edge CDN           Next.js Compute           Appwrite DB
     |                          |                         |                       |
     |--- 1. GET /post/slug --->|                         |                       |
     |                          |-- 2. Check Edge Cache --|                       |
     |                          |                         |                       |
     | [CASE A: Cache Hit]      |                         |                       |
     |<-- 3. Return HTML/RSC ---|                         |                       |
     |                          |                         |                       |
     | [CASE B: Cache Miss]     |                         |                       |
     |                          |--- 4. Forward Request ->|                       |
     |                          |                         |-- 5. Extract docId -->|
     |                          |                         |   from slug (O(1))    |
     |                          |                         |-- 6. getDocument() -->|
     |                          |                         |<-- 7. Document JSON --|
     |                          |                         |-- 8. Render to HTML   |
     |                          |                         |   via isomorphic-     |
     |                          |                         |   dompurify           |
     |                          |<-- 9. Stream HTML + ----|                       |
     |                          |       Set Cache Headers |                       |
     |                          |-- 10. Store in Cache ---|                       |
     |<-- 11. Return Response --|                         |                       |
     |                          |                         |                       |
     |-- 12. Hydrate Client --->|                         |                       |
     |-- 13. Fire View Count --------------------------------------> async ------>|
```

### 5.2 Write Workflow: Post Creation and Publication (`/add-post`)

```
Author Browser             Appwrite Storage         Appwrite DB          Next.js Server Action
     |                             |                     |                         |
     |-- 1. Select Raw Image (5MB) |                     |                         |
     |-- 2. Canvas Compress ------>|                     |                         |
     |      (Downsample to 200KB)  |                     |                         |
     |                             |                     |                         |
     |-- 3. uploadFile(blob) ----->|                     |                         |
     |      (With Owner ACL)       |                     |                         |
     |<-- 4. File Metadata (ID) ---|                     |                         |
     |                                                   |                         |
     |-- 5. Generate Slug: author-title--id              |                         |
     |-- 6. createDocument(postData) ------------------->|                         |
     |<-- 7. Confirmed Document -------------------------|                         |
     |                                                                             |
     |-- 8. Invoke Server Action: revalidatePost(slug) --------------------------->|
     |                                                                             |-- 9. revalidatePath('/post/slug', 'layout')
     |                                                                             |-- 10. Purge Edge Cache Tag
     |<-- 11. Revalidation Complete -----------------------------------------------|
     |                                                   
     |-- 12. Router push to /post/slug (Immediate fresh render)
```

### 5.3 Post Update and Orphaned Asset Deletion Workflow

```
Author Browser               Appwrite Storage                  Appwrite DB
     |                               |                              |
     |-- 1. Edit Post in Editor      |                              |
     |-- 2. Extract embedded IDs     |                              |
     |      Old: [ID_1, ID_2, ID_3]  |                              |
     |      New: [ID_1, ID_3]        |                              |
     |-- 3. Diff: Removed = [ID_2]   |                              |
     |                               |                              |
     |-- 4. deleteFiles([ID_2]) ---->|                              |
     |      (Promise.allSettled)     |                              |
     |<-- 5. Deletion Acknowledged --|                              |
     |                                                              |
     |-- 6. updateDocument(diffData) ------------------------------>|
     |<-- 7. Document Updated --------------------------------------|
```

---

## 6. Data Architecture and Schema Design

### 6.1 Database Schema (Posts Collection)

| Attribute | Data Type | Size / Constraint | Index Type | Description |
|---|---|---|---|---|
| `$id` | String | 36 chars (UUID) | Primary (B-Tree) | Unique document identifier |
| `title` | String | 255 chars | Full-Text | Searchable post title |
| `content` | String | 1,000,000 chars | None | Serialized Tiptap AST JSON |
| `featuredImage`| String | 36 chars | None | Storage file reference |
| `userId` | String | 36 chars | Key Index | Author user identifier |
| `authorName` | String | 100 chars | None | Denormalized author display name |
| `status` | String | Enum ("active", "inactive") | Key Index | Post publication status |
| `tags` | Array[String]| Max 10 tags | Array Index | Multi-value tag index |
| `urlSlug` | String | 255 chars | None | Deterministic SEO slug prefix |
| `ratings` | Array[Int] | 0-5 values | None | Embedded ratings array |
| `reviews` | Array[String]| "Author\|\|\|Text" | None | Embedded reviews array |
| `views` | Integer | Default 0 | Key Index | Post view counter metric |
| `$createdAt` | Datetime | ISO 8601 | Key Index (Desc) | Publication timestamp for pagination |

### 6.2 Indexing Rationale
1. **`$createdAt (DESC)` + `$id`**: Powers cursor-based pagination. Guarantees stable ordering and zero drift during concurrent writes.
2. **`status` + `tags`**: Enables instant tag filtering on active posts (`Query.equal('status', 'active')`, `Query.contains('tags', tag)`).
3. **`title` Full-Text Search**: Supports sub-string and lexical matching across post titles without scanning content blocks.

---

## 7. Security and Access Control Architecture

1. **Storage Access Policies (Discretionary Access Control)**:
   - Read Access: `Role.any()` (publicly accessible via CDN URL).
   - Write/Delete Access: `Role.user(userId)` (enforced at the storage layer; users cannot delete or overwrite other users' files).
2. **Database Permissions**:
   - Post Creation: Restricted to authenticated users with active sessions.
   - Post Update/Delete: Application and database guard verify `post.userId === currentUser.$id` or `currentUser.isAdmin === true`.
3. **XSS Mitigation Architecture**:
   - Editor stores semantic AST tokens, not HTML.
   - HTML generation passes through `isomorphic-dompurify` with a strict whitelist of tags and attributes before mounting to the DOM.
4. **Denial of Service / Rate Limiting**:
   - Client-side hook `usePostLimits.ts` enforces 1 post/day and 5 posts/week limits for non-admin accounts.
   - Network requests for search are debounced to 300ms.

---

## 8. Scalability, Resilience, and Failure Scenarios

### 8.1 CDN Shielding Under High Concurrency
When a post goes viral:
- First visitor triggers an on-demand ISR build (~300ms).
- Subsequent 100,000 visitors are served directly from the Vercel Edge cache in < 20ms.
- Appwrite database experiences zero additional query load.

### 8.2 Origin Outage Graceful Degradation
- If Appwrite Cloud becomes temporarily unavailable:
  - Cached post pages remain fully functional and readable on Edge CDN.
  - Client component `AppwriteDownBanner.tsx` catches network exceptions and presents a clean operational notice rather than a blank white screen.
  - `PostContentBoundary.tsx` catches corrupted AST parsing errors and displays a fallback card without crashing the root page layout.
