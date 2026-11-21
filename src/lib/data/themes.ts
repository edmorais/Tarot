import type { TablePattern } from '../three/textures';
import type { Props } from '../three/atmosphere';

export type ThemeId = 'velvet' | 'starry' | 'parchment' | 'stone';

export interface Theme {
  id: ThemeId;
  name: string;
  dark: boolean;
  table: { pattern: TablePattern; base: string; accent: string; sheen?: string };
  fog: string;
  key: { color: string; intensity: number };
  candle?: { color: string; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  dust: string;
  /** what stands on or around the table */
  props?: Props;
  ui: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'velvet', name: 'Candlelit Velvet', dark: true,
    table: { pattern: 'velvet', base: '#3a0f22', accent: '#d8b66a', sheen: '#c0607a' },
    fog: '#0b0508',
    key: { color: '#ffe2b8', intensity: 1.6 },
    candle: { color: '#ffa850', intensity: 26 },
    hemi: { sky: '#6b4a5a', ground: '#120408', intensity: 0.55 },
    dust: '#ffd9a0',
    props: 'candles',
    ui: {
      '--bg': '#0b0508', '--panel': 'rgba(24, 12, 18, 0.78)', '--panel-solid': '#1a0d14',
      '--line': 'rgba(216, 182, 106, 0.22)', '--text': '#f3e7d3', '--muted': '#bba68c',
      '--accent': '#d8b66a', '--accent-ink': '#1a0d14', '--glow': 'rgba(255, 190, 110, 0.35)',
    },
  },
  {
    id: 'starry', name: 'Starry Night', dark: true,
    table: { pattern: 'stars', base: '#0f1838', accent: '#b9c4ff', sheen: '#4a5ab0' },
    fog: '#04060f',
    key: { color: '#cfd8ff', intensity: 1.5 },
    candle: { color: '#9fb0ff', intensity: 14 },
    hemi: { sky: '#4a5590', ground: '#02030a', intensity: 0.6 },
    dust: '#cdd6ff',
    props: 'stars',
    ui: {
      '--bg': '#04060f', '--panel': 'rgba(10, 14, 34, 0.78)', '--panel-solid': '#0b1024',
      '--line': 'rgba(185, 196, 255, 0.22)', '--text': '#e8ebff', '--muted': '#9aa3cc',
      '--accent': '#c9d2ff', '--accent-ink': '#0b1024', '--glow': 'rgba(150, 170, 255, 0.35)',
    },
  },
  {
    id: 'parchment', name: 'Parchment', dark: false,
    table: { pattern: 'parchment', base: '#d6c29b', accent: '#7a4f24' },
    fog: '#bda67c',
    key: { color: '#fff4e0', intensity: 2.2 },
    hemi: { sky: '#fff6e6', ground: '#8a7450', intensity: 1.1 },
    dust: '#fff3d6',
    props: 'window',
    ui: {
      '--bg': '#bda67c', '--panel': 'rgba(250, 242, 226, 0.86)', '--panel-solid': '#f6ecd8',
      '--line': 'rgba(122, 79, 36, 0.25)', '--text': '#2e2013', '--muted': '#6e5a43',
      '--accent': '#8a5a2b', '--accent-ink': '#fbf3e3', '--glow': 'rgba(180, 120, 50, 0.3)',
    },
  },
  {
    id: 'stone', name: 'Slate & Stone', dark: true,
    table: { pattern: 'stone', base: '#3a3c40', accent: '#c9c4b8' },
    fog: '#0e0f11',
    key: { color: '#f2efe8', intensity: 1.8 },
    candle: { color: '#ffbb70', intensity: 12 },
    hemi: { sky: '#8a8f99', ground: '#111214', intensity: 0.6 },
    dust: '#e8e4da',
    props: 'candle',
    ui: {
      '--bg': '#0e0f11', '--panel': 'rgba(22, 23, 26, 0.8)', '--panel-solid': '#18191c',
      '--line': 'rgba(220, 214, 200, 0.18)', '--text': '#ecebe7', '--muted': '#a5a39c',
      '--accent': '#d9cfb8', '--accent-ink': '#18191c', '--glow': 'rgba(255, 210, 150, 0.3)',
    },
  },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, Theme>;
