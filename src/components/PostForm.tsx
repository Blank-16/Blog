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
    if (value && typeof value === 'string') {
      return value
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z\d]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 36);
    }
    return '';
  }, []);

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'title') {
        setValue('slug', slugTransform(value.title ?? ''), { shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, slugTransform, setValue]);

  const imagePreviewUrl = post?.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)
    : null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(submit)} className="flex flex-wrap">
        <div className="w-2/3 px-2">
          <Input
            label="Title :"
            placeholder="Title"
            className="mb-4"
            {...register('title', { required: true })}
          />
          <Input
            label="Slug :"
            placeholder="Slug"
            className="mb-4"
            {...register('slug', { required: true })}
            onInput={(e) =>
              setValue('slug', slugTransform((e.currentTarget as HTMLInputElement).value), {
                shouldValidate: true,
              })
            }
          />
          <RTE
            label="Content :"
            name="content"
            control={control}
            defaultValue={getValues('content')}
          />
        </div>

        <div className="w-1/3 px-2">
          <Input
            label="Featured Image :"
            type="file"
            className="mb-4"
            accept="image/png, image/jpg, image/jpeg, image/gif"
            {...register('image', { required: !post })}
          />
          {post && imagePreviewUrl && (
            <div className="w-full mb-4">
              <img
                src={imagePreviewUrl.toString()}
                alt={post.title}
                className="rounded-lg"
              />
            </div>
          )}
          <Select
            options={['active', 'inactive']}
            label="Status"
            className="mb-4"
            {...register('status', { required: true })}
          />
          <Button
            type="submit"
            bgColor={post ? 'bg-green-500' : undefined}
            className="w-full"
          >
            {post ? 'Update' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
