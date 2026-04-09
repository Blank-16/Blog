import Image from 'next/image';

interface LogoProps {
  className?: string;
  /** Set to true only when the logo is above the fold and should be preloaded. */
  priority?: boolean;
}

export default function Logo({ className = '', priority = false }: LogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Blogging Web"
      width={0}
      height={0}
      priority={priority}
      className={`h-8 w-auto rounded ${className}`}
    />
  );
}
