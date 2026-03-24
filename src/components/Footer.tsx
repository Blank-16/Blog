export default function Footer() {
  return (
    <footer className="mt-auto border-t border-edge">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs font-display text-muted">Blogging Web</p>
        <div className="flex items-center gap-6 text-xs text-muted">
          <p>Please be respectful with your posts.</p>
          <a
            href="https://github.com/Blank-16"
            target="_blank"
            rel="noreferrer"
            className="transition-opacity hover:opacity-50"
          >
            @Blank-16
          </a>
        </div>
      </div>
    </footer>
  );
}
