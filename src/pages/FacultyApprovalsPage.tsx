import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  getDepartments,
  getRequests,
  reviewAccessRequest,
} from '../js/labData';
import type { CampusUser, RequestStatus, UserRole } from '../js/types';

interface FacultyApprovalsPageProps {
  currentUser: CampusUser;
  onSwitchRole: (role: UserRole) => void;
  onDataMutated: () => void;
}

const STATUS_FILTERS: (RequestStatus | '')[] = [
  '',
  'Pending',
  'Needs Info',
  'Approved',
  'Denied',
];

const STATUS_META: Record<
  RequestStatus,
  { className: string; Icon: typeof CheckCircle2 }
> = {
  Pending: { className: 'status-badge status-badge-limited', Icon: Clock },
  'Needs Info': { className: 'status-badge status-badge-limited', Icon: AlertTriangle },
  Approved: { className: 'status-badge status-badge-available', Icon: CheckCircle2 },
  Denied: { className: 'status-badge status-badge-booked', Icon: XCircle },
};

export function FacultyApprovalsPage({
  currentUser,
  onSwitchRole,
  onDataMutated,
}: FacultyApprovalsPageProps) {
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const departments = getDepartments();
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const allRequests = getRequests();
  const filteredRequests = getRequests({
    status: statusFilter,
    departmentId: departmentFilter || undefined,
  });

  const handleDecision = (requestId: string, decision: RequestStatus, existingNote: string) => {
    const draft = notesById[requestId] ?? existingNote;
    reviewAccessRequest(requestId, decision, draft);
    onDataMutated();
  };

  return (
    <div className="space-y-6">
      <section className="notebook-sheet p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--ink)] sm:text-4xl">
              Faculty Approvals
            </h1>
            <p className="mt-1 text-base text-[var(--ink)]">
              Review student safety clearances, team hour allocations, and deadline requests across campus labs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-[10px] border-2 border-[var(--ink)] bg-[var(--status-limited-bg)] px-4 py-2 text-center">
              <div className="font-heading text-3xl font-bold tabular-nums text-[var(--ink)] leading-none">
                {allRequests.filter((r) => r.status === 'Pending').length}
              </div>
              <div className="text-sm text-[var(--ink)]">Pending review</div>
            </div>
            <div className="rounded-[10px] border-2 border-[var(--ink)] bg-[var(--status-available-bg)] px-4 py-2 text-center">
              <div className="font-heading text-3xl font-bold tabular-nums text-[var(--ink)] leading-none">
                {allRequests.filter((r) => r.status === 'Approved').length}
              </div>
              <div className="text-sm text-[var(--ink)]">Approved</div>
            </div>
          </div>
        </div>

        {currentUser.role !== 'faculty' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--lavender-soft)] px-4 py-3 text-base text-[var(--ink)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>
                You are currently viewing as <strong>Student ({currentUser.name})</strong>. Switch to Faculty view to sign off on approvals.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSwitchRole('faculty')}
              className="labora-btn text-sm"
            >
              Switch to Faculty View
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-[var(--ink)]/25 pt-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Approval status filter">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status || 'all'}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`labora-btn text-sm ${
                  statusFilter === status ? '' : 'labora-btn-paper'
                }`}
              >
                {status || 'All Requests'}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <label htmlFor="approvals-dept" className="sr-only">
              Filter by department
            </label>
            <select
              id="approvals-dept"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="notebook-input"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Request Cards */}
      <section aria-label="Approval queue" className="space-y-5">
        {filteredRequests.map((req, index) => {
          const noteValue = notesById[req.id] ?? req.facultyNote;
          const isFaculty = currentUser.role === 'faculty';
          const statusMeta = STATUS_META[req.status];
          const StatusIcon = statusMeta.Icon;

          return (
            <article
              key={req.id}
              className={`notebook-sheet ${
                index % 2 === 1 ? 'notebook-sheet-alt-tape' : ''
              } p-5`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--ink)]">
                    <span className="tabular-nums font-bold">{req.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{deptMap.get(req.departmentId)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">Submitted {req.submittedAt}</span>
                  </div>
                  <h2 className="mt-1 text-2xl font-bold text-[var(--ink)]">
                    {req.project}
                  </h2>
                  <p className="mt-0.5 text-base font-bold text-[var(--ink)]">
                    {req.equipmentNeeded}
                  </p>
                </div>

                <span className={statusMeta.className}>
                  <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{req.status}</span>
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-y-2 border-dashed border-[var(--ink)]/25 py-3 text-base sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-[var(--ink)]">Student</dt>
                  <dd className="mt-0.5 font-bold text-[var(--ink)]">
                    {req.student} ({req.studentId})
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--ink)]">Deadline</dt>
                  <dd className="mt-0.5 tabular-nums font-bold text-[var(--ink)]">
                    {req.deadline}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--ink)]">Team Size</dt>
                  <dd className="mt-0.5 tabular-nums font-bold text-[var(--ink)]">
                    {req.teamSize} members
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--ink)]">Bench Hours</dt>
                  <dd className="mt-0.5 tabular-nums font-bold text-[var(--ink)]">
                    {req.hoursNeeded} hrs
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <label
                    htmlFor={`note-${req.id}`}
                    className="block text-base font-bold text-[var(--ink)]"
                  >
                    Supervisor Review Note
                  </label>
                  <input
                    id={`note-${req.id}`}
                    type="text"
                    value={noteValue}
                    disabled={!isFaculty}
                    onChange={(e) =>
                      setNotesById((prev) => ({ ...prev, [req.id]: e.target.value }))
                    }
                    placeholder={
                      isFaculty
                        ? 'Add safety condition, room note, or reason...'
                        : 'Switch to Faculty view to add review notes'
                    }
                    className="notebook-input mt-1"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!isFaculty}
                    onClick={() => handleDecision(req.id, 'Approved', req.facultyNote)}
                    className="labora-btn !bg-[var(--status-available-bg)] text-sm"
                  >
                    <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={!isFaculty}
                    onClick={() => handleDecision(req.id, 'Needs Info', req.facultyNote)}
                    className="labora-btn labora-btn-paper text-sm"
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Needs Info
                  </button>

                  <button
                    type="button"
                    disabled={!isFaculty}
                    onClick={() => handleDecision(req.id, 'Denied', req.facultyNote)}
                    className="labora-btn !bg-[var(--status-booked-bg)] text-sm"
                  >
                    <X className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Deny
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="notebook-sheet p-8 text-center text-base text-[var(--ink)]">
            No access requests match the selected status and department filters.
          </div>
        )}
      </section>
    </div>
  );
}
