import { isAdminConfigured } from "@/lib/firebase-admin";
import { buildWeeklyReports } from "@/server/weekly-core";

/*
 * Scheduled job (vercel.json): every Thursday at 18:00 Qatar time (15:00 UTC), before the
 * Friday-Saturday weekend, build the week's report for every project with daily reports.
 * The reports wait in Project reports > Weekly for a Super Admin to approve.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!isAdminConfigured()) return Response.json({ ok: false, error: "not configured" }, { status: 500 });
  const outcome = await buildWeeklyReports("schedule");
  return Response.json({ ok: true, ...outcome });
}
