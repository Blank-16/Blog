interface AppConfig {
  appwriteUrl: string;
  appwriteProjectId: string;
  appwriteDatabaseId: string;
  appwriteCollectionId: string;
  appwriteBucketId: string;
  appwriteAdminsCollectionId: string;
}

const config: AppConfig = {
  appwriteUrl: process.env.NEXT_PUBLIC_APPWRITE_URL ?? '',
  appwriteProjectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? '',
  appwriteDatabaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? '',
  appwriteCollectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID ?? '',
  appwriteBucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID ?? '',
  appwriteAdminsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_ADMINS_COLLECTION_ID ?? '',
};

// Warn at startup if required vars are missing — surfaces as a clear log
// entry in Vercel function logs rather than a cryptic network error later.
if (typeof window === 'undefined') {
  const required: (keyof AppConfig)[] = [
    'appwriteUrl',
    'appwriteProjectId',
    'appwriteDatabaseId',
    'appwriteCollectionId',
    'appwriteBucketId',
  ];
  for (const key of required) {
    if (!config[key]) {
      console.error(`[config] Missing required env var for "${key}". All Appwrite calls will fail.`);
    }
  }
}

export default config;
