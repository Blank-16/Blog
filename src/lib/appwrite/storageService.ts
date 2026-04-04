import { ID, Permission, Role, Models } from "appwrite";
import { getStorage } from "./client";
import config from "./config";

export async function uploadFile(
  file: File,
  ownerUserId?: string,
): Promise<Models.File | null> {
  try {
    if (!file) return null;
    if (!config.appwriteBucketId || config.appwriteBucketId === "undefined") {
      console.error("storageService :: uploadFile :: missing bucket ID");
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
    console.error("storageService :: uploadFile :: error", error);
    return null;
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    await getStorage().deleteFile(config.appwriteBucketId, fileId);
    return true;
  } catch (error) {
    console.error("storageService :: deleteFile :: error", error);
    return false;
  }
}

export function getFilePreview(fileId: string): string | null {
  try {
    if (!fileId || !config.appwriteBucketId) return null;
    return getStorage().getFileView(config.appwriteBucketId, fileId);
  } catch (error) {
    console.error("storageService :: getFilePreview :: error", error);
    return null;
  }
}
