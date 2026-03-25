import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Blogging Web"
      width={0}
      height={0}
      priority
      className={`h-8 w-auto rounded ${className}`}
    />
  );
}
