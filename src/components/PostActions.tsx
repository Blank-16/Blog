'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';

interface PostActionsProps {
  post: Post;
}

export default function PostActions({ post }: PostActionsProps) {
  const router = useRouter();
  const userData = useAppSelector((state) => state.auth.userData);
  const isAuthor = post && userData ? post.userId === userData.$id : false;

  if (!isAuthor) return null;

  const deletePost = async (): Promise<void> => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const ok = await appwriteService.deletePost(post.$id);
    if (ok) {
      await appwriteService.deleteFile(post.featuredImage);
      router.push('/');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Link
        href={`/edit-post/${post.$id}`}
        className="text-sm underline underline-offset-4 text-ink transition-opacity hover:opacity-50"
      >
        Edit post
      </Link>
      <span className="text-edge">·</span>
      <button
        onClick={deletePost}
        className="text-sm underline underline-offset-4 text-red-500 transition-opacity hover:opacity-50"
      >
        Delete post
      </button>
    </div>
  );
}
