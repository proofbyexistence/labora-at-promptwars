import seedData from '../data/labs.json';
import {
  normalizeSelectedItemIds,
  transitionRequest,
  validateRequest,
  type TransitionResult,
} from './requests';
import type { AllocationResult } from './scheduler';
import { DEFAULT_REFERENCE_DATE, formatHour, parseHour } from './scheduler';
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

// Migrate any legacy status strings stored in browser localStorage from earlier builds.
function normalizePersistedRequest(req: AccessRequest): AccessRequest {
  const rawStatus = req.status as string;
  let status: RequestStatus = req.status;
  if (rawStatus === 'Pending') status = 'Submitted';
  else if (rawStatus === 'Needs Info') status = 'Changes requested';
  else if (rawStatus === 'Denied') status = 'Rejected';
  return {
    ...req,
    status,
    itemIds: req.itemIds && req.itemIds.length > 0 ? req.itemIds : [req.itemId],
  };
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
          base.requests = parsed.requests.map(normalizePersistedRequest);
        }
        // Demo role switch state persisted locally (defaults to student).
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

export function getAllSlots(): TimeSlot[] {
  return state.dataset.slots.map((slot) => ({ ...slot }));
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
  slot.status = 'free';
  slot.requestId = null;
  syncItemAvailabilityFromSlots(itemId);
  persistState();
  return { ...slot };
}

export function createCustomBooking(input: {
  itemId: string;
  date: string;
  start: string;
  durationHours: number;
  purpose: string;
  bookedBy?: string;
  requestId?: string | null;
}): TimeSlot | null {
  const startHour = parseHour(input.start);
  if (!Number.isFinite(startHour) || input.durationHours < 1) {
    return null;
  }

  const end = formatHour(startHour + input.durationHours);
  const user = getCurrentUser();
  const created: TimeSlot = {
    id: `sl-custom-${input.itemId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: input.itemId,
    date: input.date,
    window: `${input.start} – ${end}`,
    durationHours: input.durationHours,
    booked: true,
    bookedBy: input.bookedBy ?? user.name,
    note: input.purpose.trim(),
    start: input.start,
    end,
    status: 'booked',
    requestId: input.requestId ?? null,
  };

  state.dataset.slots.push(created);
  syncItemAvailabilityFromSlots(input.itemId);
  persistState();
  return { ...created };
}

export function applyAllocationSuggestion(result: AllocationResult): void {
  for (const assignment of result.assignments) {
    createCustomBooking({
      itemId: assignment.itemId,
      date: assignment.date,
      start: assignment.start,
      durationHours: assignment.durationHours,
      purpose: `AI Fair Allocation (${assignment.score}/100)`,
      bookedBy: assignment.student,
      requestId: assignment.requestId,
    });

    const req = state.dataset.requests.find((r) => r.id === assignment.requestId);
    if (req) {
      req.status = 'Approved';
      req.facultyNote = `Allocated ${assignment.date} ${assignment.start}–${assignment.end} via fair-allocation engine.`;
    }
  }

  for (const alt of result.alternatives) {
    const req = state.dataset.requests.find((r) => r.id === alt.requestId);
    if (req) {
      req.status = 'Changes requested';
      req.facultyNote = alt.reason;
      req.reviewedAt = DEFAULT_REFERENCE_DATE;
    }
  }

  persistState();
}

export function submitAccessRequest(input: NewRequestInput): AccessRequest | null {
  const itemIds = normalizeSelectedItemIds(input);
  const selectedItems = itemIds
    .map((id) => getItemById(id))
    .filter((item): item is EquipmentItem => Boolean(item));
  if (selectedItems.length === 0 || selectedItems.length !== itemIds.length) {
    return null;
  }

  const primaryItem = selectedItems[0];
  const resolvedDepartmentId = input.departmentId || primaryItem.departmentId;
  const validation = validateRequest(
    {
      ...input,
      itemIds,
      departmentId: resolvedDepartmentId,
      subjectCourse: input.subjectCourse ?? 'LAB 400 · Independent Research',
      justification:
        input.justification ??
        'Requesting scheduled bench access for course research project.',
      trainingConfirmed: input.trainingConfirmed ?? true,
    },
    {
      departments: state.dataset.departments,
      items: state.dataset.items,
      referenceDate: DEFAULT_REFERENCE_DATE,
    }
  );
  if (!validation.ok) {
    return null;
  }

  const user = getCurrentUser();
  const nextNumber = state.dataset.requests.length + 101;
  const created: AccessRequest = {
    id: `req-${nextNumber}-${Date.now().toString(36)}`,
    student: user.name,
    studentId: user.id,
    departmentId: resolvedDepartmentId,
    itemId: primaryItem.id,
    itemIds,
    equipmentNeeded: selectedItems.map((item) => item.name).join(', '),
    project: input.project.trim(),
    subjectCourse: (input.subjectCourse ?? 'LAB 400 · Independent Research').trim(),
    deadline: input.deadline,
    status: 'Submitted',
    teamSize: Math.max(1, Number(input.teamSize) || 1),
    hoursNeeded: Math.max(1, Number(input.hoursNeeded) || 1),
    submittedAt: DEFAULT_REFERENCE_DATE,
    justification: (input.justification ?? '').trim(),
    trainingConfirmed: Boolean(input.trainingConfirmed),
    facultyNote: '',
  };

  state.dataset.requests.unshift(created);
  persistState();
  return { ...created };
}

export function transitionAccessRequest(
  requestId: string,
  nextStatus: RequestStatus,
  reason = ''
): TransitionResult | null {
  const idx = state.dataset.requests.findIndex((req) => req.id === requestId);
  if (idx === -1) {
    return null;
  }

  const current = state.dataset.requests[idx];
  const result = transitionRequest(current, nextStatus, reason, DEFAULT_REFERENCE_DATE);
  if (result.ok) {
    state.dataset.requests[idx] = result.request;
    persistState();
  }
  return result;
}

export function reviewAccessRequest(
  requestId: string,
  decision: RequestStatus,
  facultyNote: string
): AccessRequest | null {
  const idx = state.dataset.requests.findIndex((req) => req.id === requestId);
  if (idx === -1) {
    return null;
  }

  let target = state.dataset.requests[idx];
  // If a faculty reviewer decides directly on a newly Submitted request, step cleanly through Under review.
  if (
    target.status === 'Submitted' &&
    (decision === 'Approved' || decision === 'Rejected' || decision === 'Changes requested')
  ) {
    const startReview = transitionRequest(target, 'Under review', '', DEFAULT_REFERENCE_DATE);
    if (!startReview.ok) {
      return null;
    }
    target = startReview.request;
  }

  const result = transitionRequest(target, decision, facultyNote, DEFAULT_REFERENCE_DATE);
  if (!result.ok) {
    return null;
  }

  state.dataset.requests[idx] = result.request;
  persistState();
  return { ...result.request };
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
