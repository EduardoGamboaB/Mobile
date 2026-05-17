/**
 * Estado de un punto del checklist durante una inspección.
 * `status` se reinicia al iniciar una nueva inspección.
 */
export type InspectionStatus = 'pending' | 'ok' | 'fail';

export interface AiFinding {
  severity: 'info' | 'warning' | 'critical';
  note: string;
}

export interface InspectionResult {
  checkpointId: string;
  status: InspectionStatus;
  photoUri: string | null;
  notes: string | null;
  aiFindings: AiFinding[];
  checkedAt: string | null;
}
