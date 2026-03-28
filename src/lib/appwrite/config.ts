interface AppConfig {
  appwriteUrl: string;
  appwriteProjectId: string;
  appwriteDatabaseId: string;
  appwriteCollectionId: string;
  appwriteBucketId: string;
  appwriteAdminsCollectionId: string;
}

const config: AppConfig = {
  appwriteUrl: process.env.NEXT_PUBLIC_APPWRITE_URL ?? "",
  appwriteProjectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "",
  appwriteDatabaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "",
  appwriteCollectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID ?? "",
  appwriteBucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ?? "",
  appwriteAdminsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID ?? "",
};

export default config;
