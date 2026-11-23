import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, XCircle } from 'lucide-react';
import {
  getDepartments,
  getItems,
  getRequests,
  submitAccessRequest,
} from '../js/labData';
import type { CampusUser, RequestStatus } from '../js/types';

interface RequestAccessPageProps {
  selectedItemId: string;
  currentUser: CampusUser;
  onDataMutated: () => void;
}

const REQUEST_STATUS_META: Record<
  RequestStatus,
  { className: string; Icon: typeof CheckCircle2 }
> = {
  Pending: { className: 'status-badge status-badge-limited', Icon: Clock },
  'Needs Info': { className: 'status-badge status-badge-limited', Icon: AlertTriangle },
  Approved: { className: 'status-badge status-badge-available', Icon: CheckCircle2 },
  Denied: { className: 'status-badge status-badge-booked', Icon: XCircle },
};

export function RequestAccessPage({
  selectedItemId,
  currentUser,
  onDataMutated,
}: RequestAccessPageProps) {
  const allItems = getItems();
  const departments = getDepartments();
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  const defaultItem =
    allItems.find((item) => item.id === selectedItemId) ??
    allItems.find((item) => item.accessLevel !== 'Open') ??
    allItems[0];

  const [itemId, setItemId] = useState(defaultItem?.id ?? '');
  const [project, setProject] = useState('');
  const [deadline, setDeadline] = useState('2026-12-10');
  const [teamSize, setTeamSize] = useState(2);
  const [hoursNeeded, setHoursNeeded] = useState(6);
  const [justification, setJustification] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState('');

  const requests = getRequests();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!itemId || !project.trim()) {
      return;
    }

    const created = submitAccessRequest({
      itemId,
      project,
      deadline,
      teamSize,
      hoursNeeded,
      justification,
    });

    if (created) {
      setSubmittedNotice(
        `Access request ${created.id} submitted for ${created.equipmentNeeded}.`
      );
      setProject('');
      setJustification('');
      onDataMutated();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Request Form */}
        <section className="notebook-sheet p-6 xl:col-span-5">
          <h1 className="text-3xl font-bold text-[var(--ink)]">
            Request Lab Access
          </h1>
          <p className="mt-1 text-base text-[var(--ink)]">
            Apply for faculty approval or safety-certified bench clearance for restricted instruments.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="req-student"
                className="block text-base font-bold text-[var(--ink)]"
              >
                Applicant
              </label>
              <input
                id="req-student"
                type="text"
                readOnly
                value={`${currentUser.name} (${currentUser.id})`}
                className="notebook-input mt-1 bg-[var(--paper)]"
              />
            </div>

            <div>
              <label
                htmlFor="req-item"
                className="block text-base font-bold text-[var(--ink)]"
              >
                Equipment Needed
              </label>
              <select
                id="req-item"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
                className="notebook-input mt-1"
              >
                {departments.map((dept) => (
                  <optgroup key={dept.id} label={dept.name}>
                    {allItems
                      .filter((item) => item.departmentId === dept.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} — {item.accessLevel}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="req-project"
                className="block text-base font-bold text-[var(--ink)]"
              >
                Project or Course Title
              </label>
              <input
                id="req-project"
                type="text"
                required
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g., Autonomous Optical Flow Bench Test"
                className="notebook-input mt-1"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="req-deadline"
                  className="block text-base font-bold text-[var(--ink)]"
                >
                  Deadline
                </label>
                <input
                  id="req-deadline"
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="notebook-input mt-1 tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="req-team"
                  className="block text-base font-bold text-[var(--ink)]"
                >
                  Team Size
                </label>
                <input
                  id="req-team"
                  type="number"
                  min={1}
                  max={12}
                  required
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="notebook-input mt-1 tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="req-hours"
                  className="block text-base font-bold text-[var(--ink)]"
                >
                  Hours Needed
                </label>
                <input
                  id="req-hours"
                  type="number"
                  min={1}
                  max={80}
                  required
                  value={hoursNeeded}
                  onChange={(e) => setHoursNeeded(Number(e.target.value))}
                  className="notebook-input mt-1 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="req-notes"
                className="block text-base font-bold text-[var(--ink)]"
              >
                Safety Briefing / Experiment Summary
              </label>
              <textarea
                id="req-notes"
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describe sample materials, lab safety orientation completed, or faculty sponsor..."
                className="notebook-input mt-1"
              />
            </div>

            {submittedNotice && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--status-available-bg)] px-3 py-2.5 text-base font-bold text-[var(--ink)]"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{submittedNotice}</span>
              </div>
            )}

            <button type="submit" className="labora-btn w-full">
              <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Submit Access Request
            </button>
          </form>
        </section>

        {/* Active Access Request Ledger */}
        <section className="notebook-sheet notebook-sheet-alt-tape p-6 xl:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-[var(--ink)] pb-3">
            <div>
              <h2 className="text-2xl font-bold text-[var(--ink)]">
                Access Request Ledger
              </h2>
              <p className="text-sm text-[var(--ink)]">
                Live campus queue synced with Faculty Approvals
              </p>
            </div>
            <span className="tabular-nums text-base font-bold text-[var(--ink)]">
              {requests.length} total requests
            </span>
          </div>

          <ul className="mt-4 divide-y-2 divide-dashed divide-[var(--ink)]/25">
            {requests.map((req) => {
              const statusMeta = REQUEST_STATUS_META[req.status];
              const StatusIcon = statusMeta.Icon;

              return (
                <li key={req.id} className="py-4 first:pt-1 last:pb-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-bold text-[var(--ink)]">
                      {req.project}
                    </h3>
                    <span className={statusMeta.className}>
                      <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{req.status}</span>
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-base text-[var(--ink)]">
                    <span className="font-bold">{req.equipmentNeeded}</span>
                    <span aria-hidden="true">·</span>
                    <span>{deptMap.get(req.departmentId)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--ink)]">
                    <span>
                      Applicant: <strong>{req.student}</strong>
                    </span>
                    <span className="tabular-nums">Team: {req.teamSize}</span>
                    <span className="tabular-nums">Hours: {req.hoursNeeded}h</span>
                    <span className="tabular-nums">Deadline: {req.deadline}</span>
                  </div>

                  {req.facultyNote && (
                    <p className="mt-2 rounded-[8px] border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]">
                      Note: {req.facultyNote}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
