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

// Warn at startup (dev only) if required vars are missing so errors are
// caught immediately rather than surfacing as cryptic network failures.
if (process.env.NODE_ENV === 'development') {
  const required: (keyof AppConfig)[] = [
    'appwriteUrl',
    'appwriteProjectId',
    'appwriteDatabaseId',
    'appwriteCollectionId',
    'appwriteBucketId',
  ];
  for (const key of required) {
    if (!config[key]) {
      console.warn(`[config] Missing env var for "${key}". Check your .env.local file.`);
    }
  }
}

export default config;
