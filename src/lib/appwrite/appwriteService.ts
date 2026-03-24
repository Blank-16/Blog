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
}

const appwriteService = new AppwriteService();
export default appwriteService;
