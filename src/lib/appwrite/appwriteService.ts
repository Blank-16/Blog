/**
 *   types.ts         — Post, Admin interfaces
 *   client.ts        — Appwrite client singleton
 *   postService.ts   — post CRUD, search, ratings, reviews
 *   adminService.ts  — admin management, rate limiting, dashboard analytics
 *   storageService.ts — file upload/delete/preview
 *   slugUtils.ts     — buildPostSlug, buildUrlParam
 */

export type { Post, Admin, CreatePostParams, UpdatePostParams } from './types';

export {
  createPost,
  updatePost,
  deletePost,
  getPost,
  getPostByUrlParam,
  getPosts,
  searchPosts,
  addRating,
  addReview,
} from './postService';

export {
  isAdmin,
  getAdmins,
  addAdmin,
  removeAdmin,
  getPostCountToday,
  getPostCountThisWeek,
  getAllPosts,
  getTotalPostCount,
  getRecentPostCount,
  adminDeletePost,
} from './adminService';

export {
  uploadFile,
  deleteFile,
  getFilePreview,
} from './storageService';

export { buildPostSlug, buildUrlParam } from './slugUtils';

/**
 * Default export — a plain object mirroring the old AppwriteService class API.
 * Components that use `appwriteService.createPost(...)` continue to work
 * without any changes.
 */
import * as postSvc    from './postService';
import * as adminSvc   from './adminService';
import * as storageSvc from './storageService';

const appwriteService = {
  ...postSvc,
  ...adminSvc,
  ...storageSvc,
};

export default appwriteService;