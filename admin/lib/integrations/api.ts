import { api } from '../api/client';
import type { IntegrationCategoryDef } from '../contracts/integrationsCatalog';
import type {
  IntegrationCategory,
  IntegrationConfigDto,
  IntegrationOverviewItemDto,
  IntegrationScope,
  IntegrationTestDto,
  UpsertIntegrationDto,
} from './types';

/** Lo que la pantalla de Integraciones necesita (implementación HTTP o demo). */
export interface IntegrationsBackend {
  catalog(): Promise<readonly IntegrationCategoryDef[]>;
  overview(): Promise<IntegrationOverviewItemDto[]>;
  get(category: IntegrationCategory, slot: string, scope: IntegrationScope): Promise<IntegrationConfigDto | null>;
  upsert(
    category: IntegrationCategory,
    slot: string,
    scope: IntegrationScope,
    body: UpsertIntegrationDto,
  ): Promise<IntegrationConfigDto>;
  remove(category: IntegrationCategory, slot: string, scope: IntegrationScope): Promise<void>;
  test(category: IntegrationCategory, slot: string, scope: IntegrationScope): Promise<IntegrationTestDto>;
}

const path = (category: IntegrationCategory, slot: string) =>
  `/integrations/${encodeURIComponent(category)}/${encodeURIComponent(slot)}`;

/** Cliente HTTP vía gateway (`/api/integrations…`). */
export const integrationsHttp: IntegrationsBackend = {
  catalog: () => api.get<IntegrationCategoryDef[]>('/integrations/catalog'),
  overview: () => api.get<IntegrationOverviewItemDto[]>('/integrations'),
  get: (category, slot, scope) =>
    api.get<IntegrationConfigDto | null>(path(category, slot), { query: { scope } }),
  upsert: (category, slot, scope, body) =>
    api.put<IntegrationConfigDto>(path(category, slot), body, { query: { scope } }),
  remove: (category, slot, scope) => api.delete<void>(path(category, slot), { query: { scope } }),
  test: (category, slot, scope) =>
    api.post<IntegrationTestDto>(`${path(category, slot)}/test`, undefined, { query: { scope } }),
};
