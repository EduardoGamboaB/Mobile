import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';
import { isDemo, demoStore } from '@/demo';
import type { Evidence } from '@/models';
import type { EvidenceTypeValue } from '@/constants/enums';
import { tripsApi } from './g3/trips';
import { evidenceFromDto, evidenceToDto } from './mappers';

interface UploadInput {
  /** Idempotencia: la cola offline reusa el id del item al reintentar. */
  clientUuid?: string;
  driverId: string;
  tripId?: string | null;
  logbookId?: string | null;
  incidentId?: string | null;
  type: EvidenceTypeValue;
  localUri: string;
  mimeType?: string;
  coords?: { lat: number; lng: number } | null;
}

/**
 * Sube la foto al bucket privado de G3 en 3 pasos:
 *   1. el backend firma una URL PUT de corta vida bajo `{compañía}/{viaje}/`,
 *   2. el archivo va directo a Cloud Storage (no pasa por el API),
 *   3. se registra la evidencia (idempotente por clientUuid).
 */
export async function uploadEvidence(input: UploadInput): Promise<Evidence> {
  const clientUuid = input.clientUuid ?? String(uuid.v4());
  const mimeType = input.mimeType ?? 'image/jpeg';

  if (isDemo) {
    return demoStore.addEvidence({
      id: `ev-${clientUuid}`,
      trip_id: input.tripId ?? null,
      logbook_id: input.logbookId ?? null,
      incident_id: input.incidentId ?? null,
      driver_id: input.driverId,
      type: input.type,
      storage_path: input.localUri, // local path para preview en demo
      mime_type: mimeType,
      size_bytes: null,
      lat: input.coords?.lat ?? null,
      lng: input.coords?.lng ?? null,
      taken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  if (!input.tripId) throw new Error('La evidencia debe ligarse a un viaje');

  const signed = await tripsApi.evidenceUploadUrl(input.tripId, { clientUuid, mimeType });
  const put = await FileSystem.uploadAsync(signed.uploadUrl, input.localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'content-type': mimeType },
  });
  if (put.status < 200 || put.status >= 300) {
    throw new Error(`No se pudo subir la evidencia (HTTP ${put.status})`);
  }

  const info = await FileSystem.getInfoAsync(input.localUri);
  const sizeBytes = info.exists && 'size' in info ? info.size : null;

  const dto = await tripsApi.registerEvidence(
    input.tripId,
    evidenceToDto({
      client_uuid: clientUuid,
      trip_id: input.tripId,
      logbook_id: input.logbookId ?? null,
      incident_id: input.incidentId ?? null,
      driver_id: input.driverId,
      type: input.type,
      storage_path: signed.storagePath,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      lat: input.coords?.lat ?? null,
      lng: input.coords?.lng ?? null,
      taken_at: new Date().toISOString(),
    }),
  );
  return evidenceFromDto(dto);
}

export async function listEvidencesByTrip(tripId: string): Promise<Evidence[]> {
  if (isDemo) return demoStore.listEvidencesByTrip(tripId);
  return (await tripsApi.listEvidences(tripId)).map(evidenceFromDto);
}
