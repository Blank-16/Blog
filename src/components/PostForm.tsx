'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import RTE from './RTE';

const DRAFT_KEY = 'blog-post-draft';

interface PostFormValues {
  title: string;
  slug: string;
  content: string;
  status: 'active' | 'inactive';
  image: FileList;
  tags: string;
}

interface PostFormProps {
  post?: Post;
}

export default function PostForm({ post }: PostFormProps) {
  const { register, handleSubmit, watch, setValue, control, getValues, setError, formState: { errors } } =
    useForm<PostFormValues>({
      defaultValues: {
        title:   post?.title   ?? '',
        slug:    post?.$id     ?? '',
        content: post?.content ?? '',
        status:  post?.status  ?? 'active',
        tags:    post?.tags?.join(', ') ?? '',
      },
    });

  const router = useRouter();
  const userData = useAppSelector((state) => state.auth.userData);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Restore draft on mount (new post only)
  useEffect(() => {
    if (post) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as { title?: string; content?: string; tags?: string };
      if (draft.title) setValue('title', draft.title);
      if (draft.content) setValue('content', draft.content);
      if (draft.tags) setValue('tags', draft.tags);
    } catch {
      // ignore malformed drafts
    }
  }, [post, setValue]);

  // Auto-save draft (new post only)
  useEffect(() => {
    if (post) return;
    let timer: ReturnType<typeof setTimeout>;
    const sub = watch((values) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            title: values.title,
            content: values.content,
            tags: values.tags,
          }));
        } catch {
          // ignore storage errors
        }
      }, 1000);
    });
    return () => {
      sub.unsubscribe();
      clearTimeout(timer);
    };
  }, [post, watch]);

  const submit: SubmitHandler<PostFormValues> = async (data) => {
    if (!userData || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    // Validate slug starts with letter or digit (Appwrite requirement)
    if (!/^[a-zA-Z0-9]/.test(data.slug)) {
      setError('slug', { message: 'Slug must start with a letter or number' });
      setSubmitting(false);
      return;
    }

    const parsedTags = data.tags
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    try {
      if (post) {
        // Upload new image first (if provided)
        let newFileId = post.featuredImage;
        if (data.image[0]) {
          const file = await appwriteService.uploadFile(data.image[0], userData.$id);
          if (!file) {
            setSubmitError('Image upload failed. Please try again.');
            setSubmitting(false);
            return;
          }
          newFileId = file.$id;
        }

        // Update the post
        const dbPost = await appwriteService.updatePost({
          slug:          post.$id,
          title:         data.title,
          content:       data.content,
          featuredImage: newFileId,
          status:        data.status,
          userId:        userData.$id,
          tags:          parsedTags,
        });

        if (!dbPost) {
          setSubmitError('Failed to update post. Please try again.');
          setSubmitting(false);
          return;
        }

        // Only delete old image AFTER confirmed update success
        if (data.image[0] && newFileId !== post.featuredImage) {
          await appwriteService.deleteFile(post.featuredImage);
        }

        router.push(`/post/${dbPost.$id}`);
      } else {
        const file = await appwriteService.uploadFile(data.image[0], userData.$id);
        if (!file) {
          setError('image', { message: 'Image upload failed. Please try again.' });
          setSubmitting(false);
          return;
        }

        const dbPost = await appwriteService.createPost({
          title:         data.title,
          content:       data.content,
          featuredImage: file.$id,
          status:        data.status,
          userId:        userData.$id,
          authorName:    userData.name,
          tags:          parsedTags,
        });

        if (!dbPost) {
          setSubmitError('Failed to create post. Please try again.');
          setSubmitting(false);
          return;
        }

        // Clear draft on successful publish
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
        router.push(`/post/${dbPost.$id}`);
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const slugTransform = useCallback((value: string): string => {
    if (!value) return '';
    return value.trim().toLowerCase()
      .replace(/[^a-zA-Z\d]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 36);
  }, []);

  useEffect(() => {
    const sub = watch((value, { name }) => {
      if (name === 'title') {
        setValue('slug', slugTransform(value.title ?? ''), { shouldValidate: true });
      }
    });
    return () => sub.unsubscribe();
  }, [watch, slugTransform, setValue]);

  const imagePreviewUrl = post?.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)
    : null;

  return (
    <div className="w-full max-w-5xl mx-auto gsap-fade-up">
      <form onSubmit={handleSubmit(submit)}>
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Left: content ── */}
          <div className="flex-1 space-y-5">
            <div>
              <Input label="Title" placeholder="Your post title…" {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div>
              <Input
                label="Slug"
                placeholder="auto-generated-from-title"
                {...register('slug', { required: 'Slug is required' })}
                onInput={(e) =>
                  setValue('slug', slugTransform((e.currentTarget as HTMLInputElement).value), { shouldValidate: true })
                }
              />
              {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>}
            </div>
            <RTE label="Content" name="content" control={control} defaultValue={getValues('content')} />
          </div>

          {/* ── Right: sidebar ── */}
          <div className="lg:w-72 flex-shrink-0 rounded-xl p-5 space-y-5 self-start sticky top-20 border bg-card border-edge">
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted">
              Publish Settings
            </h3>

            <div>
              <Input
                label="Featured Image"
                type="file"
                accept="image/png, image/jpg, image/jpeg, image/gif"
                {...register('image', { required: !post ? 'Featured image is required' : false })}
              />
              {errors.image && <p className="mt-1 text-xs text-red-500">{errors.image.message}</p>}
            </div>

            {post && imagePreviewUrl && (
              <div className="rounded-lg overflow-hidden border border-edge">
                <img src={imagePreviewUrl.toString()} alt={post.title} className="w-full object-cover" />
              </div>
            )}

            <div>
              <Input
                label="Tags"
                placeholder="tech, design, tutorial"
                {...register('tags')}
              />
              <p className="mt-1 text-xs text-muted">Comma-separated</p>
            </div>

            <Select
              options={['active', 'inactive']}
              label="Status"
              {...register('status', { required: true })}
            />

            {submitError && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}

            {!post && (
              <p className="text-xs text-muted italic">Draft auto-saves as you type.</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Saving…' : post ? 'Update Post' : 'Publish Post'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
