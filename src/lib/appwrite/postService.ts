import { ID, Query, Models } from 'appwrite';
import { getDatabases } from './client';
import config from './config';
import { Post, CreatePostParams, UpdatePostParams } from './types';
import { AppError, logServiceError } from '../errors';

export async function createPost(params: CreatePostParams): Promise<Post> {
  try {
    return await getDatabases().createDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      ID.unique(),
      params,
    );
  } catch (error) {
    logServiceError('postService::createPost', error);
    throw new AppError(error);
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
}: UpdatePostParams): Promise<Post> {
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
    logServiceError('postService::updatePost', error);
    throw new AppError(error);
  }
}

export async function deletePost(slug: string): Promise<void> {
  try {
    await getDatabases().deleteDocument(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      slug,
    );
  } catch (error) {
    logServiceError('postService::deletePost', error);
    throw new AppError(error);
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
    const appErr = new AppError(error);
    if (appErr.isNotFound) return null;
    logServiceError('postService::getPost', error);
    return null;
  }
}

export async function getPostByUrlParam(urlParam: string): Promise<Post | null> {
  const sep = urlParam.lastIndexOf('--');
  const realId = sep !== -1 ? urlParam.slice(sep + 2) : urlParam;
  return getPost(realId);
}

export async function incrementPostViews(postId: string): Promise<void> {
  try {
    const post = await getPost(postId);
    if (!post) return;
    await getDatabases().updateDocument(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      postId,
      { views: (post.views ?? 0) + 1 },
    );
  } catch (error) {
    logServiceError('postService::incrementPostViews', error);
  }
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
    logServiceError('postService::getPosts', error);
    return null;
  }
}

/**
 * Fetches ALL posts matching baseQueries by walking through cursor pages.
 */
export async function fetchAllPostsPaginated(
  baseQueries: string[] = [],
): Promise<Post[]> {
  const PAGE = 100;
  const all: Post[] = [];
  let cursor: string | undefined;

  while (true) {
    const queries = [
      ...baseQueries,
      Query.orderDesc('$createdAt'),
      Query.limit(PAGE),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    try {
      const result = await getDatabases().listDocuments<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        queries,
      );
      all.push(...result.documents);
      if (result.documents.length < PAGE) break;
      cursor = result.documents[result.documents.length - 1].$id;
    } catch (error) {
      logServiceError('postService::fetchAllPostsPaginated', error);
      break;
    }
  }

  return all;
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  return fetchAllPostsPaginated([Query.equal('userId', userId)]);
}

export async function searchPosts(query: string): Promise<Post[]> {
  if (!query.trim()) return [];
  try {
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
  } catch (error) {
    logServiceError('postService::searchPosts', error);
    throw new AppError(error);
  }
}

export async function searchPostsByTag(tag: string): Promise<Post[]> {
  if (!tag.trim()) return [];
  try {
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      [
        Query.equal('status', 'active'),
        Query.contains('tags', tag.trim()),
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ],
    );
    return result.documents;
  } catch (error) {
    logServiceError('postService::searchPostsByTag', error);
    throw new AppError(error);
  }
}

export async function addRatingAndReview(
  postId: string,
  existingRatings: number[],
  existingReviews: string[],
  rating: number,
  review: string,
): Promise<Post> {
  try {
    return await getDatabases().updateDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      postId,
      {
        ratings: [...existingRatings, rating],
        reviews: [...existingReviews, review],
      },
    );
  } catch (error) {
    logServiceError('postService::addRatingAndReview', error);
    throw new AppError(error);
  }
}

export async function addRating(
  postId: string,
  existingRatings: number[],
  rating: number,
): Promise<Post> {
  try {
    return await getDatabases().updateDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      postId,
      { ratings: [...existingRatings, rating] },
    );
  } catch (error) {
    logServiceError('postService::addRating', error);
    throw new AppError(error);
  }
}

export async function addReview(
  postId: string,
  existingReviews: string[],
  review: string,
): Promise<Post> {
  try {
    return await getDatabases().updateDocument<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      postId,
      { reviews: [...existingReviews, review] },
    );
  } catch (error) {
    logServiceError('postService::addReview', error);
    throw new AppError(error);
  }
}
