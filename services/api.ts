
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
        scriptUrl: '', // To be filled by user in Setup
        spreadsheetId: '', // To be filled by user in Setup
        config: {
            ...BASE_CONFIG,
            eventName: "KEJOHANAN CATUR MSSD PASIR GUDANG 2025",
            eventVenue: "Dewan Sekolah Pasir Gudang",
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
    const hostname = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    const districtParam = params.get('district');
    
    if (districtParam && DISTRICTS[districtParam.toLowerCase()]) {
        return districtParam.toLowerCase();
    }

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

const STORAGE_KEYS = {
    scriptUrl: `webAppUrl_${CURRENT_KEY}`,
    spreadsheetId: `spreadsheetId_${CURRENT_KEY}`,
    config: `eventConfig_${CURRENT_KEY}`
};

export const getScriptUrl = (): string => {
  const url = localStorage.getItem(STORAGE_KEYS.scriptUrl) || CURRENT_DISTRICT.scriptUrl;
  return url ? url.trim() : '';
};

export const getSpreadsheetId = (): string => {
    const id = localStorage.getItem(STORAGE_KEYS.spreadsheetId) || CURRENT_DISTRICT.spreadsheetId;
    return id ? id.trim() : '';
};

export const getEventConfig = (): EventConfig => {
    const saved = localStorage.getItem(STORAGE_KEYS.config);
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
    localStorage.setItem(STORAGE_KEYS.spreadsheetId, spreadsheetId.trim());
    localStorage.setItem(STORAGE_KEYS.scriptUrl, webAppUrl.trim());
    if (eventConfig) {
        localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(eventConfig));
    }
};

/**
 * Robustly constructs the URL with parameters, handling existing query strings.
 */
const buildUrl = (baseUrl: string, params: Record<string, string>) => {
    try {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        return url.toString();
    } catch (e) {
        // Fallback for relative or malformed base URLs
        const separator = baseUrl.includes('?') ? '&' : '?';
        const query = new URLSearchParams(params).toString();
        return `${baseUrl}${separator}${query}`;
    }
};

export const loadRegistrations = async (): Promise<{ registrations?: RegistrationsMap, error?: string }> => {
  const url = getScriptUrl();
  const sheetId = getSpreadsheetId();
  
  if (!url || !url.startsWith('https://')) {
      return { error: `Script URL tidak sah. Sila kemaskini di menu Setup.` };
  }

  if (!sheetId) {
      return { error: "ID Spreadsheet tidak sah. Sila kemaskini di menu Setup." };
  }

  return new Promise((resolve, reject) => {
    const callbackName = 'googleSheetsCallback_' + Date.now();
    const windowAny = window as any;

    const cleanup = () => {
      delete windowAny[callbackName];
      const script = document.getElementById(callbackName);
      if (script) script.remove();
    };

    windowAny[callbackName] = (data: any) => {
      resolve(data);
      cleanup();
    };

    const script = document.createElement('script');
    script.id = callbackName;
    const finalUrl = buildUrl(url, {
        action: 'load',
        callback: callbackName,
        spreadsheetId: sheetId
    });
    
    script.src = finalUrl;
    console.debug(`[API] Memanggil: ${finalUrl}`);

    script.onerror = (event) => {
      console.error('[API] Script Load Error:', event);
      reject(new Error('Gagal menghubungi pelayan Google. Sila pastikan Script URL telah di "Deploy" sebagai Web App dengan akses "Anyone".'));
      cleanup();
    };

    document.head.appendChild(script);

    setTimeout(() => {
        if (windowAny[callbackName]) {
            reject(new Error('Masa tamat menunggu respon dari Google Sheets.'));
            cleanup();
        }
    }, 15000);
  });
};

export const searchRemoteRegistration = async (regId: string, password: string): Promise<any> => {
    const url = getScriptUrl();
    const sheetId = getSpreadsheetId();
    
    if (!url || !url.startsWith('https://')) {
        throw new Error("URL Skrip tidak sah.");
    }

    return new Promise((resolve, reject) => {
        const callbackName = 'searchCallback_' + Date.now();
        const windowAny = window as any;

        const cleanup = () => {
            delete windowAny[callbackName];
            const script = document.getElementById(callbackName);
            if (script) script.remove();
        };

        windowAny[callbackName] = (data: any) => {
            resolve(data);
            cleanup();
        };

        const script = document.createElement('script');
        script.id = callbackName;
        script.src = buildUrl(url, {
            action: 'search',
            regId: regId,
            password: password,
            callback: callbackName,
            spreadsheetId: sheetId
        });

        script.onerror = () => {
            reject(new Error('Gagal melakukan carian. Sila semak sambungan internet.'));
            cleanup();
        };
        document.head.appendChild(script);

        setTimeout(() => {
            if (windowAny[callbackName]) {
                reject(new Error('Masa tamat melakukan carian.'));
                cleanup();
            }
        }, 10000);
    });
};

export const syncRegistration = async (regId: string, data: any, isUpdate = false) => {
  const url = getScriptUrl();
  const sheetId = getSpreadsheetId();
  
  if (!url || !url.startsWith('https://')) {
      throw new Error("Konfigurasi sistem tidak lengkap.");
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
    return { success: true };
  } catch (error) {
    console.error("Sync error", error);
    throw error;
  }
};
