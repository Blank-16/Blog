/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.appwrite.io',
      },
    ],
  },
  // Prevent Tiptap/prosemirror from being bundled for the Edge/SSR runtime.
  // These packages reference browser globals at module init and will crash
  // Vercel's Node.js SSR worker if not externalized.
  serverExternalPackages: [
    '@tiptap/core',
    '@tiptap/react',
    '@tiptap/starter-kit',
    '@tiptap/extension-image',
    '@tiptap/extension-placeholder',
    '@tiptap/html',
    'prosemirror-model',
    'prosemirror-state',
    'prosemirror-view',
    'prosemirror-transform',
  ],
};

export default nextConfig;
