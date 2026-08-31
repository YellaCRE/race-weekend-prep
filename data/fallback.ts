import type { Race } from '@/lib/calendar-sync';

export type Lap = {
  id: number;
  circuit: string;
  car: string;
  game: string;
  time: string;
  date: string;
  note?: string;
};

const F1_SOURCE = 'https://www.formula1.com/en/racing/2026';
const WEC_SOURCE = 'https://www.fiawec.com/en/season/2026';

export const fallbackRaces: Race[] = [
  {
    series: 'F1',
    date: 'SEP 04??6',
    day: '06',
    name: 'Italian Grand Prix',
    circuit: 'Monza',
    country: 'Italy',
    time: 'TBA',
    accent: 'red',
    sourceUrl: F1_SOURCE,
  },
  {
    series: 'WEC',
    date: 'SEP 25??7',
    day: '27',
    name: '6 Hours of Fuji',
    circuit: 'Fuji Speedway',
    country: 'Japan',
    time: 'TBA',
    accent: 'gold',
    sourceUrl: WEC_SOURCE,
  },
  {
    series: 'F1',
    date: 'SEP 11??3',
    day: '13',
    name: 'Spanish Grand Prix',
    circuit: 'Madrid',
    country: 'Spain',
    time: 'TBA',
    accent: 'red',
    sourceUrl: F1_SOURCE,
  },
  {
    series: 'F1',
    date: 'SEP 24??6',
    day: '26',
    name: 'Azerbaijan Grand Prix',
    circuit: 'Baku City Circuit',
    country: 'Azerbaijan',
    time: 'TBA',
    accent: 'red',
    sourceUrl: F1_SOURCE,
  },
];

export const fallbackLaps: Lap[] = [
  {
    id: 1,
    circuit: 'Spa-Francorchamps',
    car: 'Ferrari 499P',
    game: 'Le Mans Ultimate',
    time: '2:18.642',
    date: '2026.08.27',
    note: '23째C 쨌 Dry 쨌 Soft',
  },
  {
    id: 2,
    circuit: 'Spa-Francorchamps',
    car: 'Ferrari 499P',
    game: 'Le Mans Ultimate',
    time: '2:19.104',
    date: '2026.08.20',
    note: '22째C 쨌 Dry 쨌 Soft',
  },
  {
    id: 3,
    circuit: 'Suzuka',
    car: 'McLaren MCL39',
    game: 'F1 2025',
    time: '1:29.387',
    date: '2026.08.14',
    note: 'Clear 쨌 Soft',
  },
];
