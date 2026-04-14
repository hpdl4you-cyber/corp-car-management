import { NextResponse } from "next/server";
import { and, eq, isNull, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { reservations, vehicles, users } from "@/db/schema";
import { sendTeamsMessage } from "@/lib/graph";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // Vercel Cron 인증
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3005");

  // KST 기준 오늘 날짜 (UTC+9)
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKst = new Date(
    Date.UTC(
      nowKst.getUTCFullYear(),
      nowKst.getUTCMonth(),
      nowKst.getUTCDate(),
    ),
  );
  // 오늘 KST 자정 UTC
  const tomorrowKst = new Date(todayKst.getTime() + 24 * 60 * 60 * 1000);

  // 오늘 KST 08:00 UTC
  const eightAmKst = new Date(todayKst.getTime() - 9 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000);
  // 실제 현재 UTC
  const nowUtc = new Date();

  const db = getDb();

  // 오늘 예약 중 아직 알림 미발송이고 (08:00 KST OR 예약시작시간) 중 빠른 시각 <= 지금
  const rows = await db
    .select({
      id: reservations.id,
      startAt: reservations.startAt,
      checkinToken: reservations.checkinToken,
      checkoutToken: reservations.checkoutToken,
      entraObjectId: users.entraObjectId,
      userName: users.name,
      plate: vehicles.plate,
      model: vehicles.model,
    })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .innerJoin(vehicles, eq(reservations.vehicleId, vehicles.id))
    .where(
      and(
        eq(reservations.status, "confirmed"),
        isNull(reservations.notificationSentAt),
        isNull(reservations.checkinAt),
        gte(reservations.startAt, todayKst),
        lte(reservations.startAt, tomorrowKst),
      ),
    );

  let sent = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // 알림 발송 시각 = min(08:00 KST, startAt)
    const notifyAt =
      row.startAt < eightAmKst ? row.startAt : eightAmKst;

    if (nowUtc < notifyAt) continue; // 아직 발송 시각 아님

    if (!row.entraObjectId) continue; // Teams OID 없으면 skip

    const checkinUrl = `${appUrl}/checkin/${row.checkinToken}`;
    const checkoutUrl = `${appUrl}/checkout/${row.checkoutToken}`;

    const html = `
<p>안녕하세요, <strong>${row.userName}</strong>님 👋</p>
<p>오늘 법인차량 예약이 있습니다.</p>
<table style="border-collapse:collapse;margin:8px 0">
  <tr><td style="padding:2px 8px 2px 0;color:#666">차량</td><td><strong>${row.plate} (${row.model})</strong></td></tr>
  <tr><td style="padding:2px 8px 2px 0;color:#666">출발</td><td>${row.startAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td></tr>
</table>
<p>
  <a href="${checkinUrl}" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;margin-right:8px">🚗 체크인</a>
  <a href="${checkoutUrl}" style="display:inline-block;padding:8px 16px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none">🏁 체크아웃</a>
</p>
<p style="color:#999;font-size:12px">이 링크는 예약자 본인만 사용하세요.</p>
    `.trim();

    try {
      await sendTeamsMessage({ userEntraOid: row.entraObjectId, htmlBody: html });

      await db
        .update(reservations)
        .set({ notificationSentAt: new Date() })
        .where(eq(reservations.id, row.id));

      sent++;
    } catch (e) {
      errors.push(`${row.id}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ sent, errors, checked: rows.length });
}
