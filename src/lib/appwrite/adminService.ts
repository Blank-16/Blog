import { ID, Query } from 'appwrite';
import { getDatabases } from './client';
import config from './config';
import { Admin, Post } from './types';
import { deletePost, getPost } from './postService';
import { deleteFile, deleteFiles } from './storageService';
import { extractEmbeddedFileIds } from '../utils';

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    if (!config.appwriteAdminsCollectionId) return false;
    const result = await getDatabases().listDocuments<Admin>(
      config.appwriteDatabaseId,
      config.appwriteAdminsCollectionId,
      [Query.equal('userId', userId), Query.limit(1)],
    );
    return result.total > 0;
  } catch {
    return false;
  }
}

export async function getAdmins(): Promise<Admin[]> {
  try {
    const result = await getDatabases().listDocuments<Admin>(
      config.appwriteDatabaseId,
      config.appwriteAdminsCollectionId,
    );
    return result.documents;
  } catch {
    return [];
  }
}

export async function addAdmin(
  userId: string,
  addedByUserId: string,
): Promise<Admin | null> {
  try {
    const already = await isAdmin(userId);
    if (already) return null;
    return await getDatabases().createDocument<Admin>(
      config.appwriteDatabaseId,
      config.appwriteAdminsCollectionId,
      ID.unique(),
      {
        userId,
        addedBy: addedByUserId,
        addedAt: new Date().toISOString(),
      },
    );
  } catch (error) {
    console.error('adminService :: addAdmin :: error', error);
    return null;
  }
}

export async function removeAdmin(documentId: string): Promise<boolean> {
  try {
    await getDatabases().deleteDocument(
      config.appwriteDatabaseId,
      config.appwriteAdminsCollectionId,
      documentId,
    );
    return true;
  } catch (error) {
    console.error('adminService :: removeAdmin :: error', error);
    return false;
  }
}

export async function getPostCountToday(userId: string): Promise<number> {
  try {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      [
        Query.equal('userId', userId),
        Query.greaterThanEqual('$createdAt', startOfDay.toISOString()),
        Query.limit(1),
      ],
    );
    return result.total;
  } catch {
    return 0;
  }
}

export async function getPostCountThisWeek(userId: string): Promise<number> {
  try {
    const now = new Date();
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() + diffToMonday);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      [
        Query.equal('userId', userId),
        Query.greaterThanEqual('$createdAt', startOfWeek.toISOString()),
        Query.limit(1),
      ],
    );
    return result.total;
  } catch {
    return 0;
  }
}

export async function getAllPosts(limit = 100): Promise<Post[]> {
  try {
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      [Query.orderDesc('$createdAt'), Query.limit(limit)],
    );
    return result.documents;
  } catch {
    return [];
  }
}

export async function getTotalPostCount(): Promise<number> {
  try {
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      [Query.limit(1)],
    );
    return result.total;
  } catch {
    return 0;
  }
}

export async function getRecentPostCount(days = 7): Promise<number> {
  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    since.setUTCHours(0, 0, 0, 0);
    const result = await getDatabases().listDocuments<Post>(
      config.appwriteDatabaseId,
      config.appwriteCollectionId,
      [
        Query.greaterThanEqual('$createdAt', since.toISOString()),
        Query.limit(1),
      ],
    );
    return result.total;
  } catch {
    return 0;
  }
}

/**
 * Deletes a post and ALL associated storage files:
 * - the featured image
 * - any images embedded inside the Tiptap content
 */
export async function adminDeletePost(postId: string): Promise<boolean> {
  // Fetch the post first so we can identify all files to clean up
  const post = await getPost(postId);
  const deleted = await deletePost(postId);
  if (!deleted) return false;

  if (post) {
    // Delete featured image
    if (post.featuredImage) {
      await deleteFile(post.featuredImage);
    }
    // Delete any images embedded in the content body
    const embeddedIds = extractEmbeddedFileIds(post.content);
    if (embeddedIds.length > 0) {
      await deleteFiles(embeddedIds);
    }
  }

  return true;
}
