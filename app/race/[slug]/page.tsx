'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TZDate } from '@date-fns/tz';
import { ArrowLeft, CalendarDays, Clock3, ExternalLink, MapPin, Trophy } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { CalendarPayload, CalendarSession, Race } from '@/lib/calendar-sync';
import type { F1OfficialRace } from '@/lib/f1-official';

const sessionOrder: CalendarSession['name'][] = ['Practice 1', 'Practice 2', 'Practice 3', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'];
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const teamColors: Record<string, string> = { McLaren: '#ff8000', Mercedes: '#27f4d2', Ferrari: '#e8002d', 'Red Bull Racing': '#3671c6', Williams: '#64c4ff', 'Haas F1 Team': '#b6babd', 'Racing Bulls': '#6692ff', 'Aston Martin': '#229971', Alpine: '#ff87bc', Audi: '#c00000', Cadillac: '#b59b65' };
const teamColor = (team: string | undefined) => teamColors[team ?? ''] ?? '#6f747a';

export default function RaceDetailPage() {
  const params = useParams<{ slug: string }>();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [official, setOfficial] = useState<F1OfficialRace>();

  useEffect(() => {
    fetch('/api/calendar', { cache: 'no-store' }).then((response) => response.json()).then((payload: CalendarPayload) => setRaces(payload.races)).finally(() => setLoading(false));
  }, []);

  const race = useMemo(() => races.find((entry) => slugify(entry.name) === params.slug), [params.slug, races]);
  const sessions = useMemo(() => [...(race?.sessions ?? [])].sort((left, right) => sessionOrder.indexOf(left.name) - sessionOrder.indexOf(right.name)), [race]);
  const resultColumns = useMemo(() => official?.results?.headers.map((header, index) => ({ header, index })).filter((column) => column.header !== 'No.' && column.header !== 'Laps') ?? [], [official]);

  useEffect(() => {
    if (race?.series !== 'F1') return;
    const officialSlug = race.sourceUrl.split('/').filter(Boolean).at(-1);
    if (!officialSlug || officialSlug === '2026') return;
    fetch('/api/f1/' + officialSlug, { cache: 'no-store' }).then(async (response) => response.ok ? await response.json() as F1OfficialRace : undefined).then((payload) => setOfficial(payload)).catch(() => setOfficial(undefined));
  }, [race]);

  if (loading) return <main className="race-detail loading"><p>공식 일정 불러오는 중</p></main>;
  if (!race) return <main className="race-detail loading"><p>레이스 정보를 찾을 수 없습니다.</p><a href="/#calendar">캘린더로 돌아가기</a></main>;

  return <main className="race-detail"><header className="detail-topbar"><a href="/#calendar"><ArrowLeft size={17} /> 캘린더</a><a className="brand" href="/#top" aria-label="Race Weekend Prep 홈"><span>RACE WEEKEND</span> PREP</a></header><section className="detail-hero"><p className="eyebrow"><CalendarDays size={14} /> {race.series} RACE WEEKEND · KST</p><h1>{race.name}</h1><p className="detail-date">{race.date} · {race.country}</p><p className="detail-circuit"><MapPin size={16} /> {race.circuit}</p></section><section className="detail-schedule"><div><p className="eyebrow dark"><Clock3 size={14} /> WEEKEND SCHEDULE</p><h2>상세 일정</h2></div>{sessions.length > 0 ? <div className="session-list"><div className="session-timeline">{sessions.map((session, index) => <article className="session-row" key={session.name}><b className="session-name">{session.name}</b><span className="session-node">{String(index + 1).padStart(2, '0')}</span><div><strong>{session.time} <small>KST</small></strong><b>{format(TZDate.tz('Asia/Seoul', session.startsAt), 'M월 d일 (EEE)', { locale: ko })}</b></div></article>)}</div></div> : <p className="session-empty">공식 세션 시간은 확정되는 대로 표시됩니다.</p>}</section>{race.series === 'F1' && <><section className="official-section"><div className="official-heading"><div><p className="eyebrow dark"><MapPin size={14} /> F1 OFFICIAL CIRCUIT</p><h2>{race.circuit}</h2></div><a href={official?.circuit?.sourceUrl ?? race.sourceUrl} target="_blank" rel="noreferrer">F1 Circuit <ExternalLink size={14} /></a></div>{official?.circuit ? <div className="official-circuit"><img src={official.circuit.imageUrl} alt={official.circuit.name + ' circuit map'} /><dl>{official.circuit.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd>{fact.detail && <small>{fact.detail}</small>}</div>)}</dl></div> : <p className="session-empty">F1 공식 서킷 정보를 불러오는 중입니다.</p>}</section><section className="official-section official-results"><div className="official-heading"><div><p className="eyebrow dark"><Trophy size={14} /> F1 OFFICIAL RESULTS</p><h2>Race Results</h2></div><a href={official?.results?.sourceUrl ?? 'https://www.formula1.com/en/results/2026/races'} target="_blank" rel="noreferrer">F1 Results <ExternalLink size={14} /></a></div>{official?.results ? <div className="results-table-wrap"><table><thead><tr>{resultColumns.map((column) => <th key={column.header}>{column.header}</th>)}</tr></thead><tbody>{official.results.rows.map((row, index) => <tr key={index}>{resultColumns.map((column) => <td key={column.header}>{column.header === 'Driver' ? <span className="driver-cell"><span className="driver-portrait" style={{ borderColor: teamColor(row.cells[official.results.headers.indexOf('Team')]) }}>{row.driverImageUrl && <img src={row.driverImageUrl} alt="" />}</span>{row.cells[column.index]}</span> : column.header === 'Team' ? <span className="team-name" style={{ color: teamColor(row.cells[column.index]) }}>{row.cells[column.index]}</span> : row.cells[column.index]}</td>)}</tr>)}</tbody></table></div> : <p className="session-empty">레이스가 아직 진행되지 않았습니다. 공식 결과는 레이스 종료 후 표시됩니다.</p>}</section></>}</main>;
}
