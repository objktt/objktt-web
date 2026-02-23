import poster251205 from '../assets/poster/251205.jpg';
import poster251206 from '../assets/poster/251206.jpg';
import poster251212 from '../assets/poster/251212.jpg';
import poster251221 from '../assets/poster/251221.jpg';

export interface Event {
  id: string;
  date: string;
  title: string;
  type: string;
  description: { en: string; ko: string };
  script: string;
  poster?: string;
}

export const events: Event[] = [
  // Past events — December 2025
  {
    id: 'evt-p01',
    date: '2025.12.05',
    title: 'Objktt Invite: Carozilla',
    type: 'INVITE',
    description: { en: 'Objktt Invite DJ session, 21:00–23:00', ko: '오브옉트 레코드바 초대 DJ 세션, 21:00–23:00' },
    script: 'wave.js',
    poster: poster251205,
  },
  {
    id: 'evt-p02',
    date: '2025.12.06',
    title: 'Kimgunho and Rapbong',
    type: 'LISTENING SESSION',
    description: { en: 'Objktt Listening Session, 21:00–23:00', ko: '오브옉트 리스닝 세션, 21:00–23:00' },
    script: 'wave.js',
    poster: poster251206,
  },
  {
    id: 'evt-p03',
    date: '2025.12.12',
    title: 'Matteo Floris · Rocket · Mingsturn',
    type: 'SELEKTT',
    description: { en: 'Objktt Selektt, from 9pm', ko: '오브옉트 셀렉트, 오후 9시부터' },
    script: 'wave.js',
    poster: poster251212,
  },
  {
    id: 'evt-p04',
    date: '2025.12.21',
    title: 'Objktt Invite: Makoto Sakamoto',
    type: 'INVITE',
    description: { en: 'Objktt Invite DJ session, 21:00–23:00', ko: '오브옉트 레코드바 초대 DJ 세션, 21:00–23:00' },
    script: 'wave.js',
    poster: poster251221,
  },
  // March 2026
  {
    id: 'evt-004',
    date: '2026.03.01',
    title: 'Birthday Bash',
    type: 'KLANG',
    description: { en: 'Objktt 1st anniversary party', ko: '오브옉트 1주년 파티' },
    script: 'wave.js'
  },
  {
    id: 'evt-005',
    date: '2026.03.07',
    title: 'KLANG',
    type: 'KLANG',
    description: { en: 'Weekly Saturday DJ session', ko: '매주 토요일 DJ 세션' },
    script: 'wave.js'
  },
  {
    id: 'evt-006',
    date: '2026.03.08',
    title: 'KOLLEKTION 002',
    type: 'KOLLEKTION',
    description: { en: '10 Records · 1 Collector · 1 Theme', ko: '레코드 10장 · 콜렉터 1명 · 테마 1개' },
    script: 'noise.js'
  },
  {
    id: 'evt-007',
    date: '2026.03.14',
    title: 'KLANG',
    type: 'KLANG',
    description: { en: 'Weekly Saturday DJ session', ko: '매주 토요일 DJ 세션' },
    script: 'wave.js'
  },
  {
    id: 'evt-008',
    date: '2026.03.15',
    title: 'KOLLEKTION 003',
    type: 'KOLLEKTION',
    description: { en: '10 Records · 1 Collector · 1 Theme', ko: '레코드 10장 · 콜렉터 1명 · 테마 1개' },
    script: 'noise.js'
  },
  {
    id: 'evt-009',
    date: '2026.03.21',
    title: 'KLANG',
    type: 'KLANG',
    description: { en: 'Weekly Saturday DJ session', ko: '매주 토요일 DJ 세션' },
    script: 'wave.js'
  },
  {
    id: 'evt-010',
    date: '2026.03.22',
    title: 'KOLLEKTION 004',
    type: 'KOLLEKTION',
    description: { en: '10 Records · 1 Collector · 1 Theme', ko: '레코드 10장 · 콜렉터 1명 · 테마 1개' },
    script: 'noise.js'
  },
  {
    id: 'evt-011',
    date: '2026.03.28',
    title: 'KLANG',
    type: 'KLANG',
    description: { en: 'Weekly Saturday DJ session', ko: '매주 토요일 DJ 세션' },
    script: 'wave.js'
  },
  {
    id: 'evt-012',
    date: '2026.03.29',
    title: 'KOLLEKTION 005',
    type: 'KOLLEKTION',
    description: { en: '10 Records · 1 Collector · 1 Theme', ko: '레코드 10장 · 콜렉터 1명 · 테마 1개' },
    script: 'noise.js'
  },
];
