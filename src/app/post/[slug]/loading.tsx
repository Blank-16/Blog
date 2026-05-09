import Container from "@/components/ui/Container";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14 animate-pulse">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-3 w-20 bg-subtle rounded" />
        <div className="h-3 w-4 bg-subtle rounded" />
        <div className="h-3 w-32 bg-subtle rounded" />
        <div className="h-3 w-4 bg-subtle rounded" />
        <div className="h-3 w-16 bg-subtle rounded" />
      </div>

      <div className="h-10 w-3/4 bg-subtle rounded mb-4" />
      <div className="h-10 w-1/2 bg-subtle rounded mb-8" />

      <div className="flex gap-2 mb-8">
        <div className="h-6 w-16 bg-subtle rounded-full" />
        <div className="h-6 w-20 bg-subtle rounded-full" />
        <div className="h-6 w-14 bg-subtle rounded-full" />
      </div>

      <div className="w-full aspect-video rounded-xl bg-subtle mb-10" />

      <div className="space-y-4">
        <div className="h-4 w-full bg-subtle rounded" />
        <div className="h-4 w-full bg-subtle rounded" />
        <div className="h-4 w-5/6 bg-subtle rounded" />
        <div className="h-4 w-full bg-subtle rounded" />
        <div className="h-4 w-2/3 bg-subtle rounded" />
      </div>
    </div>
  );
}
