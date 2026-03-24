'use client';

import { useCallback, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import appwriteService, { Post } from '@/lib/appwrite/appwriteService';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import RTE from './RTE';

interface PostFormValues {
  title: string;
  slug: string;
  content: string;
  status: 'active' | 'inactive';
  image: FileList;
}

interface PostFormProps {
  post?: Post;
}

export default function PostForm({ post }: PostFormProps) {
  const { register, handleSubmit, watch, setValue, control, getValues } =
    useForm<PostFormValues>({
      defaultValues: {
        title:   post?.title   ?? '',
        slug:    post?.$id     ?? '',
        content: post?.content ?? '',
        status:  post?.status  ?? 'active',
      },
    });

  const router = useRouter();
  const userData = useAppSelector((state) => state.auth.userData);

  const submit: SubmitHandler<PostFormValues> = async (data) => {
    if (!userData) return;

    if (post) {
      const file = data.image[0]
        ? await appwriteService.uploadFile(data.image[0], userData.$id)
        : null;
      if (file) appwriteService.deleteFile(post.featuredImage);

      const dbPost = await appwriteService.updatePost({
        slug:          post.$id,
        title:         data.title,
        content:       data.content,
        featuredImage: file ? file.$id : post.featuredImage,
        status:        data.status,
        userId:        userData.$id,
      });
      if (dbPost) router.push(`/post/${dbPost.$id}`);
    } else {
      const file = await appwriteService.uploadFile(data.image[0], userData.$id);
      if (file) {
        const dbPost = await appwriteService.createPost({
          title:         data.title,
          content:       data.content,
          featuredImage: file.$id,
          status:        data.status,
          userId:        userData.$id,
          authorName:    userData.name,
        });
        if (dbPost) router.push(`/post/${dbPost.$id}`);
      }
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
            <Input label="Title" placeholder="Your post title…" {...register('title', { required: true })} />
            <Input
              label="Slug"
              placeholder="auto-generated-from-title"
              {...register('slug', { required: true })}
              onInput={(e) =>
                setValue('slug', slugTransform((e.currentTarget as HTMLInputElement).value), { shouldValidate: true })
              }
            />
            <RTE label="Content" name="content" control={control} defaultValue={getValues('content')} />
          </div>

          {/* ── Right: sidebar ── */}
          <div className="lg:w-72 flex-shrink-0 rounded-xl p-5 space-y-5 self-start sticky top-20 border bg-card border-edge">
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted">
              Publish Settings
            </h3>

            <Input
              label="Featured Image"
              type="file"
              accept="image/png, image/jpg, image/jpeg, image/gif"
              {...register('image', { required: !post })}
            />

            {post && imagePreviewUrl && (
              <div className="rounded-lg overflow-hidden border border-edge">
                <img src={imagePreviewUrl.toString()} alt={post.title} className="w-full object-cover" />
              </div>
            )}

            <Select
              options={['active', 'inactive']}
              label="Status"
              {...register('status', { required: true })}
            />

            <Button type="submit" className="w-full">
              {post ? 'Update Post' : 'Publish Post'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
