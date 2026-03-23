export default function Footer() {
  return (
    <>
      <hr className="border-gray-200 dark:border-gray-700" />
      <footer className="flex flex-col md:flex-row gap-3 items-center justify-around w-full py-4 text-sm
        bg-white text-gray-500
        dark:bg-black dark:text-gray-400">
        <p className="hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
          <a href="https://github.com/Blank-16" target="_blank" rel="noreferrer">
            @Blank-16
          </a>
        </p>
        <p className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Please be respectful with your posts.
        </p>
      </footer>
    </>
  );
}
