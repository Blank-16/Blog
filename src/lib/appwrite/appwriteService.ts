import config from "./config";
import {
  Client,
  ID,
  Databases,
  Storage,
  Query,
  Permission,
  Role,
  Models,
} from "appwrite";

export interface Post extends Models.Document {
  title: string;
  content: string;
  featuredImage: string;
  status: "active" | "inactive";
  userId: string;
  authorName?: string;
  tags?: string[];
  ratings?: number[];
  reviews?: string[];
}

interface CreatePostParams {
  title: string;
  content: string;
  featuredImage: string;
  status: "active" | "inactive";
  userId: string;
  authorName: string;
  tags?: string[];
}

interface UpdatePostParams {
  slug: string;
  title: string;
  content: string;
  featuredImage: string;
  status: "active" | "inactive";
  userId?: string;
  authorName?: string;
  tags?: string[];
}

export class AppwriteService {
  private client: Client | null = null;
  private databases: Databases | null = null;
  private bucket: Storage | null = null;

  private getClient(): Client {
    if (!this.client) {
      this.client = new Client()
        .setEndpoint(config.appwriteUrl)
        .setProject(config.appwriteProjectId);
    }
    return this.client;
  }

  private getDatabases(): Databases {
    if (!this.databases) {
      this.databases = new Databases(this.getClient());
    }
    return this.databases;
  }

  private getBucket(): Storage {
    if (!this.bucket) {
      this.bucket = new Storage(this.getClient());
    }
    return this.bucket;
  }

  async createPost(params: CreatePostParams): Promise<Post | null> {
    try {
      return await this.getDatabases().createDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        ID.unique(),
        params,
      );
    } catch (error) {
      console.log("AppwriteService :: createPost :: error", error);
      return null;
    }
  }

  async updatePost({
    slug,
    title,
    content,
    featuredImage,
    status,
    authorName,
    tags,
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

      return await this.getDatabases().updateDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        slug,
        updateData,
      );
    } catch (error) {
      console.log("AppwriteService :: updatePost :: error", error);
      return null;
    }
  }

  async deletePost(slug: string): Promise<boolean> {
    try {
      await this.getDatabases().deleteDocument(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        slug,
      );
      return true;
    } catch (error) {
      console.log("AppwriteService :: deletePost :: error", error);
      return false;
    }
  }

  async getPost(slug: string): Promise<Post | null> {
    try {
      return await this.getDatabases().getDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        slug,
      );
    } catch (error) {
      console.log("AppwriteService :: getPost :: error", error);
      return null;
    }
  }

  async getPosts(
    queries: string[] = [Query.equal("status", "active")],
  ): Promise<Models.DocumentList<Post> | null> {
    try {
      return await this.getDatabases().listDocuments<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        queries,
      );
    } catch (error) {
      console.log("AppwriteService :: getPosts :: error", error);
      return null;
    }
  }

  async uploadFile(
    file: File,
    ownerUserId?: string,
  ): Promise<Models.File | null> {
    try {
      if (!file) return null;
      if (!config.appwriteBucketId || config.appwriteBucketId === "undefined") {
        console.error("AppwriteService :: uploadFile :: missing bucket ID");
        return null;
      }
      const permissions = [
        Permission.read(Role.any()),
        ownerUserId
          ? Permission.write(Role.user(ownerUserId))
          : Permission.write(Role.any()),
      ];
      return await this.getBucket().createFile(
        config.appwriteBucketId,
        ID.unique(),
        file,
        permissions,
      );
    } catch (error) {
      console.log("AppwriteService :: uploadFile :: error", error);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.getBucket().deleteFile(config.appwriteBucketId, fileId);
      return true;
    } catch (error) {
      console.log("AppwriteService :: deleteFile :: error", error);
      return false;
    }
  }

  getFilePreview(fileId: string): URL | null {
    try {
      if (!fileId || !config.appwriteBucketId) return null;
      return this.getBucket().getFileView(config.appwriteBucketId, fileId);
    } catch (error) {
      console.error("AppwriteService :: getFilePreview :: error", error);
      return null;
    }
  }

  /**
   * Appends a star rating (1–5) to the post's ratings[] array.
   * Returns the updated post or null on failure.
   */
  async addRating(postId: string, existingRatings: number[], rating: number): Promise<Post | null> {
    try {
      return await this.getDatabases().updateDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        postId,
        { ratings: [...existingRatings, rating] },
      );
    } catch (error) {
      console.error("AppwriteService :: addRating :: error", error);
      return null;
    }
  }

  /**
   * Appends a review string to the post's reviews[] array.
   * Each review is stored as "AuthorName|||Comment text" so we can
   * split author from body on the client without a separate collection.
   */
  async addReview(postId: string, existingReviews: string[], review: string): Promise<Post | null> {
    try {
      return await this.getDatabases().updateDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        postId,
        { reviews: [...existingReviews, review] },
      );
    } catch (error) {
      console.error("AppwriteService :: addReview :: error", error);
      return null;
    }
  }
}

const appwriteService = new AppwriteService();
export default appwriteService;

/**
 * Builds a URL-safe Appwrite document ID from author name + post title.
 * Format: "<author-slug>-<title-slug>" trimmed to 36 chars max.
 * Appwrite requires IDs to start with a letter or digit, max 36 chars,
 * and contain only [a-zA-Z0-9._-].
 */
export function buildPostSlug(authorName: string, title: string): string {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const authorPart = slugify(authorName).slice(0, 10);
  const titlePart = slugify(title);
  const combined = authorPart ? `${authorPart}-${titlePart}` : titlePart;
  // Appwrite IDs: max 36 chars, must start with [a-zA-Z0-9]
  const trimmed = combined.slice(0, 36).replace(/-+$/, '');
  // Fallback if title was empty / all special chars
  return /^[a-zA-Z0-9]/.test(trimmed) ? trimmed : `post-${trimmed}`.slice(0, 36);
}
