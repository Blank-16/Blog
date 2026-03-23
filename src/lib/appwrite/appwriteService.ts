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
}

interface CreatePostParams {
  title: string;
  content: string;
  featuredImage: string;
  status: "active" | "inactive";
  userId: string;
  authorName: string;
}

interface UpdatePostParams {
  slug: string;
  title: string;
  content: string;
  featuredImage: string;
  status: "active" | "inactive";
  userId?: string;
  authorName?: string;
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

  async createPost(params: CreatePostParams): Promise<Post | undefined> {
    try {
      return await this.getDatabases().createDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        ID.unique(),
        params,
      );
    } catch (error) {
      console.log("AppwriteService :: createPost :: error", error);
    }
  }

  async updatePost({
    slug,
    title,
    content,
    featuredImage,
    status,
    authorName,
  }: UpdatePostParams): Promise<Post | undefined> {
    try {
      const updateData: Partial<Omit<Post, keyof Models.Document>> = {
        title,
        content,
        featuredImage,
        status,
      };
      if (authorName !== undefined) updateData.authorName = authorName;

      return await this.getDatabases().updateDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        slug,
        updateData,
      );
    } catch (error) {
      console.log("AppwriteService :: updatePost :: error", error);
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

  async getPost(slug: string): Promise<Post | false> {
    try {
      return await this.getDatabases().getDocument<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        slug,
      );
    } catch (error) {
      console.log("AppwriteService :: getPost :: error", error);
      return false;
    }
  }

  async getPosts(
    queries: string[] = [Query.equal("status", "active")],
  ): Promise<Models.DocumentList<Post> | false> {
    try {
      return await this.getDatabases().listDocuments<Post>(
        config.appwriteDatabaseId,
        config.appwriteCollectionId,
        queries,
      );
    } catch (error) {
      console.log("AppwriteService :: getPosts :: error", error);
      return false;
    }
  }

  async uploadFile(
    file: File,
    ownerUserId?: string,
  ): Promise<Models.File | false> {
    try {
      if (!file) return false;
      if (!config.appwriteBucketId || config.appwriteBucketId === "undefined") {
        console.error("AppwriteService :: uploadFile :: missing bucket ID");
        return false;
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
      return false;
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
