"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import LabelBadge from "@/components/labels/LabelBadge";
import CardDueDateBadge from "@/components/cards/CardDueDateBadge";
import type { Label } from "@/lib/labels/colors";

export type CardRowData = {
  id: string;
  title: string;
  order: number;
  dueDate: string | null;
  labels: Label[];
};

export default function CardRow({
  card,
  boardId: _boardId,
}: {
  card: CardRowData;
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

  const hasMeta = card.labels.length > 0 || card.dueDate !== null;

  return (
    <Button
      variant="outline"
      onClick={openModal}
      className="h-auto w-full flex-col items-start justify-start gap-1.5 bg-card px-3 py-2 text-left"
    >
      <span className="flex w-full items-start gap-2">
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
        <span className="truncate text-sm font-medium">{card.title}</span>
      </span>
      {hasMeta ? (
        <span className="flex flex-wrap items-center gap-1 pl-3.5">
          {card.labels.map((l) => (
            <LabelBadge key={l.id} name={l.name} color={l.color} />
          ))}
          <CardDueDateBadge dueDate={card.dueDate} />
        </span>
      ) : null}
    </Button>
  );
}
