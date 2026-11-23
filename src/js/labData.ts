import seedData from '../data/labs.json';
import type {
  AccessRequest,
  CampusUser,
  Department,
  EquipmentItem,
  ItemFilters,
  Lab,
  LabDataset,
  NewRequestInput,
  RequestFilters,
  RequestStatus,
  TimeSlot,
  UserRole,
} from './types';

const STORAGE_KEY = 'labora_notebook_state_v1';

interface PersistedState {
  items: EquipmentItem[];
  slots: TimeSlot[];
  requests: AccessRequest[];
  activeRole: UserRole;
}

const DEFAULT_SLOT_WINDOWS = [
  { dayOffset: 0, window: '14:00 – 16:00', durationHours: 2 },
  { dayOffset: 0, window: '16:30 – 18:30', durationHours: 2 },
  { dayOffset: 1, window: '09:30 – 11:30', durationHours: 2 },
  { dayOffset: 1, window: '13:30 – 15:30', durationHours: 2 },
];

function cloneDataset(): LabDataset {
  return JSON.parse(JSON.stringify(seedData)) as LabDataset;
}

function buildDateString(dayOffset: number): string {
  const base = new Date('2026-11-23T00:00:00');
  base.setDate(base.getDate() + dayOffset);
  return base.toISOString().slice(0, 10);
}

// Generate deterministic fallback slots for items without explicit seed slots
// so every item in the 43-item catalog can be scheduled on Smart Booking.
function ensureSlotsForAllItems(items: EquipmentItem[], seedSlots: TimeSlot[]): TimeSlot[] {
  const slotsByItem = new Map<string, TimeSlot[]>();
  for (const slot of seedSlots) {
    const existing = slotsByItem.get(slot.itemId) ?? [];
    existing.push(slot);
    slotsByItem.set(slot.itemId, existing);
  }

  const combined: TimeSlot[] = [...seedSlots];
  for (const item of items) {
    if (slotsByItem.has(item.id)) {
      continue;
    }
    DEFAULT_SLOT_WINDOWS.forEach((tpl, idx) => {
      const isBooked =
        item.status === 'Booked' || (item.status === 'Limited' && idx < 2);
      combined.push({
        id: `sl-auto-${item.id}-${idx + 1}`,
        itemId: item.id,
        date: buildDateString(tpl.dayOffset),
        window: tpl.window,
        durationHours: tpl.durationHours,
        booked: isBooked,
        bookedBy: isBooked ? 'Assigned Lab Cohort' : null,
        note: isBooked ? 'Reserved coursework session' : '',
      });
    });
  }
  return combined;
}

function loadInitialState(): {
  dataset: LabDataset;
  activeRole: UserRole;
} {
  const base = cloneDataset();
  base.slots = ensureSlotsForAllItems(base.items, base.slots);

  // Guard localStorage access in case storage is blocked in private browsing or test runners.
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          base.items = parsed.items;
        }
        if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
          base.slots = parsed.slots;
        }
        if (Array.isArray(parsed.requests) && parsed.requests.length > 0) {
          base.requests = parsed.requests;
        }
        const role: UserRole =
          parsed.activeRole === 'faculty' ? 'faculty' : 'student';
        return { dataset: base, activeRole: role };
      }
    }
  } catch {
    // Fall back silently to in-memory seed data if localStorage is unavailable or corrupt.
  }

  return { dataset: base, activeRole: 'student' };
}

let state = loadInitialState();

function persistState(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const payload: PersistedState = {
        items: state.dataset.items,
        slots: state.dataset.slots,
        requests: state.dataset.requests,
        activeRole: state.activeRole,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // Ignore storage quota or security errors; state remains active in memory.
  }
}

export function getDepartments(): Department[] {
  return state.dataset.departments.map((dept) => ({ ...dept }));
}

export function getLabs(departmentId?: string): Lab[] {
  const labs = departmentId
    ? state.dataset.labs.filter((lab) => lab.departmentId === departmentId)
    : state.dataset.labs;
  return labs.map((lab) => ({ ...lab }));
}

