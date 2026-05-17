import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { isDemo, demoStore } from '@/demo';
import type { Evidence } from '@/models';
import type { EvidenceTypeValue } from '@/constants/enums';

const BUCKET = 'evidences';

interface UploadInput {
  driverId: string;
  tripId?: string | null;
  logbookId?: string | null;
  incidentId?: string | null;
  type: EvidenceTypeValue;
  localUri: string;
  mimeType?: string;
  coords?: { lat: number; lng: number } | null;
}

export async function uploadEvidence(input: UploadInput): Promise<Evidence> {
  if (isDemo) {
    const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return demoStore.addEvidence({
      id,
      trip_id: input.tripId ?? null,
      logbook_id: input.logbookId ?? null,
      incident_id: input.incidentId ?? null,
      driver_id: input.driverId,
      type: input.type,
      storage_path: input.localUri, // local path para preview en demo
      mime_type: input.mimeType ?? 'image/jpeg',
      size_bytes: null,
      lat: input.coords?.lat ?? null,
      lng: input.coords?.lng ?? null,
      taken_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  const ext = input.localUri.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${input.driverId}/${input.tripId ?? 'misc'}/${filename}`;

  const base64 = await FileSystem.readAsStringAsync(input.localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = Buffer.from(base64, 'base64');

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: input.mimeType ?? 'image/jpeg',
      upsert: false,
    });
  if (upErr) throw upErr;

  const info = await FileSystem.getInfoAsync(input.localUri);
  const sizeBytes = info.exists && 'size' in info ? info.size : null;

  const { data, error } = await supabase
    .from('evidences')
    .insert({
      trip_id: input.tripId ?? null,
      logbook_id: input.logbookId ?? null,
      incident_id: input.incidentId ?? null,
      driver_id: input.driverId,
      type: input.type,
      storage_path: path,
      mime_type: input.mimeType ?? 'image/jpeg',
      size_bytes: sizeBytes,
      lat: input.coords?.lat ?? null,
      lng: input.coords?.lng ?? null,
      taken_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Evidence;
}

export async function listEvidencesByTrip(tripId: string): Promise<Evidence[]> {
  if (isDemo) return demoStore.listEvidencesByTrip(tripId);
  const { data, error } = await supabase
    .from('evidences')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Evidence[];
}

export async function getSignedUrl(path: string, expiresSec = 3600): Promise<string> {
  if (isDemo) return path; // ya es ruta local
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresSec);
  if (error) throw error;
  return data.signedUrl;
}
