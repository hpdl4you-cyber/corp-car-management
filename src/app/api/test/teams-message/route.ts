import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { sendTeamsMessage } from "@/lib/graph";
import { requireAdmin } from "@/lib/rbac";

export const runtime = "nodejs";

/**
 * GET /api/test/teams-message?email=xxx@yyy.com
 * 관리자 전용 Teams 메시지 발송 테스트 엔드포인트.
 * 배포 확인 후 삭제 예정.
 */
export async function GET(req: Request) {
  // 관리자만 호출 가능
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "email query param required" }, { status: 400 });
  }

  console.log(`[teams-test] Sending test message to: ${email}`);

  const db = getDb();
  const [targetUser] = await db
    .select({ id: users.id, name: users.name, entraObjectId: users.entraObjectId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!targetUser) {
    console.warn(`[teams-test] User not found: ${email}`);
    return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 });
  }

  if (!targetUser.entraObjectId) {
    console.warn(`[teams-test] User ${email} has no entraObjectId`);
    return NextResponse.json(
      { error: "User has no entraObjectId — must log in via MS365 first" },
      { status: 422 },
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3005");

  const html = `
<p>안녕하세요, <strong>${targetUser.name}</strong>님 👋</p>
<p>이것은 법인차량 관리 시스템의 <strong>Teams 알림 테스트</strong> 메시지입니다.</p>
<table style="border-collapse:collapse;margin:8px 0">
  <tr><td style="padding:2px 8px 2px 0;color:#666">시스템</td><td><strong>법인차량 관리</strong></td></tr>
  <tr><td style="padding:2px 8px 2px 0;color:#666">발송 시각</td><td>${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td></tr>
</table>
<p>
  <a href="${appUrl}" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">🚗 시스템 바로가기</a>
</p>
<p style="color:#999;font-size:12px">테스트 메시지입니다. 실제 예약 알림이 아닙니다.</p>
  `.trim();

  try {
    await sendTeamsMessage({ userEntraOid: targetUser.entraObjectId, htmlBody: html });
    return NextResponse.json({
      ok: true,
      message: `Test message sent to ${email} (${targetUser.name})`,
      entraObjectId: targetUser.entraObjectId,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
