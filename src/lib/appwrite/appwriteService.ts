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

export interface Admin extends Models.Document {
  userId: string;
  addedBy: string;
  addedAt: string;
}

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
  urlSlug?: string;   // human-readable URL segment e.g. "john-how-to-build--abc12345"
}

interface CreatePostParams {
  title: string;
  content: string;
  featuredImage: string;
  status: "active" | "inactive";
  userId: string;
  authorName: string;
  tags?: string[];
  urlSlug?: string;
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
  urlSlug?: string;
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
    urlSlug,
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

  /**
   * Looks up a post from a full URL param like "john-how-to-build--abc12345".
   * Extracts the real $id from after the "--" separator, falls back to
   * treating the whole string as a raw $id (handles old posts with no urlSlug).
   */
  async getPostByUrlParam(urlParam: string): Promise<Post | null> {
    const sep = urlParam.lastIndexOf('--');
    const realId = sep !== -1 ? urlParam.slice(sep + 2) : urlParam;
    return this.getPost(realId);
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

  getFilePreview(fileId: string): string | null {
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

  // Admin management

  async isAdmin(userId: string): Promise<boolean> {
    try {
      if (!config.appwriteAdminsCollectionId) return false;
      const result = await this.getDatabases().listDocuments<Admin>(
        config.appwriteDatabaseId,
        config.appwriteAdminsCollectionId,
        [Query.equal('userId', userId), Query.limit(1)],
      );
      return result.total > 0;
    } catch {
      return false;
    }
  }

  async getAdmins(): Promise<Admin[]> {
    try {
      const result = await this.getDatabases().listDocuments<Admin>(
        config.appwriteDatabaseId,
        config.appwriteAdminsCollectionId,
      );
      return result.documents;
    } catch {
      return [];
    }
  }

  async addAdmin(userId: string, addedByUserId: string): Promise<Admin | null> {
    try {
      // Prevent duplicates
      const already = await this.isAdmin(userId);
      if (already) return null;
      return await this.getDatabases().createDocument<Admin>(
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
      console.error("AppwriteService :: addAdmin :: error", error);
      return null;
    }
  }

  async removeAdmin(documentId: string): Promise<boolean> {
    try {
      await this.getDatabases().deleteDocument(
        config.appwriteDatabaseId,
        config.appwriteAdminsCollectionId,
        documentId,
      );
      return true;
    } catch (error) {
      console.error("AppwriteService :: removeAdmin :: error", error);
      return false;
    }
  }

  // Post rate limiting

  /** Returns how many posts this user has created today (UTC). */
  async getPostCountToday(userId: string): Promise<number> {
    try {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const result = await this.getDatabases().listDocuments<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        [
          Query.equal('userId', userId),
          Query.greaterThanEqual('$createdAt', startOfDay.toISOString()),
          Query.limit(1), // we only need the count, not the docs
        ],
      );
      return result.total;
    } catch {
      return 0;
    }
  }

  /** Returns how many posts this user has created this week (Mon–Sun UTC). */
  async getPostCountThisWeek(userId: string): Promise<number> {
    try {
      const now = new Date();
      const day = now.getUTCDay(); // 0=Sun, 1=Mon…
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      const startOfWeek = new Date(now);
      startOfWeek.setUTCDate(now.getUTCDate() + diffToMonday);
      startOfWeek.setUTCHours(0, 0, 0, 0);
      const result = await this.getDatabases().listDocuments<Post>(
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

  // Dashboard analytics

  /** Fetches all posts for admin dashboard (active + inactive). */
  async getAllPosts(limit = 100): Promise<Post[]> {
    try {
      const result = await this.getDatabases().listDocuments<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(limit)],
      );
      return result.documents;
    } catch {
      return [];
    }
  }

  /** Total post count regardless of status. */
  async getTotalPostCount(): Promise<number> {
    try {
      const result = await this.getDatabases().listDocuments<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        [Query.limit(1)],
      );
      return result.total;
    } catch {
      return 0;
    }
  }

  /** Posts created in the last N days. */
  async getRecentPostCount(days = 7): Promise<number> {
    try {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - days);
      since.setUTCHours(0, 0, 0, 0);
      const result = await this.getDatabases().listDocuments<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        [Query.greaterThanEqual('$createdAt', since.toISOString()), Query.limit(1)],
      );
      return result.total;
    } catch {
      return 0;
    }
  }

  /** Delete a post as admin (no ownership check). */
  async adminDeletePost(postId: string): Promise<boolean> {
    return this.deletePost(postId);
  }
}

const appwriteService = new AppwriteService();
export default appwriteService;

/**
 * Builds a readable URL prefix from author name + post title.
 * e.g. "john-doe-how-to-build-a-blog"
 * Max 60 chars, URL-safe.
 */
export function buildPostSlug(authorName: string, title: string): string {
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const authorPart = slugify(authorName).slice(0, 20);
  const titlePart  = slugify(title).slice(0, 40);
  const combined   = authorPart ? `${authorPart}-${titlePart}` : titlePart;
  return combined.replace(/-+$/, '') || 'post';
}

/**
 * Combines the readable slug with the real Appwrite $id.
 * e.g. "john-doe-how-to-build-a-blog--abc12345xyz"
 * The "--" separator lets us extract the real ID on lookup.
 */
export function buildUrlParam(authorName: string, title: string, id: string): string {
  const slug = buildPostSlug(authorName, title);
  return `${slug}--${id}`;
}
