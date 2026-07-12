"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CardRow({
  card,
  boardId: _boardId,
}: {
  card: { id: string; title: string; order: number };
  boardId: string;
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
      className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
    >
      <div className="font-medium">{card.title}</div>
      <div className="text-xs text-gray-400">order={card.order}</div>
    </button>
  );
}
