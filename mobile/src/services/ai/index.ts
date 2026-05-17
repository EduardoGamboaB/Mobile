import type { AIService } from './types';
import { stubAI } from './stubProvider';

/**
 * Punto único de entrada al ecosistema AI-First de G3.
 *
 *   import { ai } from '@/services/ai';
 *   const r = await ai.classifyLogbookEvent({ text: 'Carga diesel 180 L' });
 *
 * En V2 esto se construirá según `EXPO_PUBLIC_AI_PROVIDER`
 * (`stub` | `openai` | `anthropic` | `supabase`) y devolverá el provider
 * correspondiente. Por ahora siempre devolvemos el stub local.
 */
export const ai: AIService = stubAI;

export * from './types';
