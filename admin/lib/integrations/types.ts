/**
 * Espejo de `backend/contracts/src/dtos/integrations.ts` (servicio
 * integrations). El catálogo de categorías/proveedores/campos es la copia
 * sincronizada `lib/contracts/integrationsCatalog.ts`.
 */
import type { IntegrationCategory, IntegrationScope } from '../contracts/integrationsCatalog';

export type { IntegrationCategory, IntegrationScope };

export type IntegrationStatus = 'unverified' | 'verified' | 'failed';

/** De dónde sale la configuración que se usa en tiempo de ejecución. */
export type IntegrationSource = 'company' | 'platform' | 'env' | 'none';

/**
 * Cómo está guardado un secreto. Al capturar un secreto se acepta:
 * - el valor literal → se cifra en reposo (AES-256-GCM),
 * - `gsm:projects/<p>/secrets/<s>/versions/<v>` → Secret Manager,
 * - `env:NOMBRE` → variable de entorno del servicio.
 * Nunca se devuelve el valor: solo esta descripción.
 */
export interface SecretDescriptorDto {
  set: boolean;
  storage: 'encrypted' | 'secret_manager' | 'env' | null;
  /** Últimos 4 caracteres (solo `encrypted`) o la referencia (gsm/env). */
  hint: string | null;
}

export interface IntegrationTestDto {
  ok: boolean;
  message: string;
  latencyMs: number;
  testedAt: string;
  /** `false` si el proveedor no admite prueba en vivo (solo se validó el formato). */
  live: boolean;
}

export interface IntegrationConfigDto {
  id: string;
  scope: IntegrationScope;
  /** null en alcance plataforma. */
  companyId: string | null;
  category: IntegrationCategory;
  slot: string;
  provider: string;
  enabled: boolean;
  /** Campos no secretos. */
  settings: Record<string, string | boolean>;
  secrets: Record<string, SecretDescriptorDto>;
  status: IntegrationStatus;
  lastTest: IntegrationTestDto | null;
  updatedAt: string;
  updatedBy: string | null;
}

/**
 * Lo que se captura en G3 Admin. Los secretos omitidos (o vacíos) en una
 * actualización CONSERVAN el valor guardado; para borrarlo se manda `null`.
 */
export interface UpsertIntegrationDto {
  provider: string;
  enabled: boolean;
  values: Record<string, string | boolean | null>;
}

/** Resumen de la configuración de plataforma visto por una compañía cliente. */
export type IntegrationPlatformSummaryDto = Pick<IntegrationConfigDto, 'provider' | 'status' | 'enabled'>;

/** Estado efectivo por categoría/ranura para la compañía que consulta. */
export interface IntegrationOverviewItemDto {
  category: IntegrationCategory;
  slot: string;
  effective: {
    source: IntegrationSource;
    provider: string | null;
    status: IntegrationStatus | null;
    enabled: boolean;
  };
  /** Configuración propia de la compañía (si existe). */
  company: IntegrationConfigDto | null;
  /** Configuración de plataforma: completa solo para la compañía plataforma. */
  platform: IntegrationConfigDto | IntegrationPlatformSummaryDto | null;
  /** Variables de entorno de respaldo presentes en el servicio. */
  envFallbackPresent: boolean;
  /** ¿Puede quien consulta editar el alcance plataforma? */
  canEditPlatform: boolean;
}

/** ¿La config de plataforma viene completa (solo para la compañía plataforma)? */
export function isFullConfig(
  c: IntegrationConfigDto | IntegrationPlatformSummaryDto | null,
): c is IntegrationConfigDto {
  return !!c && 'id' in c && 'secrets' in c;
}
