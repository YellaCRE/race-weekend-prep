import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'APEX LAP — Motorsport Calendar & Sim Racing Log', description: 'F1, WEC 일정과 나의 심레이싱 랩타임을 한 곳에서.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html>; }
