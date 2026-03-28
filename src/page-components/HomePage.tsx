import { Query } from "appwrite";
import Link from "next/link";
import Image from "next/image";
import appwriteService, { Post } from "@/lib/appwrite/appwriteService";
import HomeGrid from "@/components/client/HomeGrid";

export const revalidate = 60;

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function extractPreview(raw?: string): string {
  if (!raw) return "";
  if (!raw.trimStart().startsWith("{")) {
    const plain = raw
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return plain.length > 180 ? plain.slice(0, 180) + "…" : plain;
  }
  try {
    const doc = JSON.parse(raw);
    if (doc?.type === "doc" && Array.isArray(doc.content)) {
      const texts: string[] = [];
      function walk(
        nodes: { type?: string; text?: string; content?: unknown[] }[],
      ) {
        for (const node of nodes) {
          if (node.type === "text" && node.text) texts.push(node.text);
          if (node.content) walk(node.content as typeof nodes);
        }
      }
      walk(doc.content);
      const plain = texts.join(" ").replace(/\s+/g, " ").trim();
      return plain.length > 180 ? plain.slice(0, 180) + "…" : plain;
    }
  } catch {
    /* fall through */
  }
  return "";
}

export default async function HomePage() {
  const result = await appwriteService.getPosts([
    Query.equal("status", "active"),
    Query.limit(7),
    Query.orderDesc("$createdAt"),
  ]);
  const posts: Post[] = result ? result.documents : [];
  const [featured, ...rest] = posts;

  return (
    <div className="w-full min-h-screen">
      {/* ── Masthead ── */}
      <section className="border-b border-edge">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-muted mb-5">
              A writing space
            </p>
            <h1 className="font-display text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.03em] text-ink">
              Ideas worth
              <br />
              <em>reading.</em>
            </h1>
          </div>
          <p className="text-sm text-muted font-light max-w-[220px] leading-relaxed md:text-right md:pb-1">
            Stories, perspectives, and thoughts from writers who care.
          </p>
        </div>
      </section>

      {posts.length === 0 ? (
        <div className="max-w-5xl mx-auto px-6 py-32 text-center">
          <p className="font-display text-3xl text-muted mb-6">
            Nothing published yet.
          </p>
          <Link
            href="/add-post"
            className="text-sm border border-edge px-5 py-2.5 rounded-full text-ink transition-opacity hover:opacity-60"
          >
            Write the first story →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Featured post ── */}
          {featured && (
            <section className="border-b border-edge">
              <Link
                href={`/post/${featured.$id}`}
                className="group block max-w-5xl mx-auto px-6 py-12 md:py-16"
              >
                <div className="md:grid md:grid-cols-[1fr_auto] md:gap-12 md:items-start">
                  <div>
                    <p className="text-[11px] tracking-[0.2em] uppercase text-muted mb-5">
                      Featured
                    </p>
                    {featured.tags && featured.tags.length > 0 && (
                      <div className="flex gap-1.5 mb-4">
                        {featured.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 border border-edge rounded-full text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 className="font-display text-[clamp(1.8rem,4vw,3rem)] leading-tight tracking-[-0.02em] mb-4 text-ink group-hover:opacity-60 transition-opacity duration-300">
                      {featured.title}
                    </h2>
                    {extractPreview(featured.content) && (
                      <p className="text-base text-muted font-light leading-relaxed max-w-xl mb-6">
                        {extractPreview(featured.content)}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted">
                      {featured.authorName && (
                        <span>{featured.authorName}</span>
                      )}
                      {featured.authorName && featured.$createdAt && (
                        <span className="opacity-30">·</span>
                      )}
                      {featured.$createdAt && (
                        <span>{formatDate(featured.$createdAt)}</span>
                      )}
                    </div>
                  </div>
                  {featured.featuredImage &&
                    (() => {
                      const url = appwriteService.getFilePreview(
                        featured.featuredImage,
                      );
                      return url ? (
                        <div className="relative mt-8 md:mt-0 md:w-64 lg:w-80 aspect-[4/3] rounded-xl overflow-hidden flex-shrink-0">
                          <Image
                            src={url.toString()}
                            alt={featured.title}
                            fill
                            priority
                            sizes="(max-width: 768px) 100vw, 320px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                      ) : null;
                    })()}
                </div>
              </Link>
            </section>
          )}

          {/* ── Remaining posts ── */}
          {rest.length > 0 && (
            <section className="max-w-5xl mx-auto px-6 py-12">
              <div className="flex items-center justify-between mb-8">
                <span className="text-[11px] tracking-[0.2em] uppercase text-muted">
                  More stories
                </span>
                <Link
                  href="/all-posts"
                  className="text-xs text-muted underline underline-offset-4 transition-opacity hover:opacity-60"
                >
                  View all →
                </Link>
              </div>
              <HomeGrid posts={rest} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
