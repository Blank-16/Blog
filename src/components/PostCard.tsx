import Link from 'next/link';
import appwriteService from '@/lib/appwrite/appwriteService';

interface PostCardProps {
  $id: string;
  title: string;
  featuredImage?: string;
  authorName?: string;
}

export default function PostCard({ $id, title, featuredImage, authorName }: PostCardProps) {
  const imageUrl = featuredImage ? appwriteService.getFilePreview(featuredImage) : null;

  return (
    <Link href={`/post/${$id}`}>
      <div className="w-full rounded-xl p-4 transition-colors
        bg-white border border-gray-200 hover:bg-gray-50
        dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
        <div className="w-full mb-4">
          {imageUrl ? (
            <img
              src={imageUrl.toString()}
              alt={title}
              className="rounded-xl w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 rounded-xl flex items-center justify-center
              bg-gray-100 dark:bg-gray-700">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h2>
        {authorName && (
          <p className="text-sm text-gray-500 dark:text-gray-400">By: {authorName}</p>
        )}
      </div>
    </Link>
  );
}
