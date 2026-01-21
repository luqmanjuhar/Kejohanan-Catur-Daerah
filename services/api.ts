
import { RegistrationsMap, EventConfig, ScheduleDay } from "../types";

// --- KREDENSIAL RASMI PASIR GUDANG (TERKINI) ---
const PG_SS_ID = '1fzAo5ZLVS_Bt7ZYg2QE1jolakE_99gL42IBW5x2e890';
const PG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQt4Xm-dp_nyrUfX0UiHwdRxbxCwPbdhoKL6PpSqEGQBDvAPubFsT8aoP81dXucmdN/exec';

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { date: "HARI PERTAMA", items: [{ time: "8.00 pagi", activity: "Pendaftaran" }] }
];

const BASE_CONFIG: EventConfig = {
  eventName: "KEJOHANAN CATUR MSSD PASIR GUDANG 2026",
  eventVenue: "Lokasi Acara",
  adminPhone: "60123456789",
  schedules: { primary: DEFAULT_SCHEDULE, secondary: DEFAULT_SCHEDULE },
  links: { rules: "#", results: "https://chess-results.com", photos: "#" },
  documents: { invitation: "#", meeting: "#", arbiter: "#" }
};

export const getDistrictKey = (): string => 'mssdpasirgudang';

const CURRENT_KEY = getDistrictKey();

export const getScriptUrl = (): string => {
  const saved = localStorage.getItem(`scriptUrl_${CURRENT_KEY}`);
  return saved || PG_SCRIPT_URL;
};

export const getSpreadsheetId = (): string => {
  const saved = localStorage.getItem(`spreadsheetId_${CURRENT_KEY}`);
  return saved || PG_SS_ID;
};

export const clearCachedCredentials = () => {
  localStorage.removeItem(`scriptUrl_${CURRENT_KEY}`);
  localStorage.removeItem(`spreadsheetId_${CURRENT_KEY}`);
  localStorage.removeItem(`eventConfig_${CURRENT_KEY}`);
};

export const getEventConfig = (): EventConfig => {
  const saved = localStorage.getItem(`eventConfig_${CURRENT_KEY}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return BASE_CONFIG;
    }
  }
  return BASE_CONFIG;
};

const jsonpRequest = (url: string, params: Record<string, string>): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Validasi URL
    if (!url || !url.startsWith('https://script.google.com')) {
      reject(new Error("URL Skrip tidak sah. Ia mestilah bermula dengan script.google.com"));
      return;
    }

    const callbackName = 'cb_' + Math.random().toString(36).substring(7);
    const script = document.createElement('script');
    
    console.log(`[Cloud Connect] Memanggil: ${url}`);

    const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Masa tamat (20s). Skrip tidak merespon. Sila pastikan Web App disetkan kepada 'Anyone' di Apps Script."));
    }, 20000);

    const cleanup = () => {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      const s = document.getElementById(callbackName);
      if (s) s.remove();
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      if (data && data.error) reject(new Error(data.error));
      else resolve(data);
    };

    script.onerror = () => {
      cleanup();
      console.error("[Cloud Connect] Gagal memuatkan skrip tag.");
      reject(new Error("Gagal memuatkan skrip API. Punca: URL salah, Web App belum di-'Deploy', atau akses belum disetkan kepada 'Anyone'."));
    };

    const queryParams = { ...params, callback: callbackName, t: Date.now().toString() };
    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    script.id = callbackName;
    script.src = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    script.async = true;
    document.head.appendChild(script);
  });
};

export const validateCredentials = async (ssId: string, scriptUrl: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await jsonpRequest(scriptUrl, { action: 'loadAll', spreadsheetId: ssId });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const loadAllData = async (): Promise<{ registrations?: RegistrationsMap, config?: EventConfig, error?: string }> => {
  const ssId = getSpreadsheetId();
  const scriptUrl = getScriptUrl();
  try {
    const result = await jsonpRequest(scriptUrl, { action: 'loadAll', spreadsheetId: ssId });
    if (result.config) localStorage.setItem(`eventConfig_${CURRENT_KEY}`, JSON.stringify(result.config));
    return result;
  } catch (e: any) {
    return { error: e.message };
  }
};

export const updateRemoteConfig = async (config: EventConfig) => {
  const url = getScriptUrl();
  const payload = {
    action: 'updateConfig',
    spreadsheetId: getSpreadsheetId(),
    config: config
  };
  return fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const syncRegistration = async (regId: string, data: any, isUpdate = false) => {
  const url = getScriptUrl();
  const payload = {
    action: isUpdate ? 'update' : 'submit',
    registrationId: regId,
    spreadsheetId: getSpreadsheetId(),
    ...data,
    timestamp: new Date().toISOString()
  };
  return fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const searchRemoteRegistration = async (regId: string, password: string): Promise<any> => {
  return jsonpRequest(getScriptUrl(), {
    action: 'search',
    regId,
    password,
    spreadsheetId: getSpreadsheetId()
  });
};

export const saveConfig = (spreadsheetId: string, webAppUrl: string) => {
    localStorage.setItem(`spreadsheetId_${CURRENT_KEY}`, spreadsheetId.trim());
    localStorage.setItem(`scriptUrl_${CURRENT_KEY}`, webAppUrl.trim());
};
