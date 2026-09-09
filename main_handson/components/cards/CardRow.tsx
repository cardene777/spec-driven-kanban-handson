"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CardRow({
  card,
}: {
  card: { id: string; title: string; order: number };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function openModal() {
    const params = new URLSearchParams(searchParams);
    params.set("card", card.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      onClick={openModal}
      className="w-full rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2.5 text-left text-sm text-neutral-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    >
      <div className="font-medium">{card.title}</div>
    </button>
  );
}
