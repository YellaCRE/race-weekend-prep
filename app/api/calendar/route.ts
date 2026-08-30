import { getOfficialCalendar } from '@/lib/calendar-sync';
import { readStoredCalendar, saveCalendar, shouldRefreshCalendar } from '@/lib/calendar-store';

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get('refresh') === '1';
  const stored = await readStoredCalendar();
  if (stored && !force && !shouldRefreshCalendar(stored.updatedAt)) {
    return Response.json(stored, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
  }

  const imported = await getOfficialCalendar(force);
  if (imported.mode === 'official-sync') {
    await saveCalendar(imported);
    return Response.json(imported, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
  }

  const payload = stored ?? imported;
  return Response.json(payload, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
}
