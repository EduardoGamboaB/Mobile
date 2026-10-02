import type { TelemetryProvider } from '@g3/contracts';
import type { TelemetryAdapter } from './types';
import { parseSuntech } from './suntech';
import { parseTeltonika } from './teltonika';
import { parseQueclink } from './queclink';
import { parseGeneric } from './generic';

export * from './types';
export { validateCoordinates } from './common';

/** Registro de adapters por proveedor. Agregar un proveedor = una función pura + una entrada aquí. */
export const ADAPTERS: Record<TelemetryProvider, TelemetryAdapter> = {
  suntech: parseSuntech,
  teltonika: parseTeltonika,
  queclink: parseQueclink,
  generic: parseGeneric,
};
