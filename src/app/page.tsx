import { Query } from 'appwrite';
import Container from '@/components/Container';
import PostCard from '@/components/PostCard';
import appwriteService from '@/lib/appwrite/appwriteService';

export const revalidate = 60;

export default async function HomePage() {
  const result = await appwriteService.getPosts([Query.equal('status', 'active')]);
  const posts = result ? result.documents : [];

  if (posts.length === 0) {
    return (
      <div className="w-full py-8 mt-4 text-center">
        <Container>
          <h1 className="text-2xl font-bold text-gray-300">No posts found</h1>
          <p className="text-gray-500 mt-2">There are no active posts yet.</p>
        </Container>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <Container>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-300 mb-2">Latest Posts</h1>
          <p className="text-gray-500">Showing all active posts</p>
        </div>
        <div className="flex flex-wrap">
          {posts.map((post) => (
            <div key={post.$id} className="p-2 w-full sm:w-1/2 lg:w-1/4">
              <PostCard {...post} />
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
