# Blogging Web — Next.js

Refactored from React + Vite to **Next.js 15 App Router**.

## Stack

| Layer | Original | New |
|---|---|---|
| Framework | React + Vite | **Next.js 15 (App Router)** |
| Routing | react-router-dom | **Next.js file-based routing** |
| Navigation | `useNavigate` / `<Link>` from RRD | `useRouter` / `<Link>` from next/navigation |
| Rendering | 100% CSR | **SSR / ISR** for public pages, CSR for auth-gated pages |
| Env vars | `VITE_*` | **`NEXT_PUBLIC_*`** |
| Rich text | Quill (static import) | Quill (dynamic import to avoid SSR crash) |

## Getting started

```bash
npm install
cp .env.local.sample .env.local
# fill in your Appwrite credentials
npm run dev
```

## Project structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.jsx              # Root layout (Header, Footer, Redux Provider)
│   ├── page.jsx                # Home — SSR/ISR, public
│   ├── login/page.jsx
│   ├── signup/page.jsx
│   ├── all-posts/page.jsx      # Auth-gated, CSR
│   ├── add-post/page.jsx       # Auth-gated
│   ├── edit-post/[slug]/page.jsx
│   ├── post/[slug]/page.jsx    # SSR, public
│   └── not-found.jsx
├── components/
│   ├── AuthGuard.jsx           # Replaces old <AuthLayout>
│   ├── AuthInitializer.jsx     # Replaces useEffect in old App.jsx
│   ├── PostActions.jsx         # Client island for edit/delete on post page
│   ├── PostForm.jsx
│   ├── PostCard.jsx
│   ├── RTE.jsx                 # Quill (dynamic import, SSR-safe)
│   ├── LoginForm.jsx
│   ├── SignupForm.jsx
│   ├── Header.jsx
│   ├── Footer.jsx
│   ├── LogoutBtn.jsx
│   ├── Container.jsx
│   ├── Button.jsx
│   ├── Input.jsx
│   └── Select.jsx
├── lib/appwrite/
│   ├── config.js               # NEXT_PUBLIC_ env vars
│   ├── auth.js                 # AuthService (unchanged logic)
│   └── appwriteService.js      # DB + Storage service (unchanged logic)
└── store/
    ├── store.js
    ├── authSlice.js
    └── StoreProvider.jsx       # 'use client' Redux Provider wrapper
```

## Key migration notes

### 1. `'use client'` directive
Any component that uses hooks (`useState`, `useEffect`, `useSelector`, `useRouter`, etc.)
must have `'use client'` at the top. Server components cannot use these.

### 2. Env variable prefix
All `VITE_*` variables must be renamed to `NEXT_PUBLIC_*` in `.env.local`.

### 3. Routing
| Old (react-router-dom) | New (Next.js) |
|---|---|
| `<Link to="/path">` | `<Link href="/path">` |
| `useNavigate()` → `navigate('/path')` | `useRouter()` → `router.push('/path')` |
| `useParams()` | `useParams()` from `next/navigation` |

### 4. Auth session initialisation
The old `App.jsx` had a `useEffect` that checked Appwrite on mount.
This is now `<AuthInitializer />` — an invisible client component in `layout.jsx`.

### 5. Quill / SSR
Quill accesses `document` on import. In Next.js this crashes SSR.
`RTE.jsx` now uses a **dynamic import inside `useEffect`** so Quill only loads in the browser.

### 6. Post detail page (Server Component + Client Island)
`/post/[slug]/page.jsx` is a **Server Component** that fetches and renders the post.
Edit/Delete buttons live in `<PostActions>` — a small **Client Component** — so they can
read Redux state to check authorship without making the whole page a client component.





Here's the full list of improvements made after refactoring 

**Framework & Architecture**

- Migrated from React + Vite (pure CSR) to Next.js 15 App Router, enabling SSR and ISR on public pages
- Home page and post detail page are now Server Components — they fetch data on the server before sending HTML to the browser, improving initial load and SEO
- Post detail page uses a "Server Component + Client Island" pattern: the page itself is a server component, but `<PostActions>` is a small client component that reads Redux auth state to show/hide edit and delete buttons — no unnecessary client bundle on the full page
- File-based routing replaces the manual `createBrowserRouter` config in `main.jsx`

**Auth & Session**

- The `useEffect` session check that lived in `App.jsx` is now an invisible `<AuthInitializer>` component that sits in the root layout — same behaviour, but correctly separated from routing concerns
- `<AuthLayout>` (old Protected component) replaced by `<AuthGuard>` using `useRouter` from `next/navigation` and `router.replace()` instead of react-router's `navigate()`
- `LogoutBtn` now calls `router.push('/')` after dispatching logout, fixing the case where the old component didn't navigate after logout

**TypeScript**

- Every file converted from `.js`/`.jsx` to `.ts`/`.tsx` — zero JavaScript remains in `src/`
- `tsconfig.json` added with `strict: true`
- `Post` interface typed as `extends Models.Document` so all Appwrite document fields (`$id`, `$createdAt`, etc.) are available with full autocomplete
- `AuthState`, `LoginPayload`, and `PayloadAction<LoginPayload>` added to the Redux slice
- `RootState` and `AppDispatch` exported from `store.ts`
- New `src/store/hooks.ts` file with `useAppSelector` and `useAppDispatch` typed wrappers — all components use these instead of raw `useSelector`/`useDispatch`
- All form components use `useForm<FormValues>` and `SubmitHandler<FormValues>` generics
- UI primitives (`Button`, `Input`, `Select`) extend the correct HTML element attribute interfaces (`ButtonHTMLAttributes`, `InputHTMLAttributes`, `SelectHTMLAttributes`) so all native props are accepted without extra declarations
- `forwardRef` calls in `Input` and `Select` are properly typed with element and props generics
- Error handling uses `err instanceof Error` instead of untyped `catch (error)` with `.message`

**Environment Variables**

- All `VITE_*` env vars renamed to `NEXT_PUBLIC_*` as required by Next.js
- `config.ts` uses `?? ''` nullish coalescing instead of `String(import.meta.env.*)` — safer and TS-friendly

**Quill / RTE**

- Quill is now dynamically imported inside `useEffect` instead of a static top-level import — this prevents the SSR crash caused by Quill accessing `document` at import time

**Code Quality**

- Removed the `window.alert("Submitted")` call from PostForm's submit button
- `AllPosts` page fixed — the original had `appwriteService.getPosts([])` called directly in the component body on every render (not inside `useEffect`), causing an infinite fetch loop; now correctly inside `useEffect`
- `authSlice.ts` had a stray unused `import { act } from 'react'` — removed
- `AppwriteService` and `AuthService` class fields are now `private` instead of public
- Appwrite image URLs are safely cast with `.toString()` before being passed to `src` attributes, since `getFileView` returns a `URL` object