
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

export interface AppState {
  registrations: RegistrationsMap;
  lastSync: Date | null;
  isLoading: boolean;
  syncStatus: { message: string; type: 'success' | 'warning' | 'error' | 'info' } | null;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  scriptUrl: string;
}

export interface ScheduleItem {
  time: string;
  activity: string;
}

export interface ScheduleDay {
  date: string;
  items: ScheduleItem[];
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
