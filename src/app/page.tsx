import { Query } from 'appwrite';
import Link from 'next/link';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import HomeGrid from '@/components/HomeGrid';

export const revalidate = 60;

export default async function HomePage() {
  const result = await appwriteService.getPosts([Query.equal('status', 'active')]);
  const posts: Post[] = result ? result.documents : [];

  return (
    <div className="w-full">
      {/* ── Hero ── */}
      <section className="border-b border-edge gsap-fade-up">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <p className="text-xs font-medium tracking-[0.2em] uppercase mb-6 text-muted">
            Est. 2024
          </p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-none mb-8 max-w-4xl tracking-[-0.03em]">
            Ideas worth<br />
            <em>reading.</em>
          </h1>
          <p className="text-lg max-w-lg text-muted font-light">
            A place for writers to share thoughts, stories, and perspectives that matter.
          </p>
        </div>
      </section>

      {/* ── Posts ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        {posts.length === 0 ? (
          <div className="text-center py-24 gsap-fade-up">
            <p className="text-4xl mb-4 font-display">Nothing here yet.</p>
            <p className="text-muted">Be the first to publish a story.</p>
            <Link
              href="/add-post"
              className="inline-block mt-8 px-6 py-3 text-sm font-medium border border-edge text-ink rounded-full transition-opacity hover:opacity-60"
            >
              Write something →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-10 gsap-fade-up">
              <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-muted">
                Latest — {posts.length} {posts.length === 1 ? 'story' : 'stories'}
              </h2>
            </div>
            <HomeGrid posts={posts} />
          </>
        )}
      </section>
    </div>
  );
}
