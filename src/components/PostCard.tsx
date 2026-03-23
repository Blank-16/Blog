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
      <div className="w-full bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition-colors">
        <div className="w-full mb-4">
          {imageUrl ? (
            <img
              src={imageUrl.toString()}
              alt={title}
              className="rounded-xl w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-700 rounded-xl flex items-center justify-center">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
        {authorName && (
          <p className="text-sm text-gray-400">By: {authorName}</p>
        )}
      </div>
    </Link>
  );
}
