export interface Event {
  id: string;
  date: string;
  title: string;
  type: string;
  description: string;
  script: string;
}

export const events: Event[] = [
  // Past events
  {
    id: 'evt-001',
    date: '2025.12.24',
    title: 'Sound Structure I',
    type: 'KLANG',
    description: 'An exploration of acoustic architectural space.',
    script: 'wave.js'
  },
  {
    id: 'evt-002',
    date: '2026.01.15',
    title: 'Static / Noise',
    type: 'KOLLEKTION',
    description: 'Visualizing distinct frequencies of digital noise.',
    script: 'noise.js'
  },
  // February 2026
  {
    id: 'evt-003',
    date: '2026.02.22',
    title: 'KOLLEKTION 001',
    type: 'KOLLEKTION',
    description: '10 Records · 1 Collector · 1 Theme',
    script: 'noise.js'
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
