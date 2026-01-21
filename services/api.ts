
import { RegistrationsMap, EventConfig, ScheduleDay } from "../types";

// --- DEFAULT DATA TEMPLATES ---

const DEFAULT_SCHEDULE_PRIMARY: ScheduleDay[] = [
  {
    date: "HARI PERTAMA",
    items: [
      { time: "8.00 pagi", activity: "Pendaftaran" },
      { time: "9.00 pagi", activity: "Pusingan 1" },
      { time: "11.00 pagi", activity: "Pusingan 2" }
    ]
  }
];

const DEFAULT_SCHEDULE_SECONDARY: ScheduleDay[] = [
  {
    date: "HARI PERTAMA",
    items: [
       { time: "8.00 pagi", activity: "Pendaftaran" },
       { time: "9.00 pagi", activity: "Pusingan 1" }
    ]
  }
];

const BASE_CONFIG: EventConfig = {
  eventName: "KEJOHANAN CATUR MSSD",
  eventVenue: "Dewan Sekolah",
  adminPhone: "60123456789",
  schedules: {
    primary: DEFAULT_SCHEDULE_PRIMARY,
    secondary: DEFAULT_SCHEDULE_SECONDARY
  },
  links: {
    rules: "#",
    results: "https://chess-results.com",
    photos: "#"
  },
  documents: {
    invitation: "#",
    meeting: "#",
    arbiter: "#"
  }
};

// --- DISTRICT CONFIGURATION DATABASE ---

interface DistrictData {
    scriptUrl: string;
    spreadsheetId: string;
    config: EventConfig;
}

// Keys here MUST match the first part of your subdomain (e.g. 'mssdmuar' for mssdmuar.pendaftarancatur.com)
const DISTRICTS: Record<string, DistrictData> = {
    'mssdmuar': {
        scriptUrl: 'https://script.google.com/macros/s/AKfycbwWNUtbfV4VKvsmbGyD4RWNUEVFdKwkk8bOsXuPdBkfgJ_-QFySGx0uJmfsBW5087mlPQ/exec',
        spreadsheetId: '1FJnBiWM5cuH0a1Yw0CxAR9zy_LiD1lVtQg9ijXRrPS4',
        config: {
            ...BASE_CONFIG,
            eventName: "KEJOHANAN CATUR MSSD MUAR 2025",
            eventVenue: "Dewan SMK Tun Dr Ismail",
            adminPhone: "60182046224"
        }
    },
    'mssdpasirgudang': {
        scriptUrl: 'REPLACE_WITH_PG_SCRIPT_URL',
        spreadsheetId: 'REPLACE_WITH_PG_SHEET_ID',
        config: {
            ...BASE_CONFIG,
            eventName: "KEJOHANAN CATUR MSSD PASIR GUDANG 2025",
            eventVenue: "Dewan SMK Pasir Gudang",
            adminPhone: "60123456789"
        }
    },
    'default': {
        scriptUrl: 'https://script.google.com/macros/s/AKfycbwWNUtbfV4VKvsmbGyD4RWNUEVFdKwkk8bOsXuPdBkfgJ_-QFySGx0uJmfsBW5087mlPQ/exec',
        spreadsheetId: '1FJnBiWM5cuH0a1Yw0CxAR9zy_LiD1lVtQg9ijXRrPS4',
        config: {
            ...BASE_CONFIG,
            eventName: "KEJOHANAN CATUR MSSD 2025",
            eventVenue: "Dewan Sekolah",
            adminPhone: "60182046224"
        }
    }
};

const getDistrictKey = (): string => {
    const params = new URLSearchParams(window.location.search);
    const districtParam = params.get('district');
    if (districtParam && DISTRICTS[districtParam.toLowerCase()]) {
        return districtParam.toLowerCase();
    }

    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return 'default';
    }

    const parts = hostname.split('.');
    if (parts.length >= 2) {
        const subdomain = parts[0].toLowerCase();
        if (subdomain === 'www' && parts.length > 2) {
             const sub2 = parts[1].toLowerCase();
             if (DISTRICTS[sub2]) return sub2;
        }
        if (DISTRICTS[subdomain]) {
            return subdomain;
        }
    }

    return 'default';
};

const CURRENT_KEY = getDistrictKey();
const CURRENT_DISTRICT = DISTRICTS[CURRENT_KEY] || DISTRICTS['default'];

