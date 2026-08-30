'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TZDate } from '@date-fns/tz';
import { ArrowLeft, CalendarDays, Clock3, MapPin } from 'lucide-react';
import { useParams } from 'next/navigation';
import type { CalendarPayload, CalendarSession, Race } from '@/lib/calendar-sync';

const sessionOrder: CalendarSession['name'][] = ['Practice 1', 'Practice 2', 'Practice 3', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'];
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function RaceDetailPage() {
  const params = useParams<{ slug: string }>();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar', { cache: 'no-store' }).then((response) => response.json()).then((payload: CalendarPayload) => setRaces(payload.races)).finally(() => setLoading(false));
  }, []);

  const race = useMemo(() => races.find((entry) => slugify(entry.name) === params.slug), [params.slug, races]);
  const sessions = useMemo(() => [...(race?.sessions ?? [])].sort((left, right) => sessionOrder.indexOf(left.name) - sessionOrder.indexOf(right.name)), [race]);

  if (loading) return <main className="race-detail loading"><p>공식 일정 불러오는 중</p></main>;
  if (!race) return <main className="race-detail loading"><p>레이스 정보를 찾을 수 없습니다.</p><a href="/#calendar">캘린더로 돌아가기</a></main>;

  return <main className="race-detail"><header className="detail-topbar"><a href="/#calendar"><ArrowLeft size={17} /> 캘린더</a><span>RACE WEEKEND PREP</span></header><section className="detail-hero"><p className="eyebrow"><CalendarDays size={14} /> {race.series} RACE WEEKEND · KST</p><h1>{race.name}</h1><p className="detail-date">{race.date} · {race.country}</p><p className="detail-circuit"><MapPin size={16} /> {race.circuit}</p></section><section className="detail-schedule"><div><p className="eyebrow dark"><Clock3 size={14} /> WEEKEND SCHEDULE</p><h2>상세 일정</h2></div>{sessions.length > 0 ? <div className="session-list">{sessions.map((session) => <article className="session-row" key={session.name}><span className="session-name">{session.name}</span><div><b>{format(TZDate.tz('Asia/Seoul', session.startsAt), 'M월 d일 (EEE)', { locale: ko })}</b><strong>{session.time} <small>KST</small></strong></div></article>)}</div> : <p className="session-empty">공식 세션 시간은 확정되는 대로 표시됩니다.</p>}</section></main>;
}
