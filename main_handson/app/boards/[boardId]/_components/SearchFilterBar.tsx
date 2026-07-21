"use client";

// design/005_008_ui_features_ui.md § Organism: SearchFilterBar / spec/008
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SearchBar from "./SearchBar";
import FilterControls, { type Filters } from "./FilterControls";

type Label = { id: string; name: string };

const DEFAULT_FILTERS: Filters = { labelId: "", due: "any", status: "active" };

export default function SearchFilterBar({
  boardId,
  boardLabels,
  onResult,
}: {
  boardId: string;
  boardLabels: Label[];
  onResult: (ids: string[] | null) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);

  const isDefault =
    keyword.trim() === "" &&
    filters.labelId === "" &&
    filters.due === "any" &&
    filters.status === "active";

  async function apply() {
    setError(null);
    if (isDefault) {
      onResult(null);
      return;
    }
    const qs = new URLSearchParams();
    if (keyword) qs.set("keyword", keyword);
    if (filters.labelId) qs.set("labelId", filters.labelId);
    qs.set("due", filters.due);
    qs.set("status", filters.status);
    const res = await fetch(`/api/boards/${boardId}/search?${qs.toString()}`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "検索に失敗しました");
      return;
    }
    const body = await res.json();
    onResult(body.items.map((c: { id: string }) => c.id));
  }

  function clear() {
    setKeyword("");
    setFilters(DEFAULT_FILTERS);
    setError(null);
    onResult(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={keyword} onChange={setKeyword} />
        <FilterControls boardLabels={boardLabels} filters={filters} onChange={setFilters} />
        <Button onClick={apply}>検索</Button>
        <Button variant="outline" onClick={clear}>
          クリア
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
