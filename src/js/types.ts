export type EquipmentType = 'Instruments' | 'Development kits' | 'Workstations' | 'Safety gear';

export type AvailabilityStatus = 'Available' | 'Limited' | 'Booked';

export type AccessLevel = 'Open' | 'Needs faculty approval' | 'Training required';

export type RequestStatus = 'Pending' | 'Approved' | 'Needs Info' | 'Denied';

export type UserRole = 'student' | 'faculty';

export interface Department {
  id: string;
  code: string;
  name: string;
  building: string;
  leadFaculty: string;
  summary: string;
}

export interface Lab {
  id: string;
  name: string;
  departmentId: string;
  room: string;
  supervisor: string;
  hours: string;
  description: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  departmentId: string;
  labId: string;
  type: EquipmentType;
  location: string;
  status: AvailabilityStatus;
  accessLevel: AccessLevel;
  nextFreeSlot: string;
  specs: string;
  image: string;
}

export interface TimeSlot {
  id: string;
  itemId: string;
  date: string;
  window: string;
  durationHours: number;
  booked: boolean;
  bookedBy: string | null;
  note: string;
}

export interface AccessRequest {
  id: string;
  student: string;
  studentId: string;
  departmentId: string;
  itemId: string;
  equipmentNeeded: string;
  project: string;
  deadline: string;
  status: RequestStatus;
  teamSize: number;
  hoursNeeded: number;
  submittedAt: string;
  facultyNote: string;
}

export interface CampusUser {
  id: string;
  role: UserRole;
  name: string;
  title: string;
  email: string;
  departmentId: string;
}

export interface LabDataset {
  departments: Department[];
  labs: Lab[];
  items: EquipmentItem[];
  slots: TimeSlot[];
  requests: AccessRequest[];
  users: Record<UserRole, CampusUser>;
}

export interface ItemFilters {
  departmentId?: string;
  labId?: string;
  type?: EquipmentType | '';
  status?: AvailabilityStatus | '';
  accessLevel?: AccessLevel | '';
  query?: string;
}

export interface RequestFilters {
  status?: RequestStatus | '';
  departmentId?: string;
  student?: string;
}

export interface NewRequestInput {
  itemId: string;
  project: string;
  deadline: string;
  teamSize: number;
  hoursNeeded: number;
  justification?: string;
}
