"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, SubmitHandler, FieldErrors } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import appwriteService, {
  Post,
  buildPostSlug,
  buildUrlParam,
} from "@/lib/appwrite/appwriteService";
import { compressImage } from "@/lib/compressImage";
import { extractEmbeddedFileIds, toastStyle } from "@/lib/utils";
import { revalidatePost } from "@/app/actions/revalidatePost";
import toast, { Toaster } from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import RTE from "@/components/client/RTE";
import SeoPanel from "@/components/client/SeoPanel";

const DRAFT_KEY = "blog-post-draft";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PostFormValues {
  title: string;
  slug: string;
  content: string;
  status: "active" | "inactive";
  image: FileList;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  noIndex: boolean;
}

const REQUIRED_FIELD_LABELS: Partial<Record<keyof PostFormValues, string>> = {
  title: "Title",
  slug: "Slug",
  content: "Content",
  image: "Featured Image",
  status: "Status",
  tags: "Tags",
};

interface PostFormProps {
  post?: Post;
  /** Pass isAdmin from a parent that already has it (e.g. AddPostPage via usePostLimits)
   *  to avoid an extra Appwrite round trip. Falls back to an internal check when omitted. */
  isAdmin?: boolean;
}

export default function PostForm({
  post,
  isAdmin: isAdminProp,
}: PostFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    getValues,
    setError,
    formState: { errors },
  } = useForm<PostFormValues>({
    defaultValues: {
      title: post?.title ?? "",
      slug: post?.$id ?? "",
      content: post?.content ?? "",
      status: post?.status ?? "active",
      tags: post?.tags?.join(", ") ?? "",
      metaTitle: post?.metaTitle ?? "",
      metaDescription: post?.metaDescription ?? "",
      focusKeyword: post?.focusKeyword ?? "",
      canonicalUrl: post?.canonicalUrl ?? "",
      noIndex: post?.noIndex ?? false,
    },
  });

  const router = useRouter();
  const userData = useAppSelector((state) => state.auth.userData);
  const [submitting, setSubmitting] = useState(false);
  const [isAdminInternal, setIsAdminInternal] = useState(false);
  // Use the prop when the parent already has it; only query Appwrite when not provided.
  const isAdmin = isAdminProp ?? isAdminInternal;
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    before: number;
    after: number;
  } | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);

  useEffect(() => {
    if (isAdminProp !== undefined) return;
    if (!userData?.$id) return;
    appwriteService.isAdmin(userData.$id).then(setIsAdminInternal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.$id, isAdminProp]);

  // Restore draft on mount (new post only)
  useEffect(() => {
    if (post) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft = JSON.parse(saved) as {
        title?: string;
        content?: string;
        tags?: string;
      };
      if (draft.title) setValue("title", draft.title);
      if (draft.content) setValue("content", draft.content);
      if (draft.tags) setValue("tags", draft.tags);
    } catch {
      // Ignore malformed drafts
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
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              title: values.title,
              content: values.content,
              tags: values.tags,
            }),
          );
        } catch {
          // Ignore storage quota errors
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

    if (!/^[a-zA-Z0-9]/.test(data.slug)) {
      setError("slug", { message: "Slug must start with a letter or number" });
      setSubmitting(false);
      return;
    }

    const parsedTags = data.tags
      ? data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const toastId = toast.loading(
      post ? "Updating post..." : "Publishing post...",
    );

    try {
      if (post) {
        /* Update flow */
        let newFileId = post.featuredImage;

        if (data.image[0]) {
          const toUpload = compressedFile ?? data.image[0];
          const file = await appwriteService.uploadFile(toUpload, userData.$id);
          if (!file) {
            toast.error("Image upload failed. Please try again.", {
              id: toastId,
            });
            setSubmitting(false);
            return;
          }
          newFileId = file.$id;
        }

        const dbPost = await appwriteService.updatePost({
          slug: post.$id,
          title: data.title,
          content: data.content,
          featuredImage: newFileId,
          status: data.status,
          userId: userData.$id,
          tags: parsedTags,
          metaTitle: data.metaTitle || undefined,
          metaDescription: data.metaDescription || undefined,
          focusKeyword: data.focusKeyword || undefined,
          canonicalUrl: data.canonicalUrl || undefined,
          noIndex: data.noIndex,
        });

        if (!dbPost) {
          toast.error("Failed to update post. Please try again.", {
            id: toastId,
          });
          setSubmitting(false);
          return;
        }

        // Clean up the old featured image if it was replaced
        if (data.image[0] && newFileId !== post.featuredImage) {
          await appwriteService.deleteFile(post.featuredImage);
        }

        // Detect which embedded content images were removed during editing
        // and delete them from storage so we don't accumulate orphans.
        const oldEmbeddedIds = extractEmbeddedFileIds(post.content);
        const newEmbeddedIds = new Set(extractEmbeddedFileIds(data.content));
        const removedIds = oldEmbeddedIds.filter(
          (id) => !newEmbeddedIds.has(id),
        );
        if (removedIds.length > 0) {
          await appwriteService.deleteFiles(removedIds);
        }

        const urlParam = dbPost.urlSlug ?? dbPost.$id;
        toast.success("Post updated!", { id: toastId });
        revalidatePost(urlParam).catch(() => {});
        setSubmitting(false);
        router.push(`/post/${urlParam}`);
      } else {
        /* Create flow */
        const toUpload = compressedFile ?? data.image[0];
        const file = await appwriteService.uploadFile(toUpload, userData.$id);
        if (!file) {
          toast.error("Image upload failed. Please try again.", {
            id: toastId,
          });
          setError("image", {
            message: "Image upload failed. Please try again.",
          });
          setSubmitting(false);
          return;
        }

        const dbPost = await appwriteService.createPost({
          title: data.title,
          content: data.content,
          featuredImage: file.$id,
          status: data.status,
          userId: userData.$id,
          authorName: userData.name,
          tags: parsedTags,
          metaTitle: data.metaTitle || undefined,
          metaDescription: data.metaDescription || undefined,
          focusKeyword: data.focusKeyword || undefined,
          canonicalUrl: data.canonicalUrl || undefined,
          noIndex: data.noIndex,
        });

        if (!dbPost) {
          toast.error("Failed to create post. Please try again.", {
            id: toastId,
          });
          setSubmitting(false);
          return;
        }

        const urlParam = buildUrlParam(userData.name, data.title, dbPost.$id);

        // Write urlSlug back to the document - await so we don't navigate
        // before the slug is persisted. If this fails, the post is still
        // accessible via raw $id (graceful degradation).
        await appwriteService
          .updatePost({
            slug: dbPost.$id,
            title: dbPost.title,
            content: dbPost.content,
            featuredImage: dbPost.featuredImage,
            status: dbPost.status,
            urlSlug: urlParam,
          })
          .catch(() => {});

        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // Ignore
        }

        setCompressedFile(null);
        setCompressionInfo(null);
        toast.success("Post published!", { id: toastId });
        revalidatePost(urlParam).catch(() => {});
        setSubmitting(false);
        router.push(`/post/${urlParam}`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.", { id: toastId });
      setSubmitting(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<PostFormValues>) => {
    const missingFields = Object.keys(formErrors)
      .filter(
        (key): key is keyof PostFormValues => key in REQUIRED_FIELD_LABELS,
      )
      .map((key) => REQUIRED_FIELD_LABELS[key])
      .filter((label): label is string => Boolean(label));

    if (missingFields.length === 0) {
      toast.error("Please fill the required fields before publishing.");
      return;
    }

    const formattedFields = missingFields
      .map((field) => `- ${field}`)
      .join("\n");
    toast.error(`Please fill the following:\n${formattedFields}`);
  };

  const slugTransform = useCallback(
    (value: string): string => {
      if (!userData?.name) return "";
      return buildPostSlug(userData.name, value);
    },
    // Depend only on the name string - not the whole userData object reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userData?.name],
  );

  useEffect(() => {
    const sub = watch((value, { name }) => {
      if (name === "title") {
        setValue("slug", slugTransform(value.title ?? ""), {
          shouldValidate: true,
        });
      }
    });
    return () => sub.unsubscribe();
  }, [watch, slugTransform, setValue]);

  const imagePreviewUrl = post?.featuredImage
    ? appwriteService.getFilePreview(post.featuredImage)
    : null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLocalPreview(null);
      setCompressionInfo(null);
      setCompressedFile(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    setCompressionInfo(null);
    setCompressing(true);

    try {
      const compressed = await compressImage(file);
      setCompressedFile(compressed);
      if (compressed !== file) {
        setCompressionInfo({ before: file.size, after: compressed.size });
        URL.revokeObjectURL(url);
        setLocalPreview(URL.createObjectURL(compressed));
      }
    } finally {
      setCompressing(false);
    }
  };

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  return (
    <div className="w-full max-w-5xl mx-auto gsap-fade-up">
      <Toaster position="top-right" toastOptions={{ style: toastStyle }} />

      <form onSubmit={handleSubmit(submit, onInvalid)}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Content column */}
          <div className="flex-1 space-y-5">
            <div>
              <Input
                label="Title"
                placeholder="Your post title..."
                {...register("title", { required: "Title is required" })}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Input
                label="Slug"
                placeholder="auto-generated-from-title"
                {...register("slug", { required: "Slug is required" })}
                onInput={(e) =>
                  setValue(
                    "slug",
                    slugTransform((e.currentTarget as HTMLInputElement).value),
                    { shouldValidate: true },
                  )
                }
              />
              {errors.slug && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.slug.message}
                </p>
              )}
            </div>

            <RTE
              label="Content"
              name="content"
              control={control}
              defaultValue={getValues("content")}
              userId={userData?.$id}
              rules={{
                required: "Content is required",
                validate: (value) => {
                  const raw = typeof value === "string" ? value : "";
                  if (!raw.trim()) return "Content is required";
                  // Tiptap stores JSON - extract text nodes to check for real content
                  if (raw.trimStart().startsWith("{")) {
                    try {
                      const doc = JSON.parse(raw);
                      const hasText = (
                        nodes: {
                          type?: string;
                          text?: string;
                          content?: unknown[];
                        }[],
                      ): boolean =>
                        nodes.some(
                          (n) =>
                            (n.type === "text" && !!n.text?.trim()) ||
                            (n.content
                              ? hasText(n.content as typeof nodes)
                              : false),
                        );
                      if (doc?.type === "doc" && Array.isArray(doc.content)) {
                        return hasText(doc.content) || "Content is required";
                      }
                    } catch {
                      // Not valid JSON - fall through to length check
                    }
                  }
                  // Legacy HTML content
                  return (
                    raw.replace(/<[^>]*>/g, "").trim().length > 0 ||
                    "Content is required"
                  );
                },
              }}
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-72 shrink-0 rounded-xl p-5 space-y-5 self-start sticky top-20 border bg-card border-edge">
            <h3 className="text-xs font-medium tracking-widest uppercase text-muted">
              Publish Settings
            </h3>

            <div>
              <Input
                label="Featured Image"
                type="file"
                accept="image/png, image/jpg, image/jpeg, image/gif"
                {...register("image", {
                  required: !post ? "Featured image is required" : false,
                })}
                onChange={(e) => {
                  register("image").onChange(e);
                  handleImageChange(e);
                }}
              />
              {errors.image && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.image.message}
                </p>
              )}
            </div>

            {(localPreview || imagePreviewUrl) && (
              <div className="rounded-lg overflow-hidden border border-edge bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={localPreview ?? imagePreviewUrl!}
                  alt="Featured image preview"
                  className="w-full object-cover"
                />
                {compressing && (
                  <p className="text-[10px] text-center text-muted py-1.5 border-t border-edge">
                    Compressing...
                  </p>
                )}
                {!compressing && compressionInfo && (
                  <p className="text-[10px] text-center text-green-600 dark:text-green-400 py-1.5 border-t border-edge">
                    Compressed {formatBytes(compressionInfo.before)} to{" "}
                    {formatBytes(compressionInfo.after)}{" "}
                    <span className="font-medium">
                      (
                      {Math.round(
                        (1 - compressionInfo.after / compressionInfo.before) *
                          100,
                      )}
                      % smaller)
                    </span>
                  </p>
                )}
                {!compressing && !compressionInfo && localPreview && (
                  <p className="text-[10px] text-center text-muted py-1.5 border-t border-edge">
                    New image selected
                  </p>
                )}
              </div>
            )}

            <div>
              <Input
                label="Tags"
                placeholder="tech, design, tutorial"
                {...register("tags", {
                  required: "At least one tag is required",
                  validate: (value) =>
                    value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean).length > 0 ||
                    "At least one tag is required",
                })}
              />
              <p className="mt-1 text-xs text-muted">Comma-separated</p>
              {errors.tags && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.tags.message}
                </p>
              )}
            </div>

            <Select
              options={["active", "inactive"]}
              label="Status"
              {...register("status", { required: "Status is required" })}
            />
            {errors.status && (
              <p className="mt-1 text-xs text-red-500">
                {errors.status.message}
              </p>
            )}

            {!post && (
              <p className="text-xs text-muted italic">
                Draft auto-saves as you type.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || compressing}
            >
              {submitting
                ? "Saving..."
                : compressing
                  ? "Processing image..."
                  : post
                    ? "Update Post"
                    : "Publish Post"}
            </Button>
          </div>
        </div>
      </form>

      {isAdmin && (
        <div className="mt-10">
          <SeoPanel
            register={register}
            watch={watch}
            postTitle={watch("title") ?? ""}
          />
        </div>
      )}
    </div>
  );
}
