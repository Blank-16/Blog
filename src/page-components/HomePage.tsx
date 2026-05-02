import { Query } from "appwrite";
import appwriteService, { Post } from "@/lib/appwrite/appwriteService";
import MoreStories from "@/components/client/MoreStories";
import FeaturedPost from "@/components/client/FeaturedPost";
import Link from "next/link";

export const revalidate = 60;

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
      {/* Masthead */}
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
            Write the first story &rarr;
          </Link>
        </div>
      ) : (
        <>
          {/* Featured post */}
          {featured && <FeaturedPost post={featured} />}

          {/* Remaining posts — infinite scroll */}
          <MoreStories initialPosts={rest} />
        </>
      )}
    </div>
  );
}
