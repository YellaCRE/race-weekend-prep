# Race Weekend Prep

F1과 FIA WEC 레이스 주말을 한국 표준시(KST) 기준으로 한눈에 확인하고, 심 레이싱 랩타임을 함께 관리하는 웹 애플리케이션입니다.

## 주요 기능

- **레이스 캘린더**: F1과 WEC 일정을 월간 캘린더에서 확인하고 시리즈별로 필터링합니다.
- **공식 일정 동기화**: Formula 1 및 FIA WEC 공식 웹사이트에서 2026 시즌 일정을 가져오며, 동기화에 실패하면 내장된 기본 일정을 표시합니다.
- **세션 시간 변환**: F1 연습, 스프린트, 예선, 결승 시간을 KST로 변환해 제공합니다.
- **레이스 상세 정보**: F1 레이스별 서킷 정보와 공식 결과를 확인할 수 있습니다.
- **심 레이싱 랩 로그**: 차량, 서킷, 게임, 랩타임을 기록하고 개인 베스트를 확인합니다. 랩 기록은 브라우저의 로컬 저장소에 보관됩니다.

## 기술 구성

- React 19, TypeScript, Vinext/Vite
- Tailwind CSS 및 shadcn UI 컴포넌트
- Cloudflare Workers 배포 환경
- Cloudflare D1 기반의 레이스 일정 캐시
- date-fns 및 `@date-fns/tz`를 이용한 시간대 처리

## 시작하기

Node.js 22.13.0 이상이 필요합니다.

```bash
npm install
npm run dev
```

개발 서버가 실행되면 터미널에 표시된 로컬 주소에서 앱을 열 수 있습니다.

## 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버를 실행합니다. |
| `npm run build` | 배포용 결과물을 빌드합니다. |
| `npm run start` | 빌드된 Cloudflare Workers 앱을 로컬에서 실행합니다. |
| `npm run lint` | 정적 분석을 실행합니다. |
| `npm run format` | 코드 포맷을 적용합니다. |

## 데이터 출처

- [Formula 1 공식 웹사이트](https://www.formula1.com/)
- [FIA World Endurance Championship 공식 웹사이트](https://www.fiawec.com/)

공식 사이트의 응답 형식 또는 네트워크 상태에 따라 일정·서킷·결과 정보가 표시되지 않을 수 있습니다. 이 경우 앱은 가능한 범위에서 캐시 또는 기본 데이터를 사용합니다.

## 프로젝트 구조

```text
app/                 화면과 API 라우트
components/          UI 컴포넌트
db/                  D1 스키마와 마이그레이션
lib/                 일정 동기화·공식 F1 데이터 처리 로직
public/              정적 이미지와 아이콘
```
