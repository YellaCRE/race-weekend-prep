import { getOfficialCalendar } from '@/lib/calendar-sync';
export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get('refresh') === '1';
  const payload = await getOfficialCalendar(force);
  return Response.json(payload, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
}
