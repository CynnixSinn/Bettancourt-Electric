import Image from 'next/image';

export default function AppHeader() {
  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex items-center">
        <Image
          src="/logo.png"
          alt="Bettancourt Electric Logo"
          width={200}
          height={50}
          data-ai-hint="company logo"
          priority
        />
      </div>
    </header>
  );
}
