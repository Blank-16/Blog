'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import { extractEmbeddedFileIds } from '@/lib/utils';

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

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);

    const deleted = await appwriteService.deletePost(post.$id);
    if (!deleted) {
      setDeleting(false);
      setConfirming(false);
      return;
    }

    // Delete featured image
    if (post.featuredImage) {
      await appwriteService.deleteFile(post.featuredImage);
    }

    // Delete any images embedded inside the content body
    const embeddedIds = extractEmbeddedFileIds(post.content);
    if (embeddedIds.length > 0) {
      await appwriteService.deleteFiles(embeddedIds);
    }

    router.push('/');
  };

  return (
    <div className="flex items-center gap-4">
      <Link
        href={`/edit-post/${post.$id}`}
        className="text-sm underline underline-offset-4 text-ink transition-opacity hover:opacity-50"
      >
        Edit post
      </Link>
      <span className="text-edge">&middot;</span>

      {confirming ? (
        <span className="flex items-center gap-3 text-sm">
          <span className="text-muted">Delete this post?</span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="underline underline-offset-4 text-red-500 transition-opacity hover:opacity-50 disabled:opacity-40"
          >
            {deleting ? 'Deleting...' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="underline underline-offset-4 text-muted transition-opacity hover:opacity-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
