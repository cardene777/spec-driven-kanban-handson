// spec/011_auth.md § FR-04 / design/011_auth.md § GET /api/auth/me
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/http/withApiHandler";
import { requireCurrentUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return withApiHandler(
    async () => {
      const user = await requireCurrentUser(request);
      const res = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name },
      });
      res.headers.set("Cache-Control", "no-store");
      return res;
    },
    { event: "auth.me", targetType: "user" },
  );
}
