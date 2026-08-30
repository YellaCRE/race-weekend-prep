import { getF1OfficialRace } from '@/lib/f1-official';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9-]+$/.test(slug)) return Response.json({ error: 'Invalid F1 race slug.' }, { status: 400 });
  return Response.json(await getF1OfficialRace(slug), { headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600' } });
}
