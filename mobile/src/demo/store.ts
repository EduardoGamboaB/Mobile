import type { Evidence, Incident, LogbookEntry, Profile, Trip } from '@/models';
import type { TripStatusValue } from '@/constants/enums';
import {
  demoIncidents,
  demoLogbook,
  demoProfile,
  demoTrips,
  demoNotifications,
  demoChats,
  demoChatMessages,
  demoPayments,
  demoInspectionChecklist,
  type DemoNotification,
  type DemoChatPreview,
  type DemoChatMessage,
  type DemoPayment,
  type InspectionItem,
} from './data';

interface DemoState {
  profile: Profile;
  trips: Trip[];
  logbook: LogbookEntry[];
  incidents: Incident[];
  evidences: Evidence[];
  notifications: DemoNotification[];
  chats: DemoChatPreview[];
  chatMessages: DemoChatMessage[];
  payments: DemoPayment[];
  inspection: InspectionItem[];
}

const state: DemoState = {
  profile: { ...demoProfile },
  trips: demoTrips.map((t) => ({ ...t })),
  logbook: demoLogbook.map((l) => ({ ...l })),
  incidents: demoIncidents.map((i) => ({ ...i })),
  evidences: [],
  notifications: demoNotifications.map((n) => ({ ...n })),
  chats: demoChats.map((c) => ({ ...c })),
  chatMessages: demoChatMessages.map((m) => ({ ...m })),
  payments: demoPayments.map((p) => ({ ...p })),
  inspection: demoInspectionChecklist.map((i) => ({ ...i })),
};

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

const ACTIVE: TripStatusValue[] = ['scheduled', 'loading', 'in_transit', 'unloading'];

const NEXT: Record<TripStatusValue, TripStatusValue | null> = {
  scheduled: 'loading',
  loading: 'in_transit',
  in_transit: 'unloading',
  unloading: 'finished',
  finished: null,
  cancelled: null,
};

export const demoStore = {
  // profile
  getProfile: () => delay({ ...state.profile }),
  patchProfile: (patch: Partial<Profile>) => {
    state.profile = { ...state.profile, ...patch };
    return delay({ ...state.profile });
  },

  // trips
  listActive: () => delay(state.trips.filter((t) => ACTIVE.includes(t.status))),
  listHistory: () =>
    delay(state.trips.filter((t) => t.status === 'finished' || t.status === 'cancelled')),
  getTrip: (id: string) => delay(state.trips.find((t) => t.id === id) ?? null),
  advanceStatus: (id: string, next: TripStatusValue) => {
    const idx = state.trips.findIndex((t) => t.id === id);
    if (idx < 0) return Promise.reject(new Error('trip not found'));
    const trip = state.trips[idx];
    if (NEXT[trip.status] !== next && next !== 'cancelled') {
      return Promise.reject(new Error(`invalid transition ${trip.status} -> ${next}`));
    }
    const updated: Trip = {
      ...trip,
      status: next,
      started_at: trip.started_at ?? (next === 'loading' ? new Date().toISOString() : null),
      finished_at: next === 'finished' ? new Date().toISOString() : trip.finished_at,
      updated_at: new Date().toISOString(),
    };
    state.trips[idx] = updated;
    return delay(updated);
  },

  // logbook
  listLogbook: (tripId: string) =>
    delay(
      state.logbook
        .filter((l) => l.trip_id === tripId)
        .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at)),
    ),
  addLogbookEntry: (entry: LogbookEntry) => {
    state.logbook.push(entry);
    return delay(entry);
  },

  // incidents
  listIncidents: () =>
    delay([...state.incidents].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))),
  addIncident: (inc: Incident) => {
    state.incidents.unshift(inc);
    return delay(inc);
  },

  // evidences
  listEvidencesByTrip: (tripId: string) =>
    delay(state.evidences.filter((e) => e.trip_id === tripId)),
  addEvidence: (ev: Evidence) => {
    state.evidences.unshift(ev);
    return delay(ev);
  },

  // notifications
  listNotifications: () => delay([...state.notifications]),
  markAllRead: () => {
    state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
    return delay(true);
  },
  unreadCount: () => state.notifications.filter((n) => !n.read).length,

  // chats
  listChats: () => delay([...state.chats]),
  listChatMessages: (chatId: string) =>
    delay(state.chatMessages.filter((m) => m.chatId === chatId).sort((a, b) => a.at.localeCompare(b.at))),
  sendChatMessage: (chatId: string, text: string) => {
    const msg: DemoChatMessage = {
      id: `m-${Date.now()}`,
      chatId,
      from: 'me',
      text,
      at: new Date().toISOString(),
      read: true,
    };
    state.chatMessages.push(msg);
    const chat = state.chats.find((c) => c.id === chatId);
    if (chat) {
      chat.lastMessage = text;
      chat.lastAt = msg.at;
    }
    return delay(msg);
  },

  // payments
  listPayments: () => delay([...state.payments]),
  getPayment: (id: string) => delay(state.payments.find((p) => p.id === id) ?? null),

  // inspection
  listInspection: () => delay([...state.inspection]),
  setInspectionStatus: (id: string, status: InspectionItem['status']) => {
    const idx = state.inspection.findIndex((i) => i.id === id);
    if (idx < 0) return Promise.reject(new Error('item not found'));
    state.inspection[idx] = { ...state.inspection[idx], status };
    return delay(state.inspection[idx]);
  },
};
