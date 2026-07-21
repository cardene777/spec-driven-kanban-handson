// spec/012_member_invite.md § 画面（招待受け入れ）
// 認証系と同じく AppShell を使わず、全画面中央のカードパネルで表示する。
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inviteRepository, isExpired } from "@/lib/repository/invite";
import { memberRepository } from "@/lib/repository/member";
import { getSessionUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import AcceptInviteForm from "./_components/AcceptInviteForm";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </div>
  );
}

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  const user = await getSessionUser();

  if (!user) {
    return (
      <Panel title="ボードへの招待">
        <p className="text-sm text-muted-foreground">
          招待を受け取るにはログインが必要です。招待されたメールアドレスのアカウントでログインしてください。
        </p>
        <Link href="/login" className={buttonVariants()}>
          ログイン
        </Link>
        <Link href="/signup" className={buttonVariants({ variant: "outline" })}>
          アカウントを作成
        </Link>
      </Panel>
    );
  }

  const invite = await inviteRepository.findByToken(token);
  if (!invite) {
    return (
      <Panel title="招待が見つかりません">
        <p className="text-sm text-muted-foreground">
          招待リンクが正しくない可能性があります。ボードのオーナーに再送を依頼してください。
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          ボード一覧へ
        </Link>
      </Panel>
    );
  }

  if (invite.status === "revoked" || isExpired(invite.expiresAt)) {
    return (
      <Panel title="招待の有効期限が切れています">
        <p className="text-sm text-muted-foreground">
          この招待は期限切れまたは失効しています。ボードのオーナーに再送を依頼してください。
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          ボード一覧へ
        </Link>
      </Panel>
    );
  }

  if (invite.status === "accepted") {
    return (
      <Panel title="この招待は使用済みです">
        <p className="text-sm text-muted-foreground">この招待は既に承認されています。</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          ボード一覧へ
        </Link>
      </Panel>
    );
  }

  // 本人性の確認: 招待の email とログイン中ユーザーの email が一致すること
  if (invite.email !== user.email) {
    return (
      <Panel title="別のアカウントでログインしています">
        <p className="text-sm text-muted-foreground">
          この招待は <span className="font-medium">{invite.email}</span> 宛です。
          招待されたメールアドレスのアカウントでログインし直してください。
        </p>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          ログインし直す
        </Link>
      </Panel>
    );
  }

  const already = await memberRepository.find(invite.boardId, user.id);
  if (already) {
    return (
      <Panel title="既にメンバーです">
        <p className="text-sm text-muted-foreground">
          あなたは既にこのボードのメンバーです。
        </p>
        <Link href={`/boards/${invite.boardId}`} className={buttonVariants()}>
          ボードを開く
        </Link>
      </Panel>
    );
  }

  const board = await prisma.board.findUnique({
    where: { id: invite.boardId },
    select: { title: true },
  });

  return (
    <Panel title="ボードへの招待">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{board?.title ?? ""}</span> に{" "}
        <span className="font-medium text-foreground">{invite.role}</span> として招待されています。
      </p>
      <AcceptInviteForm token={token} />
    </Panel>
  );
}
