import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Race Weekend Prep — Motorsport Calendar & Sim Racing Log',
  description: 'F1, WEC 일정과 심레이싱 랩타임으로 레이스 주말을 준비하세요.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
