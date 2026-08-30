'use client';

import { useEffect, useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Flag, Gauge, MapPin, Plus, TimerReset, Trophy, X } from 'lucide-react';
import type { CalendarPayload, Race } from '@/lib/calendar-sync';

type Lap = { id: number; circuit: string; car: string; game: string; time: string; date: string; note?: string };
const seedRaces: Race[] = [
  { series: 'F1', date: 'SEP 04–06', day: '06', name: 'Italian Grand Prix', circuit: 'Monza', country: 'Italy', time: 'TBA', accent: 'red', sourceUrl: '' },
  { series: 'WEC', date: 'SEP 25–27', day: '27', name: '6 Hours of Fuji', circuit: 'Fuji Speedway', country: 'Japan', time: 'TBA', accent: 'gold', sourceUrl: '' },
  { series: 'F1', date: 'SEP 11–13', day: '13', name: 'Spanish Grand Prix', circuit: 'Madrid', country: 'Spain', time: 'TBA', accent: 'red', sourceUrl: '' },
  { series: 'F1', date: 'SEP 24–26', day: '26', name: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit', country: 'Azerbaijan', time: 'TBA', accent: 'red', sourceUrl: '' },
];
const seedLaps: Lap[] = [
  { id: 1, circuit: 'Spa-Francorchamps', car: 'Ferrari 499P', game: 'Le Mans Ultimate', time: '2:18.642', date: '2026.08.27', note: '23°C · Dry · Soft' },
  { id: 2, circuit: 'Spa-Francorchamps', car: 'Ferrari 499P', game: 'Le Mans Ultimate', time: '2:19.104', date: '2026.08.20', note: '22°C · Dry · Soft' },
  { id: 3, circuit: 'Suzuka', car: 'McLaren MCL39', game: 'F1 2025', time: '1:29.387', date: '2026.08.14', note: 'Clear · Soft' },
];
const parseTime = (value: string) => { const [min, sec] = value.split(':'); return Number(min) * 60 + Number(sec); };
const monthIndex: Record<string, number> = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
const weekdayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const timeZone = 'Asia/Seoul';
const nowInKst = () => TZDate.tz(timeZone);
const dateKey = (date: Date) => format(date, 'yyyy-MM-dd');
const raceSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
function raceDateRange(race: Race) {
  const match = race.date.match(/([A-Z]{3})\s+(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/);
  if (!match) return null;
  const year = nowInKst().getFullYear();
  const start = new TZDate(year, monthIndex[match[1]], Number(match[2]), timeZone);
  const end = new TZDate(year, monthIndex[match[1]], Number(match[3] ?? match[2]), timeZone);
  return { start, end };
}

export default function Home() {
  const [series, setSeries] = useState<'ALL' | 'F1' | 'WEC'>('ALL');
  const [races, setRaces] = useState<Race[]>(seedRaces);
  const [displayedMonth, setDisplayedMonth] = useState(() => startOfMonth(nowInKst()));
  const [calendarStatus, setCalendarStatus] = useState('공식 일정 확인 중');
  const [laps, setLaps] = useState<Lap[]>(seedLaps);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { const saved = window.localStorage.getItem('race-weekend-prep-laps') ?? window.localStorage.getItem('apex-laps-v2'); if (saved) setLaps(JSON.parse(saved)); }, []);
  useEffect(() => { window.localStorage.setItem('race-weekend-prep-laps', JSON.stringify(laps)); }, [laps]);
  useEffect(() => {
    fetch('/api/calendar').then((response) => response.json()).then((payload: CalendarPayload) => {
      setRaces(payload.races);
      setCalendarStatus(payload.mode === 'official-sync' ? '공식 일정 동기화됨' : '공식 일정 캐시');
    }).catch(() => setCalendarStatus('저장된 일정 표시 중'));
  }, []);
  const datedRaces = useMemo(() => {
    return races.map((race) => ({ race, range: raceDateRange(race) })).filter((entry): entry is { race: Race; range: { start: Date; end: Date } } => entry.range !== null).sort((a, b) => a.range.start.getTime() - b.range.start.getTime());
  }, [races]);
  const filteredRaces = datedRaces.filter(({ race }) => series === 'ALL' || race.series === series);
  const calendarDays = useMemo(() => {
    const today = startOfDay(nowInKst());
    const month = displayedMonth;
    const first = startOfWeek(month, { weekStartsOn: 0 });
    const last = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: first, end: last });
    return { today, month, days };
  }, [displayedMonth]);
  const calendarBanners = useMemo(() => {
    type Banner = { race: Race; first: number; last: number; lane: number };
    const segments = filteredRaces.flatMap(({ race, range }) => {
      const calendarStart = calendarDays.days[0];
      const calendarEnd = calendarDays.days.at(-1);
      if (!calendarEnd || isBefore(range.end, calendarStart) || isAfter(range.start, calendarEnd)) return [];
      const first = calendarDays.days.findIndex((day) => !isBefore(day, range.start));
      const last = calendarDays.days.findLastIndex((day) => !isAfter(day, range.end));
      if (first < 0 || last < 0 || first > last) return [];
      const entries: Omit<Banner, 'lane'>[] = [];
      for (let cursor = first; cursor <= last;) {
        const weekEnd = Math.min(last, Math.floor(cursor / 7) * 7 + 6);
        entries.push({ race, first: cursor, last: weekEnd });
        cursor = weekEnd + 1;
      }
      return entries;
    });
    const laneEnds = new Map<number, number[]>();
    const banners = segments.sort((a, b) => a.first - b.first || b.last - a.last).map((segment) => {
      const week = Math.floor(segment.first / 7);
      const ends = laneEnds.get(week) ?? [];
      let lane = ends.findIndex((end) => end < segment.first);
      if (lane < 0) lane = ends.length;
      ends[lane] = segment.last;
      laneEnds.set(week, ends);
      return { ...segment, lane };
    });
    return { banners, weekLaneCounts: Array.from({ length: calendarDays.days.length / 7 }, (_, week) => laneEnds.get(week)?.length ?? 0) };
  }, [calendarDays.days, filteredRaces]);
  const calendarRowTemplate = calendarBanners.weekLaneCounts.map((count) => `minmax(${112 + count * 44}px, 1fr)`).join(' ');
  const bestLap = useMemo(() => [...laps.filter((lap) => lap.circuit === 'Spa-Francorchamps' && lap.car === 'Ferrari 499P')].sort((a, b) => parseTime(a.time) - parseTime(b.time))[0], [laps]);
  function saveLap(formData: FormData) {
    const newLap: Lap = { id: Date.now(), circuit: String(formData.get('circuit')), car: String(formData.get('car')), game: String(formData.get('game')), time: String(formData.get('time')), date: format(nowInKst(), 'yyyy. MM. dd'), note: String(formData.get('note') || '주행 조건 미입력') };
    setLaps((current) => [newLap, ...current]); setNotice(newLap.circuit + ' 기록이 저장되었습니다.'); setIsFormOpen(false); window.setTimeout(() => setNotice(''), 3500);
  }
  return <main>
    <nav className="topbar"><a className="brand" href="#top" aria-label="Race Weekend Prep 홈"><span>RACE WEEKEND</span> PREP</a><div className="navlinks"><a href="#calendar">캘린더</a><a href="#circuit">서킷</a><a href="#laps">내 기록</a></div><button className="profile" onClick={() => setIsFormOpen(true)}><Plus size={15} /> 랩타임 추가</button></nav>
    <section id="top" className="hero"><img src="/spa-hero.png" alt="숲을 가로지르는 레이스 서킷" /><div className="hero-shade" /><div className="hero-content"><p className="eyebrow"><span className="live-dot" /> 2026 SEASON · KST</p><h1>RACE WEEKEND,<br /><em>PREP YOUR LAP.</em></h1><p className="hero-copy">F1과 WEC의 순간을 앞두고,<br />당신의 가장 빠른 랩으로 먼저 준비하세요.</p><div className="next-race"><span className="series-pill">F1</span><div><b>ITALIAN GRAND PRIX</b><small>MONZA · 6 SEP, 22:00</small></div><ChevronRight size={20} /></div></div><div className="hero-stats"><div><strong>07</strong><span>DAYS TO GO</span></div><div><strong>2:18.642</strong><span>SPA PERSONAL BEST</span></div></div></section>
    <section id="calendar" className="section calendar-section"><div className="section-heading"><div><p className="eyebrow dark"><CalendarDays size={14} /> RACE CALENDAR</p><h2>레이스 캘린더</h2><p className="sync-status">{calendarStatus} · KST 기준 · {filteredRaces.length}개 시즌 레이스</p></div><div className="filter" aria-label="시리즈 필터">{(['ALL', 'F1', 'WEC'] as const).map((item) => <button key={item} className={series === item ? 'selected' : ''} onClick={() => setSeries(item)}>{item === 'ALL' ? '전체' : item}</button>)}</div></div><div className="calendar-frame"><div className="calendar-range"><button className="calendar-month-button" type="button" onClick={() => setDisplayedMonth((month) => addMonths(month, -1))} aria-label="이전 달"><ChevronLeft size={18} /></button><b>{format(calendarDays.month, 'yyyy년 M월')}</b><button className="calendar-month-button" type="button" onClick={() => setDisplayedMonth((month) => addMonths(month, 1))} aria-label="다음 달"><ChevronRight size={18} /></button></div><div className="calendar-weekdays">{weekdayLabels.map((day) => <span key={day}>{day}</span>)}</div><div className="month-grid"><div className="calendar-days" style={{ gridTemplateRows: calendarRowTemplate }}>{calendarDays.days.map((day) => { const isToday = isSameDay(day, calendarDays.today); const isOutsideMonth = !isSameMonth(day, calendarDays.month); return <div className={'calendar-day' + (isToday ? ' today' : '') + (isOutsideMonth ? ' outside-month' : '')} key={dateKey(day)}><time dateTime={dateKey(day)}>{day.getDate()}</time></div>; })}</div><div className="calendar-banners" style={{ gridTemplateRows: calendarRowTemplate }}>{calendarBanners.banners.map(({ race, first, last, lane }) => <a className={'calendar-weekend ' + race.accent} href={'/race/' + raceSlug(race.name)} key={race.series + race.name + first} style={{ gridColumn: String(first % 7 + 1) + ' / ' + String(last % 7 + 2), gridRow: String(Math.floor(first / 7) + 1), marginTop: `${34 + lane * 44}px` }}><span>{race.date}</span><b>{race.name}</b><small>{race.circuit} · {race.country}</small></a>)}</div></div></div>{calendarBanners.banners.length === 0 && <p className="calendar-empty">이 달에 예정된 {series === 'ALL' ? '' : series + ' '}레이스가 없습니다.</p>}</section>
    <section id="circuit" className="section circuit-section"><div className="circuit-copy"><p className="eyebrow dark"><Flag size={14} /> FEATURED CIRCUIT</p><h2>Spa-<br />Francorchamps</h2><p>아르덴 숲을 가로지르는 7.004km. 고저차와 빠른 코너가 만들어내는, 레이싱의 가장 순수한 리듬.</p><div className="track-metrics"><div><b>7.004</b><span>KM LENGTH</span></div><div><b>19</b><span>CORNERS</span></div><div><b>102m</b><span>ELEVATION</span></div></div><button className="text-button">서킷 프로필 보기 <ChevronRight size={16} /></button></div><div className="track-panel"><div className="track-glow" /><div className="track-line"><span className="t1">01</span><span className="t2">07</span><span className="t3">12</span><span className="t4">18</span></div><p>SPA-FRANCORCHAMPS · BELGIUM</p></div></section>
    <section id="laps" className="section lap-section"><div className="section-heading"><div><p className="eyebrow dark"><TimerReset size={14} /> SIM RACING LOG</p><h2>나의 랩타임</h2></div><button className="dark-button" onClick={() => setIsFormOpen(true)}><Plus size={16} /> 기록 추가</button></div><div className="lap-layout"><div className="pb-card"><div className="pb-top"><span>PERSONAL BEST</span><Trophy size={20} /></div><h3>{bestLap?.time ?? '—'}</h3><p>SPA-FRANCORCHAMPS · FERRARI 499P</p><div className="pb-footer"><span><Gauge size={14} /> LMU · DRY</span><span className="improvement">▲ 0.462</span></div></div><div className="lap-list">{laps.slice(0, 4).map((lap, index) => <article className="lap-row" key={lap.id}><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><b>{lap.circuit}</b><p>{lap.car} · {lap.game}</p></div><div className="lap-time"><strong>{lap.time}</strong><small>{lap.date}</small></div></article>)}</div></div></section>
    <footer>RACE WEEKEND PREP <span>PREP THE TRACK. OWN THE WEEKEND.</span></footer>
    {notice && <div className="toast">{notice}</div>}
    {isFormOpen && <div className="modal-backdrop" role="presentation"><form className="lap-modal" action={saveLap}><button className="close" type="button" onClick={() => setIsFormOpen(false)} aria-label="닫기"><X size={20} /></button><p className="eyebrow dark">NEW LAP</p><h2>랩타임 기록</h2><label>게임<select name="game" defaultValue="F1 2025"><option>F1 2025</option><option>Le Mans Ultimate</option></select></label><label>서킷<select name="circuit" defaultValue="Spa-Francorchamps"><option>Spa-Francorchamps</option><option>Monza</option><option>Suzuka</option><option>Fuji Speedway</option></select></label><label>차량<input required name="car" placeholder="예: Ferrari 499P" /></label><label>랩타임<input required name="time" placeholder="예: 2:18.642" pattern="[0-9]+:[0-9]{2}\\.[0-9]{3}" /></label><label>주행 메모<input name="note" placeholder="예: Dry · Soft · 23°C" /></label><button className="save" type="submit">기록 저장 <ChevronRight size={16} /></button></form></div>}
  </main>;
}
