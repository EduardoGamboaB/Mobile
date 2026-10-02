import { isLive } from '../api/config';
import { integrationsHttp, type IntegrationsBackend } from './api';
import { createDemoIntegrations } from './demo';

export * from './types';
export * from './form';
export type { IntegrationsBackend } from './api';
export { integrationsHttp } from './api';
export { createDemoIntegrations, describeSecret } from './demo';

/** HTTP contra el backend G3 si hay URL configurada; si no, demo en memoria. */
export const integrationsBackend: IntegrationsBackend = isLive ? integrationsHttp : createDemoIntegrations();
