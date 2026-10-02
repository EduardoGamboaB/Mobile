import { isDemo, demoStore } from '@/demo';
import type { Incident } from '@/models';
import type { IncidentTypeValue, IncidentUrgencyValue } from '@/constants/enums';
import { incidentsApi } from './g3/incidents';
import { incidentFromDto, incidentToDto } from './mappers';

export interface NewIncident {
  client_uuid: string;
  trip_id?: string | null;
  driver_id: string;
  type: IncidentTypeValue;
  description: string;
  occurred_at: string;
  location_text?: string | null;
  lat?: number | null;
  lng?: number | null;
  urgency: IncidentUrgencyValue;
}

export async function listMyIncidents(_driverId: string): Promise<Incident[]> {
  if (isDemo) return demoStore.listIncidents();
  return (await incidentsApi.mine()).map(incidentFromDto);
}

export async function createIncident(incident: NewIncident): Promise<Incident> {
  if (isDemo) {
    return demoStore.addIncident({
      id: incident.client_uuid,
      client_uuid: incident.client_uuid,
      trip_id: incident.trip_id ?? null,
      driver_id: incident.driver_id,
      type: incident.type,
      description: incident.description,
      occurred_at: incident.occurred_at,
      location_text: incident.location_text ?? null,
      lat: incident.lat ?? null,
      lng: incident.lng ?? null,
      urgency: incident.urgency,
      resolved: false,
      resolved_at: null,
      created_at: new Date().toISOString(),
    });
  }
  // Llega al centro de incidentes de G3 Admin con SLA según urgencia.
  return incidentFromDto(await incidentsApi.report(incidentToDto(incident)));
}

/** Botón SOS: incidente crítico con ubicación; escala por push y WhatsApp. */
export async function sendSos(input: {
  client_uuid: string;
  trip_id: string | null;
  driver_id: string;
  lat: number | null;
  lng: number | null;
}): Promise<Incident> {
  const occurred_at = new Date().toISOString();
  if (isDemo) {
    return demoStore.addIncident({
      id: input.client_uuid,
      client_uuid: input.client_uuid,
      trip_id: input.trip_id,
      driver_id: input.driver_id,
      type: 'sos',
      description: 'SOS activado por el operador',
      occurred_at,
      location_text: null,
      lat: input.lat,
      lng: input.lng,
      urgency: 'critical',
      resolved: false,
      resolved_at: null,
      created_at: occurred_at,
    });
  }
  return incidentFromDto(
    await incidentsApi.sos({
      clientUuid: input.client_uuid,
      tripId: input.trip_id,
      driverId: input.driver_id,
      lat: input.lat,
      lng: input.lng,
      occurredAt: occurred_at,
    }),
  );
}
