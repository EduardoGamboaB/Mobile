import { isLive } from '../api/config';
import { incidentsHttp, type IncidentsBackend } from './api';
import { createDemoIncidents } from './demo';

export * from './types';
export * from './sla';
export type { IncidentsBackend, IncidentFilter, IncidentDetail, ManualIncidentInput } from './api';
export { incidentsHttp } from './api';
export { createDemoIncidents, DEMO_TEAM } from './demo';

/** HTTP contra el backend G3 si hay URL configurada; si no, demo en memoria. */
export const incidentsBackend: IncidentsBackend = isLive ? incidentsHttp : createDemoIncidents();
