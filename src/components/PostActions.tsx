'use client';

import { useState } from 'react';
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
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isAuthor) return null;

  const deletePost = async (): Promise<void> => {
    setDeleting(true);
    const ok = await appwriteService.deletePost(post.$id);
    if (ok) {
      await appwriteService.deleteFile(post.featuredImage);
      router.push('/');
    } else {
      setDeleting(false);
      setConfirming(false);
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

      {confirming ? (
        <span className="flex items-center gap-3 text-sm">
          <span className="text-muted">Delete this post?</span>
          <button
            onClick={deletePost}
            disabled={deleting}
            className="underline underline-offset-4 text-red-500 transition-opacity hover:opacity-50 disabled:opacity-40"
          >
            {deleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="underline underline-offset-4 text-muted transition-opacity hover:opacity-50"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-sm underline underline-offset-4 text-red-500 transition-opacity hover:opacity-50"
        >
          Delete post
        </button>
      )}
    </div>
  );
}
