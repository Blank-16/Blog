'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import Button from './Button';

interface PostActionsProps {
  post: Post;
}

export default function PostActions({ post }: PostActionsProps) {
  const router = useRouter();
  const userData = useAppSelector((state) => state.auth.userData);
  const isAuthor = post && userData ? post.userId === userData.$id : false;

  if (!isAuthor) return null;

  const deletePost = async (): Promise<void> => {
    const ok = await appwriteService.deletePost(post.$id);
    if (ok) {
      await appwriteService.deleteFile(post.featuredImage);
      router.push('/');
    }
  };

  return (
    <div className="absolute right-6 top-6 flex gap-2">
      <Link href={`/edit-post/${post.$id}`}>
        <Button bgColor="bg-green-500">Edit</Button>
      </Link>
      <Button bgColor="bg-red-500" onClick={deletePost}>
        Delete
      </Button>
    </div>
  );
}
