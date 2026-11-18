import routeDeviation from '@/assets/audio/route-deviation.mp3';
import customerDetention from '@/assets/audio/customer-detention.mp3';
import epodDelay from '@/assets/audio/epod-delay.mp3';

/**
 * Real call recordings supplied by the UTCL team, one per exception type.
 * Each is shown on the top-ranked case of its type in "Cases that need a person".
 * A summary is shown only where the UTCL team has written one for that call. It is their
 * account of the call, not a word-for-word transcript. Calls without one say so.
 * The case's own data is left as it is.
 */
export interface SummaryLine { speaker: string; text: string }
export interface Recording {
  src: string;
  seconds: number;
  label: string;
  /** Reason the driver gave, as written by the UTCL team. */
  reason?: string;
  /** Call summary, as written by the UTCL team. */
  summary?: SummaryLine[];
}

export const RECORDINGS: Record<string, Recording> = {
  'Route Deviation': {
    src: routeDeviation,
    seconds: 54.1,
    label: 'Route deviation call · driver',
    reason: 'Customer asked him to deliver at another place',
    summary: [
      { speaker: 'AI agent', text: 'Checks that it is speaking to the assigned driver.' },
      { speaker: 'Driver', text: 'Confirms he is the assigned driver.' },
      { speaker: 'AI agent', text: 'Asks why the truck has travelled beyond the lead distance.' },
      { speaker: 'Driver', text: 'The customer asked him to deliver at another place.' },
    ],
  },
  'Customer Detention': {
    src: customerDetention,
    seconds: 32.4,
    label: 'Customer detention call · driver',
    reason: 'Driver was having lunch',
  },
  'ePOD Delay': { src: epodDelay, seconds: 47.3, label: 'ePOD call' },
};

const playable: Record<string, string> = {};

/**
 * A URL every browser will play. In the single-file build Vite inlines the MP3 as a data: URL,
 * which Safari refuses for audio, so it is turned into a blob: URL once and reused.
 */
export function recordingUrl(cat: string): string | null {
  const r = RECORDINGS[cat];
  if (!r) return null;
  if (playable[cat]) return playable[cat];
  if (!r.src.startsWith('data:')) return (playable[cat] = r.src);
  const comma = r.src.indexOf(',');
  const mime = r.src.slice(5, r.src.indexOf(';')) || 'audio/mpeg';
  const bin = atob(r.src.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return (playable[cat] = URL.createObjectURL(new Blob([bytes], { type: mime })));
}