export const getScriptUrl = (): string => {
  return localStorage.getItem('webAppUrl') || CURRENT_DISTRICT.scriptUrl;
};

export const getSpreadsheetId = (): string => {
    return localStorage.getItem('spreadsheetId') || CURRENT_DISTRICT.spreadsheetId;
};

export const getEventConfig = (): EventConfig => {
    const saved = localStorage.getItem('eventConfig');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return { 
                ...CURRENT_DISTRICT.config,
                ...parsed,
                schedules: parsed.schedules || CURRENT_DISTRICT.config.schedules,
            };
        } catch (e) {
            return CURRENT_DISTRICT.config;
        }
    }
    return CURRENT_DISTRICT.config;
};

export const saveConfig = (spreadsheetId: string, webAppUrl: string, eventConfig?: EventConfig) => {
    localStorage.setItem('spreadsheetId', spreadsheetId);
    localStorage.setItem('webAppUrl', webAppUrl);
    if (eventConfig) {
        localStorage.setItem('eventConfig', JSON.stringify(eventConfig));
    }
};

export const loadRegistrations = async (): Promise<{ registrations?: RegistrationsMap, error?: string }> => {
  const url = getScriptUrl();
  const sheetId = getSpreadsheetId();
  
  if (!url || url.includes('REPLACE')) {
      return { error: 'Configuration Missing: Script URL not set for this district.' };
  }

  return new Promise((resolve, reject) => {
    const callbackName = 'googleSheetsCallback_' + Date.now();
    const windowAny = window as any;

    windowAny[callbackName] = (data: any) => {
      resolve(data);
      delete windowAny[callbackName];
      const script = document.getElementById(callbackName);
      if (script) script.remove();
    };

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = `${url}?action=load&callback=${callbackName}&spreadsheetId=${encodeURIComponent(sheetId)}`;
    script.onerror = () => {
      reject(new Error('Failed to load script. Check network or URL.'));
      delete windowAny[callbackName];
      script.remove();
    };

    document.head.appendChild(script);

    setTimeout(() => {
        if (windowAny[callbackName]) {
            delete windowAny[callbackName];
            const s = document.getElementById(callbackName);
            if(s) s.remove();
            reject(new Error('Timeout fetching data'));
        }
    }, 15000);
  });
};

export const searchRemoteRegistration = async (regId: string, password: string): Promise<any> => {
    const url = getScriptUrl();
    const sheetId = getSpreadsheetId();
    
    return new Promise((resolve, reject) => {
        const callbackName = 'searchCallback_' + Date.now();
        const windowAny = window as any;

        windowAny[callbackName] = (data: any) => {
            resolve(data);
            delete windowAny[callbackName];
            const script = document.getElementById(callbackName);
            if (script) script.remove();
        };

        const script = document.createElement('script');
        script.id = callbackName;
        script.src = `${url}?action=search&regId=${encodeURIComponent(regId)}&password=${encodeURIComponent(password)}&callback=${callbackName}&spreadsheetId=${encodeURIComponent(sheetId)}`;
        script.onerror = () => {
            reject(new Error('Failed to search'));
            delete windowAny[callbackName];
            script.remove();
        };
        document.head.appendChild(script);

        setTimeout(() => {
            if (windowAny[callbackName]) {
                delete windowAny[callbackName];
                const s = document.getElementById(callbackName);
                if(s) s.remove();
                reject(new Error('Timeout searching'));
            }
        }, 10000);
    });
};

export const syncRegistration = async (regId: string, data: any, isUpdate = false) => {
  const url = getScriptUrl();
  const sheetId = getSpreadsheetId();
  
  if (!url || url.includes('REPLACE')) {
      throw new Error("Configuration incomplete for this district.");
  }

  try {
    const payload = {
        action: isUpdate ? 'update' : 'submit',
        registrationId: regId,
        spreadsheetId: sheetId,
        schoolName: data.schoolName,
        schoolType: data.schoolType,
        teachers: data.teachers,
        students: data.students,
        timestamp: new Date().toISOString(),
        ...(isUpdate ? { originalCreatedAt: data.createdAt, updateTimestamp: new Date().toISOString() } : {})
    };

    await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Sync error", error);
    throw error;
  }
};
