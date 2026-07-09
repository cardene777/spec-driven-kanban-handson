import { NextResponse } from "next/server";
import { createCardSchema } from "@/lib/validation/card";
import { getList } from "@/lib/repository/list";
import { createCard, listCards } from "@/lib/repository/card";

type Context = { params: Promise<{ id: string }> };

const listNotFound = () =>
  NextResponse.json(
    { error: { code: "NOT_FOUND", message: "指定されたリストが見つかりません" } },
    { status: 404 },
  );

// spec/03_card.md FR-001
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;

  // spec/03_card.md E-003
  const list = await getList(id);
  if (!list) return listNotFound();

  const cards = await listCards(id);
  return NextResponse.json(cards);
}

// spec/03_card.md FR-003
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;

  // spec/03_card.md E-003（存在チェックを先に行う）
  const list = await getList(id);
  if (!list) return listNotFound();

  const body = await request.json().catch(() => null);
  const parsed = createCardSchema.safeParse(body);

  // spec/03_card.md E-001 / E-002
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "titleは1〜200文字で入力してください",
        },
      },
      { status: 400 },
    );
  }

  const card = await createCard(id, parsed.data.title);
  return NextResponse.json(card, { status: 201 });
}
