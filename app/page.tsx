'use client';

import { useEffect, useMemo, useState } from 'react';
import { ko } from 'date-fns/locale';
import { CalendarDays, ChevronRight, Clock3, Flag, Gauge, MapPin, Plus, TimerReset, Trophy, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
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
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dateKey = (date: Date) => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
const raceSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
function raceDateRange(race: Race) {
  const match = race.date.match(/([A-Z]{3})\s+(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?/);
  if (!match) return null;
  const start = new Date(new Date().getFullYear(), monthIndex[match[1]], Number(match[2]));
  const end = new Date(new Date().getFullYear(), monthIndex[match[1]], Number(match[3] ?? match[2]));
  return { start, end };
}

export default function Home() {
  const [series, setSeries] = useState<'ALL' | 'F1' | 'WEC'>('ALL');
  const [races, setRaces] = useState<Race[]>(seedRaces);
  const [calendarMonth, setCalendarMonth] = useState(startOfDay(new Date()));
  const [calendarStatus, setCalendarStatus] = useState('공식 일정 확인 중');
  const [laps, setLaps] = useState<Lap[]>(seedLaps);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { const saved = window.localStorage.getItem('race-weekend-prep-laps') ?? window.localStorage.getItem('apex-laps-v2'); if (saved) setLaps(JSON.parse(saved)); }, []);
  useEffect(() => { window.localStorage.setItem('race-weekend-prep-laps', JSON.stringify(laps)); }, [laps]);
  useEffect(() => {
    fetch('/api/calendar').then((response) => response.json()).then((payload: CalendarPayload) => {
      setRaces(payload.races);
      const firstRace = payload.races.map((race) => raceDateRange(race)).find((range) => range && range.end >= startOfDay(new Date()));
      if (firstRace) setCalendarMonth(firstRace.start);
      setCalendarStatus(payload.mode === 'official-sync' ? '공식 일정 동기화됨' : '공식 일정 캐시');
    }).catch(() => setCalendarStatus('저장된 일정 표시 중'));
  }, []);
  const upcomingRaces = useMemo(() => {
    const today = startOfDay(new Date());
    const limit = new Date(today); limit.setDate(limit.getDate() + 30);
    return races.map((race) => ({ race, range: raceDateRange(race) })).filter((entry): entry is { race: Race; range: { start: Date; end: Date } } => entry.range !== null && entry.range.end >= today && entry.range.start <= limit).sort((a, b) => a.range.start.getTime() - b.range.start.getTime());
  }, [races]);
  const filteredRaces = upcomingRaces.filter(({ race }) => series === 'ALL' || race.series === series);
  const racesByDay = useMemo(() => {
    const days = new Map<string, { race: Race; isStart: boolean }>();
    filteredRaces.forEach(({ race, range }) => {
      for (const day = new Date(range.start); day <= range.end; day.setDate(day.getDate() + 1)) days.set(dateKey(day), { race, isStart: dateKey(day) === dateKey(range.start) });
    });
    return days;
  }, [filteredRaces]);
  const f1RaceDays = useMemo(() => [...racesByDay.entries()].filter(([, entry]) => entry.race.series === 'F1').map(([day]) => new Date(day + 'T00:00:00')), [racesByDay]);
  const wecRaceDays = useMemo(() => [...racesByDay.entries()].filter(([, entry]) => entry.race.series === 'WEC').map(([day]) => new Date(day + 'T00:00:00')), [racesByDay]);
  const bestLap = useMemo(() => [...laps.filter((lap) => lap.circuit === 'Spa-Francorchamps' && lap.car === 'Ferrari 499P')].sort((a, b) => parseTime(a.time) - parseTime(b.time))[0], [laps]);
  function saveLap(formData: FormData) {
    const newLap: Lap = { id: Date.now(), circuit: String(formData.get('circuit')), car: String(formData.get('car')), game: String(formData.get('game')), time: String(formData.get('time')), date: new Date().toLocaleDateString('ko-KR'), note: String(formData.get('note') || '주행 조건 미입력') };
    setLaps((current) => [newLap, ...current]); setNotice(newLap.circuit + ' 기록이 저장되었습니다.'); setIsFormOpen(false); window.setTimeout(() => setNotice(''), 3500);
  }
  return <main>
    <nav className="topbar"><a className="brand" href="#top" aria-label="Race Weekend Prep 홈"><span>RACE WEEKEND</span> PREP</a><div className="navlinks"><a href="#calendar">캘린더</a><a href="#circuit">서킷</a><a href="#laps">내 기록</a></div><button className="profile" onClick={() => setIsFormOpen(true)}><Plus size={15} /> 랩타임 추가</button></nav>
    <section id="top" className="hero"><img src="/spa-hero.png" alt="숲을 가로지르는 레이스 서킷" /><div className="hero-shade" /><div className="hero-content"><p className="eyebrow"><span className="live-dot" /> 2026 SEASON · KST</p><h1>RACE WEEKEND,<br /><em>PREP YOUR LAP.</em></h1><p className="hero-copy">F1과 WEC의 순간을 앞두고,<br />당신의 가장 빠른 랩으로 먼저 준비하세요.</p><div className="next-race"><span className="series-pill">F1</span><div><b>ITALIAN GRAND PRIX</b><small>MONZA · 6 SEP, 22:00</small></div><ChevronRight size={20} /></div></div><div className="hero-stats"><div><strong>07</strong><span>DAYS TO GO</span></div><div><strong>2:18.642</strong><span>SPA PERSONAL BEST</span></div></div></section>
    <section id="calendar" className="section calendar-section"><div className="section-heading"><div><p className="eyebrow dark"><CalendarDays size={14} /> RACE CALENDAR</p><h2>다가오는 레이스</h2><p className="sync-status">{calendarStatus} · KST 기준 · {filteredRaces.length}개 레이스 주말</p></div><div className="filter" aria-label="시리즈 필터">{(['ALL', 'F1', 'WEC'] as const).map((item) => <button key={item} className={series === item ? 'selected' : ''} onClick={() => setSeries(item)}>{item === 'ALL' ? '전체' : item}</button>)}</div></div><div className="calendar-frame"><Calendar month={calendarMonth} onMonthChange={setCalendarMonth} locale={ko} showOutsideDays fixedWeeks className="calendar-library w-full" classNames={{ root: 'w-full', months: 'w-full', month: 'w-full', month_grid: 'w-full', weekday: 'calendar-library-weekday', day: 'calendar-library-day' }} modifiers={{ f1: f1RaceDays, wec: wecRaceDays }} modifiersClassNames={{ f1: 'race-f1', wec: 'race-wec' }} dayContent={(day) => { const entry = racesByDay.get(dateKey(day)); return <><span>{day.getDate()}</span>{entry?.isStart && <small className="race-day-label">{entry.race.name}</small>}</>; }} onDayClick={(day) => { const entry = racesByDay.get(dateKey(day)); if (entry) window.location.assign('/race/' + raceSlug(entry.race.name)); }} /></div>{filteredRaces.length === 0 && <p className="calendar-empty">향후 30일 안에 예정된 {series === 'ALL' ? '' : series + ' '}레이스가 없습니다.</p>}</section>
    <section id="circuit" className="section circuit-section"><div className="circuit-copy"><p className="eyebrow dark"><Flag size={14} /> FEATURED CIRCUIT</p><h2>Spa-<br />Francorchamps</h2><p>아르덴 숲을 가로지르는 7.004km. 고저차와 빠른 코너가 만들어내는, 레이싱의 가장 순수한 리듬.</p><div className="track-metrics"><div><b>7.004</b><span>KM LENGTH</span></div><div><b>19</b><span>CORNERS</span></div><div><b>102m</b><span>ELEVATION</span></div></div><button className="text-button">서킷 프로필 보기 <ChevronRight size={16} /></button></div><div className="track-panel"><div className="track-glow" /><div className="track-line"><span className="t1">01</span><span className="t2">07</span><span className="t3">12</span><span className="t4">18</span></div><p>SPA-FRANCORCHAMPS · BELGIUM</p></div></section>
    <section id="laps" className="section lap-section"><div className="section-heading"><div><p className="eyebrow dark"><TimerReset size={14} /> SIM RACING LOG</p><h2>나의 랩타임</h2></div><button className="dark-button" onClick={() => setIsFormOpen(true)}><Plus size={16} /> 기록 추가</button></div><div className="lap-layout"><div className="pb-card"><div className="pb-top"><span>PERSONAL BEST</span><Trophy size={20} /></div><h3>{bestLap?.time ?? '—'}</h3><p>SPA-FRANCORCHAMPS · FERRARI 499P</p><div className="pb-footer"><span><Gauge size={14} /> LMU · DRY</span><span className="improvement">▲ 0.462</span></div></div><div className="lap-list">{laps.slice(0, 4).map((lap, index) => <article className="lap-row" key={lap.id}><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><b>{lap.circuit}</b><p>{lap.car} · {lap.game}</p></div><div className="lap-time"><strong>{lap.time}</strong><small>{lap.date}</small></div></article>)}</div></div></section>
    <footer>RACE WEEKEND PREP <span>PREP THE TRACK. OWN THE WEEKEND.</span></footer>
    {notice && <div className="toast">{notice}</div>}
    {isFormOpen && <div className="modal-backdrop" role="presentation"><form className="lap-modal" action={saveLap}><button className="close" type="button" onClick={() => setIsFormOpen(false)} aria-label="닫기"><X size={20} /></button><p className="eyebrow dark">NEW LAP</p><h2>랩타임 기록</h2><label>게임<select name="game" defaultValue="F1 2025"><option>F1 2025</option><option>Le Mans Ultimate</option></select></label><label>서킷<select name="circuit" defaultValue="Spa-Francorchamps"><option>Spa-Francorchamps</option><option>Monza</option><option>Suzuka</option><option>Fuji Speedway</option></select></label><label>차량<input required name="car" placeholder="예: Ferrari 499P" /></label><label>랩타임<input required name="time" placeholder="예: 2:18.642" pattern="[0-9]+:[0-9]{2}\\.[0-9]{3}" /></label><label>주행 메모<input name="note" placeholder="예: Dry · Soft · 23°C" /></label><button className="save" type="submit">기록 저장 <ChevronRight size={16} /></button></form></div>}
  </main>;
}
