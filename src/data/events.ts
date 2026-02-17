export interface Event {
  id: string;
  date: string;
  title: string;
  type: string;
  description: string;
  script: string;
}

export const events: Event[] = [
  { 
    id: 'evt-001',
    date: '2025.12.24', 
    title: 'Sound Structure I', 
    type: 'Live Performance', 
    description: 'An exploration of acoustic architectural space.',
    script: 'wave.js' 
  },
  { 
    id: 'evt-002',
    date: '2026.01.15', 
    title: 'Static / Noise', 
    type: 'Installation', 
    description: 'Visualizing distinct frequencies of digital noise.',
    script: 'noise.js' 
  },
  { 
    id: 'evt-003',
    date: '2026.02.20', 
    title: 'Minimalist Void', 
    type: 'Exhibition', 
    description: 'A study of negative space and presence.',
    script: 'void.js' 
  },
  // Adding more placeholder events to fill the gallery grid
  { 
    id: 'evt-004',
    date: '2026.03.10', 
    title: 'Kyoto Ambient', 
    type: 'Listening Party', 
    description: 'Field recordings from Kyoto temples.',
    script: 'wave.js' 
  },
  { 
    id: 'evt-005',
    date: '2026.04.05', 
    title: 'Rhythm Arch', 
    type: 'Live Performance',
    description: 'Percussive structures in time.',
    script: 'noise.js' 
  },
  { 
    id: 'evt-006',
    date: '2026.05.22', 
    title: 'Object Permanence', 
    type: 'Exhibition', 
    description: 'Archival objects from the late 20th century.',
    script: '/posters/void.js' 
  },
];
