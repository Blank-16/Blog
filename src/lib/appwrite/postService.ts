import { ID, Query, Models } from 'appwrite';
import { getDatabases } from './client';
import config from './config';
import { Post, CreatePostParams, UpdatePostParams } from './types';

export async function createPost(params: CreatePostParams): Promise<Post | null> {
  try {
    return await getDatabases().createDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      ID.unique(),
      params,
    );
  } catch (error) {
    console.error('postService :: createPost :: error', error);
    return null;
  }
}

export async function updatePost({
  slug,
  title,
  content,
  featuredImage,
  status,
  authorName,
  tags,
  urlSlug,
  metaTitle,
  metaDescription,
  focusKeyword,
  canonicalUrl,
  noIndex,
}: UpdatePostParams): Promise<Post | null> {
  try {
    const updateData: Partial<Omit<Post, keyof Models.Document>> = {
      title,
      content,
      featuredImage,
      status,
    };
    if (authorName !== undefined) updateData.authorName = authorName;
    if (tags !== undefined) updateData.tags = tags;
    if (urlSlug !== undefined) updateData.urlSlug = urlSlug;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (focusKeyword !== undefined) updateData.focusKeyword = focusKeyword;
    if (canonicalUrl !== undefined) updateData.canonicalUrl = canonicalUrl;
    if (noIndex !== undefined) updateData.noIndex = noIndex;

    return await getDatabases().updateDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      slug,
      updateData,
    );
  } catch (error) {
    console.error('postService :: updatePost :: error', error);
    return null;
  }
}

export async function deletePost(slug: string): Promise<boolean> {
  try {
    await getDatabases().deleteDocument(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      slug,
    );
    return true;
  } catch (error) {
    console.error('postService :: deletePost :: error', error);
    return false;
  }
}

export async function getPost(slug: string): Promise<Post | null> {
  try {
    return await getDatabases().getDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      slug,
    );
  } catch (error) {
    console.error('postService :: getPost :: error', error);
    return null;
  }
}

/**
 * Looks up a post from a full URL param like "john-how-to-build--abc12345".
 * Extracts the real $id from after the "--" separator, falls back to
 * treating the whole string as a raw $id for old posts without a urlSlug.
 */
export async function getPostByUrlParam(urlParam: string): Promise<Post | null> {
  const sep = urlParam.lastIndexOf('--');
  const realId = sep !== -1 ? urlParam.slice(sep + 2) : urlParam;
  return getPost(realId);
}

export async function getPosts(
  queries: string[] = [Query.equal('status', 'active')],
): Promise<Models.DocumentList<Post> | null> {
  try {
    return await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      queries,
    );
  } catch (error) {
    console.error('postService :: getPosts :: error', error);
    return null;
  }
}

export async function searchPosts(query: string): Promise<Post[]> {
  try {
    if (!query.trim()) return [];
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      [
        Query.equal('status', 'active'),
        Query.contains('title', query.trim()),
        Query.limit(20),
      ],
    );
    return result.documents;
  } catch {
    return [];
  }
}

export async function addRating(
  postId: string,
  existingRatings: number[],
  rating: number,
): Promise<Post | null> {
  try {
    return await getDatabases().updateDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      postId,
      { ratings: [...existingRatings, rating] },
    );
  } catch (error) {
    console.error('postService :: addRating :: error', error);
    return null;
  }
}

export async function addReview(
  postId: string,
  existingReviews: string[],
  review: string,
): Promise<Post | null> {
  try {
    return await getDatabases().updateDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      postId,
      { reviews: [...existingReviews, review] },
    );
  } catch (error) {
    console.error('postService :: addReview :: error', error);
    return null;
  }
}
