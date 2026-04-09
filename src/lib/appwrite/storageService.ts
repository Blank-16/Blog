import { ID, Permission, Role, Models } from 'appwrite';
import { getStorage } from './client';
import config from './config';

export async function uploadFile(
  file: File,
  ownerUserId?: string,
): Promise<Models.File | null> {
  try {
    if (!file) return null;
    if (!config.appwriteBucketId || config.appwriteBucketId === 'undefined') {
      console.error('storageService :: uploadFile :: missing bucket ID');
      return null;
    }
    const permissions = [
      Permission.read(Role.any()),
      ownerUserId
        ? Permission.write(Role.user(ownerUserId))
        : Permission.write(Role.any()),
    ];
    return await getStorage().createFile(
      config.appwriteBucketId,
      ID.unique(),
      file,
      permissions,
    );
  } catch (error) {
    console.error('storageService :: uploadFile :: error', error);
    return null;
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    await getStorage().deleteFile(config.appwriteBucketId, fileId);
    return true;
  } catch (error) {
    console.error('storageService :: deleteFile :: error', error);
    return false;
  }
}

/**
 * Deletes multiple files from storage concurrently.
 * Failures are silently swallowed per-file so one bad ID doesn't block the rest.
 */
export async function deleteFiles(fileIds: string[]): Promise<void> {
  await Promise.allSettled(fileIds.map((id) => deleteFile(id)));
}

/**
 * Returns the public view URL for a stored file.
 * The Appwrite SDK returns a URL object; we coerce to string for
 * consistent usage with Next.js Image src and regular <img> tags.
 */
export function getFilePreview(fileId: string): string | null {
  try {
    if (!fileId || !config.appwriteBucketId) return null;
    const url = getStorage().getFileView(config.appwriteBucketId, fileId);
    return url ? String(url) : null;
  } catch (error) {
    console.error('storageService :: getFilePreview :: error', error);
    return null;
  }
}
