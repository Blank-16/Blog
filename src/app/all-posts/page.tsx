'use client';

import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Container from '@/components/Container';
import PostCard from '@/components/PostCard';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';

function AllPostsContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    appwriteService
      .getPosts([])
      .then((result) => {
        if (result) setPosts(result.documents);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full py-8 text-center">
        <Container>
          <h1 className="text-2xl font-bold text-gray-300">Loading posts...</h1>
        </Container>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="w-full py-8 text-center">
        <Container>
          <h1 className="text-2xl font-bold text-gray-300">No posts found</h1>
          <p className="text-gray-500 mt-2">Be the first to create a post!</p>
        </Container>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      <Container>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-300 mb-2">All Posts</h1>
          <p className="text-gray-500">Showing every post from all authors</p>
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

export default function AllPostsPage() {
  return (
    <AuthGuard authentication={true}>
      <AllPostsContent />
    </AuthGuard>
  );
}
