/**
 * Mock records for UI development before Shopify products are populated.
 * These get replaced automatically once VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN is set.
 *
 * The 6 entries cover a spread of the genres defined in pages/Music.tsx so the
 * filter UI can be tested end-to-end.
 */

import type { VinylRecord } from '../types/shopify';

const placeholder = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/800`;

export const mockRecords: VinylRecord[] = [
  {
    id: 'mock-1',
    handle: 'mock-modern-funk',
    title: 'After Hours',
    description: 'A late-night modern funk selection with deep grooves and warm synths.',
    vendor: 'Objktt',
    productType: 'Vinyl LP',
    tags: ['LP', 'Modern Funk', 'Boogie'],
    featuredImage: { id: 'm1-img', url: placeholder('modern-funk'), altText: null, width: 800, height: 800 },
    images: [{ id: 'm1-img', url: placeholder('modern-funk'), altText: null, width: 800, height: 800 }],
    variants: [
      {
        id: 'm1-v1',
        title: 'Default',
        availableForSale: true,
        price: { amount: '38000', currencyCode: 'KRW' },
      },
    ],
    artist: 'Various Artists',
    album: 'After Hours Vol. 1',
    label: 'Selectors Series',
    releaseYear: '2022',
    genre: 'Modern Funk / Boogie',
    condition: 'NM',
  },
  {
    id: 'mock-2',
    handle: 'mock-italian-disco',
    title: 'Notte Italiana',
    description: 'A rare Italian disco 12-inch with cosmic edge.',
    vendor: 'Objktt',
    productType: 'Vinyl 12"',
    tags: ['12"', 'Italian Disco', 'Cosmic'],
    featuredImage: { id: 'm2-img', url: placeholder('italian-disco'), altText: null, width: 800, height: 800 },
    images: [{ id: 'm2-img', url: placeholder('italian-disco'), altText: null, width: 800, height: 800 }],
    variants: [
      {
        id: 'm2-v1',
        title: 'Default',
        availableForSale: true,
        price: { amount: '45000', currencyCode: 'KRW' },
      },
    ],
    artist: 'Selene',
    album: 'Notte Italiana',
    label: 'Discomagic',
    releaseYear: '1984',
    genre: 'Italian Disco',
    condition: 'VG+',
  },
  {
    id: 'mock-3',
    handle: 'mock-city-pop',
    title: 'Mariya Takeuchi — Plastic Love',
    description: 'Japanese City Pop classic, reissue pressing.',
    vendor: 'Objktt',
    productType: 'Vinyl 12"',
    tags: ['12"', 'City Pop', 'Japan'],
    featuredImage: { id: 'm3-img', url: placeholder('city-pop'), altText: null, width: 800, height: 800 },
    images: [{ id: 'm3-img', url: placeholder('city-pop'), altText: null, width: 800, height: 800 }],
    variants: [
      {
        id: 'm3-v1',
        title: 'Default',
        availableForSale: true,
        price: { amount: '42000', currencyCode: 'KRW' },
      },
    ],
    artist: 'Mariya Takeuchi',
    album: 'Plastic Love',
    label: 'Moon Records',
    releaseYear: '1984',
    genre: 'Japanese City Pop',
    condition: 'NM',
  },
  {
    id: 'mock-4',
    handle: 'mock-spiritual-jazz',
    title: 'Pharoah — Harvest Time',
    description: 'Spiritual jazz long-form meditation.',
    vendor: 'Objktt',
    productType: 'Vinyl LP',
    tags: ['LP', 'Spiritual Jazz'],
    featuredImage: { id: 'm4-img', url: placeholder('spiritual-jazz'), altText: null, width: 800, height: 800 },
    images: [{ id: 'm4-img', url: placeholder('spiritual-jazz'), altText: null, width: 800, height: 800 }],
    variants: [
      {
        id: 'm4-v1',
        title: 'Default',
        availableForSale: true,
        price: { amount: '48000', currencyCode: 'KRW' },
      },
    ],
    artist: 'Pharoah Sanders',
    album: 'Pharoah',
    label: 'India Navigation',
    releaseYear: '1977',
    genre: 'Spiritual Jazz',
    condition: 'VG+',
  },
  {
    id: 'mock-5',
    handle: 'mock-ambient',
    title: 'Hiroshi Yoshimura — Music for Nine Post Cards',
    description: 'Minimal ambient, Japanese kankyō ongaku.',
    vendor: 'Objktt',
    productType: 'Vinyl LP',
    tags: ['LP', 'Ambient', 'Environmental'],
    featuredImage: { id: 'm5-img', url: placeholder('ambient'), altText: null, width: 800, height: 800 },
    images: [{ id: 'm5-img', url: placeholder('ambient'), altText: null, width: 800, height: 800 }],
    variants: [
      {
        id: 'm5-v1',
        title: 'Default',
        availableForSale: true,
        price: { amount: '50000', currencyCode: 'KRW' },
      },
    ],
    artist: 'Hiroshi Yoshimura',
    album: 'Music for Nine Post Cards',
    label: 'Sound Process',
    releaseYear: '1982',
    genre: 'Minimal / Environmental',
    condition: 'NM',
  },
  {
    id: 'mock-6',
    handle: 'mock-balearic',
    title: 'Idjut Boys — Saturday Nite Live',
    description: 'Balearic edit selection, weekend listening.',
    vendor: 'Objktt',
    productType: 'Vinyl 12"',
    tags: ['12"', 'Balearic', 'Edit'],
    featuredImage: { id: 'm6-img', url: placeholder('balearic'), altText: null, width: 800, height: 800 },
    images: [{ id: 'm6-img', url: placeholder('balearic'), altText: null, width: 800, height: 800 }],
    variants: [
      {
        id: 'm6-v1',
        title: 'Default',
        availableForSale: true,
        price: { amount: '32000', currencyCode: 'KRW' },
      },
    ],
    artist: 'Idjut Boys',
    album: 'Saturday Nite Live',
    label: 'U-Star',
    releaseYear: '2010',
    genre: 'Balearic',
    condition: 'VG+',
  },
];
