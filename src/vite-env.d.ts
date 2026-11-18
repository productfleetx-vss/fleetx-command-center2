/// <reference types="vite/client" />
declare module '@/legacy/command-center.js' {
  import type { Context, FC } from 'react';
  export const fxInternals: unknown;
  export const LegacyLayer: FC;
  export const SessionContext: Context<unknown>;
  export const previewSession: unknown;
}
