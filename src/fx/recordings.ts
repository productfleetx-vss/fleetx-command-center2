import routeDeviation from '@/assets/audio/route-deviation.mp3';
import customerDetention from '@/assets/audio/customer-detention.mp3';
import epodDelay from '@/assets/audio/epod-delay.mp3';

/**
 * Real call recordings supplied by the UTCL team, one per exception type.
 * Each is shown on the top-ranked case of its type in "Cases that need a person".
 * Audio only: the words haven't been transcribed yet, so no transcript, outcome or ETA
 * is attached to them, and the case's own data is left as it is.
 */
export interface Recording { src: string; seconds: number; label: string }

export const RECORDINGS: Record<string, Recording> = {
  'Route Deviation': { src: routeDeviation, seconds: 68.5, label: 'Route deviation call' },
  'Customer Detention': { src: customerDetention, seconds: 45.5, label: 'Customer detention call' },
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
