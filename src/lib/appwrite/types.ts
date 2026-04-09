import { Models } from 'appwrite';

export interface Admin extends Models.Document {
  userId: string;
  addedBy: string;
  addedAt: string;
}

export interface Post extends Models.Document {
  title: string;
  content: string;
  featuredImage: string;
  status: 'active' | 'inactive';
  userId: string;
  authorName?: string;
  tags?: string[];
  ratings?: number[];
  reviews?: string[];
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface CreatePostParams {
  title: string;
  content: string;
  featuredImage: string;
  status: 'active' | 'inactive';
  userId: string;
  authorName: string;
  tags?: string[];
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export interface UpdatePostParams {
  slug: string;
  title: string;
  content: string;
  featuredImage: string;
  status: 'active' | 'inactive';
  userId?: string;
  authorName?: string;
  tags?: string[];
  urlSlug?: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}