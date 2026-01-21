
export interface Teacher {
  name: string;
  email: string;
  phone: string;
  position: 'Ketua' | 'Pengiring';
  order?: number;
}

export interface Student {
  name: string;
  ic: string;
  gender: 'Lelaki' | 'Perempuan' | '';
  race: string;
  category: string;
  playerId: string;
  categoryDisplay?: string;
}

export interface Registration {
  schoolName: string;
  schoolType: string;
  teachers: Teacher[];
  students: Student[];
  createdAt: string;
  updatedAt: string;
  status: string;
}

export type RegistrationsMap = Record<string, Registration>;

export interface DistrictConfig {
  id: string; // e.g., 'mssdmuar'
  name: string;
  spreadsheetId: string;
  adminPhone: string;
  venue: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalSchools?: number;
  totalStudents?: number;
}

export interface EventConfig {
  eventName: string;
  eventVenue: string;
  adminPhone: string;
  schedules: {
    primary: ScheduleDay[];
    secondary: ScheduleDay[];
  };
  links: {
    rules: string;
    results: string;
    photos: string;
  };
  documents: {
    invitation: string;
    meeting: string;
    arbiter: string;
  };
}

export interface ScheduleItem {
  time: string;
  activity: string;
}

export interface ScheduleDay {
  date: string;
  items: ScheduleItem[];
}
