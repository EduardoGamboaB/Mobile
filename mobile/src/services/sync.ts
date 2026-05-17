import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';
import { offlineQueue } from './offlineQueue';
import { createLogbookEntry, type NewLogbookEntry } from '@/api/logbook';
import { createIncident, type NewIncident } from '@/api/incidents';
import { uploadEvidence } from '@/api/evidences';
import type { EvidenceTypeValue } from '@/constants/enums';

interface EvidencePayload {
  driverId: string;
  tripId?: string | null;
  logbookId?: string | null;
  incidentId?: string | null;
  type: EvidenceTypeValue;
  localUri: string;
  mimeType?: string;
}

class SyncService {
  private interval: ReturnType<typeof setInterval> | null = null;
  private netSub: NetInfoSubscription | null = null;
  private running = false;

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => void this.flush(), 30_000);
    this.netSub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void this.flush();
    });
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (this.netSub) this.netSub();
    this.netSub = null;
  }

  async flush(): Promise<{ ok: number; failed: number }> {
    if (this.running) return { ok: 0, failed: 0 };
    this.running = true;
    let ok = 0;
    let failed = 0;
    try {
      const items = await offlineQueue.list();
      for (const item of items) {
        try {
          if (item.kind === 'logbook') {
            await createLogbookEntry(item.payload as NewLogbookEntry);
          } else if (item.kind === 'incident') {
            await createIncident(item.payload as NewIncident);
          } else if (item.kind === 'evidence') {
            const p = item.payload as EvidencePayload;
            await uploadEvidence({
              driverId: p.driverId,
              tripId: p.tripId ?? null,
              logbookId: p.logbookId ?? null,
              incidentId: p.incidentId ?? null,
              type: p.type,
              localUri: p.localUri,
              mimeType: p.mimeType,
            });
          }
          await offlineQueue.remove(item.id);
          ok++;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          await offlineQueue.markFailed(item.id, msg);
          failed++;
        }
      }
    } finally {
      this.running = false;
    }
    return { ok, failed };
  }
}

export const syncService = new SyncService();
