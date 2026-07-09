import { NextResponse } from "next/server";
import { updateCardSchema } from "@/lib/validation/card";
import { getCard, updateCard } from "@/lib/repository/card";

type Context = { params: Promise<{ id: string }> };

// spec/04_card_edit.md FR-003
export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;

  // spec/04_card_edit.md E-003（存在チェックを先に行う）
  const card = await getCard(id);
  if (!card) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "指定されたカードが見つかりません" } },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = updateCardSchema.safeParse(body);

  // spec/04_card_edit.md E-001 / E-002
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

  const updated = await updateCard(id, parsed.data.title);
  return NextResponse.json(updated);
}
