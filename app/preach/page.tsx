import Link from "next/link";
import { listAvailableProspects } from "@/lib/social-graph/model";

export default function PreachIndexPage() {
  const prospects = listAvailableProspects();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">오늘의 길거리</h1>
      <p className="text-sm text-neutral-400">
        지나가는 사람을 골라 말을 걸어보자.
      </p>
      <ul className="flex flex-col gap-3">
        {prospects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/preach/${p.id}`}
              className="block rounded-xl border border-neutral-800 p-4 active:bg-neutral-900"
            >
              <div className="font-semibold">{p.displayName}</div>
              <div className="text-xs text-neutral-400">{p.hook}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
