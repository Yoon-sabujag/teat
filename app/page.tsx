import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 p-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">도(道)믿남</h1>
        <p className="mt-2 text-sm text-neutral-400">
          거리에서 진리를 전하고, 신도를 모으라.
        </p>
      </header>

      <nav className="flex w-full flex-col gap-3">
        <Link
          href="/preach"
          className="rounded-2xl bg-amber-500 px-5 py-4 text-center font-semibold text-black active:scale-[0.98]"
        >
          오늘의 전도 나가기
        </Link>
        <Link
          href="/congregation"
          className="rounded-2xl border border-neutral-700 px-5 py-4 text-center"
        >
          신도 관리
        </Link>
      </nav>
    </main>
  );
}
