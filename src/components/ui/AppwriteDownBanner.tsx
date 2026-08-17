export default function AppwriteDownBanner() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-32 text-center">
      <p className="font-display text-[clamp(1.8rem,4vw,3rem)] leading-tight text-ink mb-4">
        Appwrite stopped my project,
        <br />
        <em>as I'm a free user :&nbsp;)</em>
      </p>
      <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
        The database is temporarily unavailable. Posts will be back once the
        project is restored.
      </p>
    </div>
  );
}
