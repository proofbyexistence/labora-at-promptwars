import { useState } from 'react';
import { Calendar, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { PageId } from '../components/EquipmentCard';
import { EquipmentDoodle } from '../components/LabDoodles';
import {
  bookSlot,
  cancelSlotBooking,
  getDepartments,
  getItemById,
  getItems,
  getLabs,
  getSlots,
} from '../js/labData';
import type { TimeSlot } from '../js/types';

interface SmartBookingPageProps {
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  onNavigate: (
    page: PageId,
    options?: { departmentId?: string; labId?: string; itemId?: string }
  ) => void;
  onDataMutated: () => void;
}

export function SmartBookingPage({
  selectedItemId,
  onSelectItem,
  onNavigate,
  onDataMutated,
}: SmartBookingPageProps) {
  const [sessionNote, setSessionNote] = useState('');
  const [feedback, setFeedback] = useState<string>('');

  const allItems = getItems();
  const departments = getDepartments();
  const labs = getLabs();
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const labMap = new Map(labs.map((l) => [l.id, l]));

  const currentItem = getItemById(selectedItemId) ?? allItems[0];
  const slots = currentItem ? getSlots(currentItem.id) : [];

  // Group slots by calendar date for clear notebook schedule layout.
  const groupedSlots = slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const handleBook = (slotId: string) => {
    if (!currentItem) return;
    const booked = bookSlot(slotId, currentItem.id, sessionNote);
    if (booked) {
      setFeedback(`Reserved ${booked.date} (${booked.window}) for ${currentItem.name}.`);
      setSessionNote('');
      onDataMutated();
    }
  };

  const handleRelease = (slotId: string) => {
    if (!currentItem) return;
    const released = cancelSlotBooking(slotId, currentItem.id);
    if (released) {
      setFeedback(`Released slot ${released.date} (${released.window}).`);
      onDataMutated();
    }
  };

  if (!currentItem) {
    return null;
  }

  const currentLab = labMap.get(currentItem.labId);

  return (
    <div className="space-y-6">
      <section className="notebook-sheet p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
          <div>
            <h1 className="text-3xl font-bold text-[var(--ink)] sm:text-4xl">
              Smart Booking
            </h1>
            <p className="mt-1 text-base text-[var(--ink)]">
              Pick an equipment item and reserve an open bench window. Changes save directly to your local notebook session.
            </p>
          </div>

          <div className="w-full sm:w-80">
            <label
              htmlFor="booking-item-select"
              className="block text-base font-bold text-[var(--ink)]"
            >
              Selected Equipment
            </label>
            <select
              id="booking-item-select"
              value={currentItem.id}
              onChange={(e) => {
                setFeedback('');
                onSelectItem(e.target.value);
              }}
              className="notebook-input mt-1"
            >
              {departments.map((dept) => (
                <optgroup key={dept.id} label={dept.name}>
                  {allItems
                    .filter((item) => item.departmentId === dept.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.status})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Instrument Brief */}
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex flex-col items-center justify-center rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] p-6 text-center">
              <EquipmentDoodle
                type={currentItem.type}
                departmentId={currentItem.departmentId}
                className="h-28 w-28"
              />
              <div className="mt-2 font-heading text-2xl font-bold text-[var(--ink)]">
                {currentItem.name}
              </div>
              <div className="text-sm text-[var(--ink)]">{currentItem.type}</div>
            </div>

            <div className="mt-4 space-y-2 text-base">
              <div className="flex items-center justify-between border-b border-[var(--ink)]/25 pb-2">
                <span className="font-bold text-[var(--ink)]">Department</span>
                <span className="text-[var(--ink)]">
                  {deptMap.get(currentItem.departmentId)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--ink)]/25 pb-2">
                <span className="font-bold text-[var(--ink)]">Laboratory</span>
                <span className="tabular-nums text-[var(--ink)]">
                  {currentLab?.name} ({currentLab?.room})
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--ink)]/25 pb-2">
                <span className="font-bold text-[var(--ink)]">Supervisor</span>
                <span className="text-[var(--ink)]">{currentLab?.supervisor}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--ink)]/25 pb-2">
                <span className="font-bold text-[var(--ink)]">Access Level</span>
                <span className="text-[var(--ink)]">
                  {currentItem.accessLevel}
                </span>
              </div>
              <p className="pt-1 text-base leading-relaxed text-[var(--ink)]">
                {currentItem.specs}
              </p>
            </div>

            {currentItem.accessLevel !== 'Open' && (
              <div className="mt-4 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--status-limited-bg)] p-4 text-base text-[var(--ink)]">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-[var(--ink)]" aria-hidden="true" />
                  <div>
                    <p className="font-bold">
                      {currentItem.accessLevel}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ink)]">
                      Submit a formal access request if you have not yet been cleared by {currentLab?.supervisor}.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('request', { itemId: currentItem.id })}
                      className="labora-btn labora-btn-paper mt-3 text-sm"
                    >
                      Open Request Access form
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Slot Calendar & Booking Action */}
          <div className="lg:col-span-7">
            <div className="mb-4">
              <label
                htmlFor="booking-note"
                className="block text-base font-bold text-[var(--ink)]"
              >
                Experiment / Session Note (optional)
              </label>
              <input
                id="booking-note"
                type="text"
                value={sessionNote}
                onChange={(e) => setSessionNote(e.target.value)}
                placeholder="e.g., Baseline calibration run for Senior Design Lab"
                className="notebook-input mt-1"
              />
            </div>

            {feedback && (
              <div
                role="status"
                className="mb-4 flex items-center gap-2 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--status-available-bg)] px-3.5 py-2.5 text-base font-bold text-[var(--ink)]"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{feedback}</span>
              </div>
            )}

            <div className="space-y-5">
              {Object.entries(groupedSlots).map(([date, daySlots]) => (
                <div key={date} className="rounded-[12px] border-2 border-[var(--ink)] bg-[var(--paper)] p-4">
                  <div className="mb-3 flex items-center gap-2 border-b-2 border-[var(--ink)] pb-2 text-lg font-bold text-[var(--ink)]">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span className="tabular-nums">{date}</span>
                  </div>

                  <ul className="space-y-2.5">
                    {daySlots.map((slot) => (
                      <li
                        key={slot.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--white)] px-3.5 py-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-base font-bold text-[var(--ink)]">
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            <span className="tabular-nums">{slot.window}</span>
                            <span className="text-sm font-normal">
                              ({slot.durationHours}h)
                            </span>
                          </div>
                          {slot.booked ? (
                            <p className="mt-1 text-sm text-[var(--ink)]">
                              Reserved by <strong>{slot.bookedBy}</strong>
                              {slot.note ? ` · ${slot.note}` : ''}
                            </p>
                          ) : (
                            <p className="mt-1">
                              <span className="status-badge status-badge-available text-sm">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Open for booking</span>
                              </span>
                            </p>
                          )}
                        </div>

                        {slot.booked ? (
                          <button
                            type="button"
                            onClick={() => handleRelease(slot.id)}
                            className="labora-btn labora-btn-paper text-sm"
                          >
                            Release Slot
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBook(slot.id)}
                            className="labora-btn text-sm"
                          >
                            Reserve Window
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