export function getItems(filters: ItemFilters = {}): EquipmentItem[] {
  const query = (filters.query ?? '').trim().toLowerCase();
  return state.dataset.items
    .filter((item) => {
      if (filters.departmentId && item.departmentId !== filters.departmentId) {
        return false;
      }
      if (filters.labId && item.labId !== filters.labId) {
        return false;
      }
      if (filters.type && item.type !== filters.type) {
        return false;
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      if (filters.accessLevel && item.accessLevel !== filters.accessLevel) {
        return false;
      }
      if (query) {
        const haystack = `${item.name} ${item.specs} ${item.location} ${item.type}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    })
    .map((item) => ({ ...item }));
}

export function getItemById(itemId: string): EquipmentItem | undefined {
  const found = state.dataset.items.find((item) => item.id === itemId);
  return found ? { ...found } : undefined;
}

export function getSlots(itemId: string): TimeSlot[] {
  return state.dataset.slots
    .filter((slot) => slot.itemId === itemId)
    .map((slot) => ({ ...slot }));
}

export function getRequests(filters: RequestFilters = {}): AccessRequest[] {
  return state.dataset.requests
    .filter((req) => {
      if (filters.status && req.status !== filters.status) {
        return false;
      }
      if (filters.departmentId && req.departmentId !== filters.departmentId) {
        return false;
      }
      if (filters.student && req.student !== filters.student) {
        return false;
      }
      return true;
    })
    .map((req) => ({ ...req }));
}

export function getUsers(): Record<UserRole, CampusUser> {
  return {
    student: { ...state.dataset.users.student },
    faculty: { ...state.dataset.users.faculty },
  };
}

export function getCurrentUser(): CampusUser {
  return { ...state.dataset.users[state.activeRole] };
}

export function switchUserRole(role: UserRole): CampusUser {
  state.activeRole = role;
  persistState();
  return getCurrentUser();
}

function syncItemAvailabilityFromSlots(itemId: string): void {
  const item = state.dataset.items.find((entry) => entry.id === itemId);
  if (!item) return;

  const itemSlots = state.dataset.slots.filter((s) => s.itemId === itemId);
  const openSlots = itemSlots.filter((s) => !s.booked);

  if (openSlots.length === 0) {
    item.status = 'Booked';
    item.nextFreeSlot = 'Waitlist open';
  } else if (openSlots.length <= 1) {
    item.status = 'Limited';
    const next = openSlots[0];
    item.nextFreeSlot = `${next.date.slice(5)} · ${next.window.split(' ')[0]}`;
  } else {
    item.status = 'Available';
    const next = openSlots[0];
    item.nextFreeSlot = `${next.date.slice(5)} · ${next.window.split(' ')[0]}`;
  }
}

export function bookSlot(slotId: string, itemId: string, note = ''): TimeSlot | null {
  const slot = state.dataset.slots.find(
    (entry) => entry.id === slotId && entry.itemId === itemId
  );
  if (!slot || slot.booked) {
    return null;
  }

  const user = getCurrentUser();
  slot.booked = true;
  slot.bookedBy = user.name;
  slot.note = note.trim() || 'Lab notebook session';
  syncItemAvailabilityFromSlots(itemId);
  persistState();
  return { ...slot };
}

export function cancelSlotBooking(slotId: string, itemId: string): TimeSlot | null {
  const slot = state.dataset.slots.find(
    (entry) => entry.id === slotId && entry.itemId === itemId
  );
  if (!slot || !slot.booked) {
    return null;
  }

  slot.booked = false;
  slot.bookedBy = null;
  slot.note = '';
  syncItemAvailabilityFromSlots(itemId);
  persistState();
  return { ...slot };
}

export function submitAccessRequest(input: NewRequestInput): AccessRequest | null {
  const item = getItemById(input.itemId);
  if (!item) {
    return null;
  }

  const user = getCurrentUser();
  const nextNumber = state.dataset.requests.length + 101;
  const created: AccessRequest = {
    id: `req-${nextNumber}-${Date.now().toString(36)}`,
    student: user.name,
    studentId: user.id,
    departmentId: item.departmentId,
    itemId: item.id,
    equipmentNeeded: item.name,
    project: input.project.trim(),
    deadline: input.deadline,
    status: 'Pending',
    teamSize: Math.max(1, Number(input.teamSize) || 1),
    hoursNeeded: Math.max(1, Number(input.hoursNeeded) || 1),
    submittedAt: new Date().toISOString().slice(0, 10),
    facultyNote: input.justification?.trim() ?? '',
  };

  state.dataset.requests.unshift(created);
  persistState();
  return { ...created };
}

export function reviewAccessRequest(
  requestId: string,
  decision: RequestStatus,
  facultyNote: string
): AccessRequest | null {
  const target = state.dataset.requests.find((req) => req.id === requestId);
  if (!target) {
    return null;
  }

  target.status = decision;
  target.facultyNote = facultyNote.trim();
  persistState();
  return { ...target };
}

export function resetLabStore(): void {
  const base = cloneDataset();
  base.slots = ensureSlotsForAllItems(base.items, base.slots);
  state = {
    dataset: base,
    activeRole: 'student',
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage removal errors in restricted environments.
  }
}
