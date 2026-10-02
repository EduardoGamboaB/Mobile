import type { TelemetryProvider, VehicleKind } from '../dtos/telemetry';

export const TelemetryEventType = {
  PositionReceived: 'telemetry.position_received',
} as const;

/** `telemetry.position_received`: un punto GPS válido y nuevo quedó registrado. */
export interface TelemetryPositionReceivedEvent {
  pointId: string;
  deviceId: string;
  provider: TelemetryProvider;
  vehicleId: string | null;
  vehicleKind: VehicleKind | null;
  recordedAt: string;
  lat: number;
  lng: number;
  speedKph: number | null;
  headingDeg: number | null;
  ignition: boolean | null;
  eventCode: string | null;
}
