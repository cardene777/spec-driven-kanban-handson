"use client";

// spec/004_card_movement_archive_restore.md § 画面（アーカイブ／削除の一覧と復元）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CardRow = { id: string; listId: string; title: string };
type ListRef = { id: string; title: string };

export default function ArchivePanel({ lists }: { lists: ListRef[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [archived, setArchived] = useState<CardRow[]>([]);
  const [deleted, setDeleted] = useState<CardRow[]>([]);

  async function load() {
    const arch: CardRow[] = [];
    const del: CardRow[] = [];
    for (const l of lists) {
      const a = await fetch(`/api/lists/${l.id}/cards?status=archived`)
        .then((r) => r.json())
        .catch(() => ({ items: [] }));
      const d = await fetch(`/api/lists/${l.id}/cards?status=deleted`)
        .then((r) => r.json())
        .catch(() => ({ items: [] }));
      arch.push(...(a.items ?? []));
      del.push(...(d.items ?? []));
    }
    setArchived(arch);
    setDeleted(del);
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function act(url: string, method: string) {
    await fetch(url, { method });
    await load();
    router.refresh();
  }

  return (
    <div>
      <Button variant="outline" onClick={toggle}>
        {open ? "アーカイブ／ゴミ箱を閉じる" : "アーカイブ／ゴミ箱を表示"}
      </Button>

      {open && (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">アーカイブ済み（{archived.length}）</CardTitle>
            </CardHeader>
            <CardContent>
              {archived.length === 0 ? (
                <p className="text-xs text-muted-foreground">なし</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {archived.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-sm"
                    >
                      <span className="truncate">{c.title}</span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => act(`/api/cards/${c.id}/unarchive`, "POST")}
                      >
                        復元
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ゴミ箱（{deleted.length}）</CardTitle>
            </CardHeader>
            <CardContent>
              {deleted.length === 0 ? (
                <p className="text-xs text-muted-foreground">なし</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {deleted.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-sm"
                    >
                      <span className="truncate">{c.title}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => act(`/api/cards/${c.id}/restore`, "POST")}
                        >
                          復元
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => act(`/api/cards/${c.id}/purge`, "DELETE")}
                        >
                          完全削除
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
