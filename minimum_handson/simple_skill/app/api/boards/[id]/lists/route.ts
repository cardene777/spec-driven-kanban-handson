import { NextResponse } from "next/server";
import { createListSchema } from "@/lib/validation/list";
import { getBoard } from "@/lib/repository/board";
import { createList, listLists } from "@/lib/repository/list";

type Context = { params: Promise<{ id: string }> };

const boardNotFound = () =>
  NextResponse.json(
    { error: { code: "NOT_FOUND", message: "指定されたボードが見つかりません" } },
    { status: 404 },
  );

// spec/02_list.md FR-001
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;

  // spec/02_list.md E-003
  const board = await getBoard(id);
  if (!board) return boardNotFound();

  const lists = await listLists(id);
  return NextResponse.json(lists);
}

// spec/02_list.md FR-003
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;

  // spec/02_list.md E-003（存在チェックを先に行う）
  const board = await getBoard(id);
  if (!board) return boardNotFound();

  const body = await request.json().catch(() => null);
  const parsed = createListSchema.safeParse(body);

  // spec/02_list.md E-001 / E-002
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "titleは1〜100文字で入力してください",
        },
      },
      { status: 400 },
    );
  }

  const list = await createList(id, parsed.data.title);
  return NextResponse.json(list, { status: 201 });
}
