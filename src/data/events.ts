import poster251205 from '../assets/poster/251205.jpg';
import poster251206 from '../assets/poster/251206.jpg';
import poster251212 from '../assets/poster/251212.jpg';
import poster251221 from '../assets/poster/251221.jpg';

export interface Event {
  id: string;
  date: string;
  title: string;
  type: string;
  description: string;
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
    description: 'Objktt Invite @ Objktt Record Bar, 21:00–23:00',
    script: 'wave.js',
    poster: poster251205,
  },
  {
    id: 'evt-p02',
    date: '2025.12.06',
    title: 'Kimgunho and Rapbong',
    type: 'LISTENING SESSION',
    description: 'Objktt Listening Session @ Objktt Record Bar, 21:00–23:00',
    script: 'wave.js',
    poster: poster251206,
  },
  {
    id: 'evt-p03',
    date: '2025.12.12',
    title: 'Matteo Floris · Rocket · Mingsturn',
    type: 'SELEKTT',
    description: 'Objktt Selektt @ Objktt Record Bar, from 9pm',
    script: 'wave.js',
    poster: poster251212,
  },
  {
    id: 'evt-p04',
    date: '2025.12.21',
    title: 'Objktt Invite: Makoto Sakamoto',
    type: 'INVITE',
    description: 'Objktt Invite @ Objktt Record Bar, 21:00–23:00',
    script: 'wave.js',
    poster: poster251221,
  },
  // March 2026
  {
    id: 'evt-004',
    date: '2026.03.01',
    title: 'Birthday Bash',
    type: 'KLANG',
    description: '',
    script: 'wave.js'
  },
  {
    id: 'evt-005',
    date: '2026.03.07',
    title: 'KLANG',
    type: 'KLANG',
    description: '',
    script: 'wave.js'
  },
  {
    id: 'evt-006',
    date: '2026.03.08',
    title: 'KOLLEKTION 002',
    type: 'KOLLEKTION',
    description: '10 Records · 1 Collector · 1 Theme',
    script: 'noise.js'
  },
  {
    id: 'evt-007',
    date: '2026.03.14',
    title: 'KLANG',
    type: 'KLANG',
    description: '',
    script: 'wave.js'
  },
  {
    id: 'evt-008',
    date: '2026.03.15',
    title: 'KOLLEKTION 003',
    type: 'KOLLEKTION',
    description: '10 Records · 1 Collector · 1 Theme',
    script: 'noise.js'
  },
  {
    id: 'evt-009',
    date: '2026.03.21',
    title: 'KLANG',
    type: 'KLANG',
    description: '',
    script: 'wave.js'
  },
  {
    id: 'evt-010',
    date: '2026.03.22',
    title: 'KOLLEKTION 004',
    type: 'KOLLEKTION',
    description: '10 Records · 1 Collector · 1 Theme',
    script: 'noise.js'
  },
  {
    id: 'evt-011',
    date: '2026.03.28',
    title: 'KLANG',
    type: 'KLANG',
    description: '',
    script: 'wave.js'
  },
  {
    id: 'evt-012',
    date: '2026.03.29',
    title: 'KOLLEKTION 005',
    type: 'KOLLEKTION',
    description: '10 Records · 1 Collector · 1 Theme',
    script: 'noise.js'
  },
];
