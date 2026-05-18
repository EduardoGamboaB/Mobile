import { isLive } from '@/api/g3/config';
import { aiHttp } from '@/api/g3/ai';
import type { AIService } from './types';
import { stubAI } from './stubProvider';

/**
 * Punto único de entrada al ecosistema AI-First de G3.
 *
 *   import { ai } from '@/services/ai';
 *   const r = await ai.classifyLogbookEvent({ text: 'Carga diesel 180 L' });
 *
 * Cuando `EXPO_PUBLIC_G3_API_URL` está configurado, se usa el cliente HTTP
 * que llama a `/api/ai/*` del backend (gateado por tier). En demo se usa
 * el stub local determinista.
 */
export const ai: AIService = isLive ? aiHttp : stubAI;

export { stubAI } from './stubProvider';
export { aiHttp } from '@/api/g3/ai';
export * from './types';
