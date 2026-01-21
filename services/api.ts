
import { RegistrationsMap, EventConfig, ScheduleDay, ScheduleItem } from "../types";

// --- KONFIGURASI KHAS PASIR GUDANG ---
const PG_SS_ID = '1iKLf--vY8U75GuIewn1OJbNGFsDPDaqNk8njAAsUSU0';
const PG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHa79w-hI1uYyfvoW58KyelV4GIlH-5yEhpVwEqar2UMyoZgXJGZUXkRzJUOW7xawW/exec';

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

export const getDistrictKey = (): string => {
  const hostname = window.location.hostname;
  if (hostname.includes('mssdpasirgudang')) return 'mssdpasirgudang';
  const parts = hostname.split('.');
  if (parts.length >= 2) return parts[0].toLowerCase();
  return 'mssdpasirgudang';
};

const CURRENT_KEY = getDistrictKey();

export const getScriptUrl = (): string => {
  if (CURRENT_KEY === 'mssdpasirgudang') return PG_SCRIPT_URL;
  return localStorage.getItem(`scriptUrl_${CURRENT_KEY}`) || PG_SCRIPT_URL;
};

export const getSpreadsheetId = (): string => {
  if (CURRENT_KEY === 'mssdpasirgudang') return PG_SS_ID;
  return localStorage.getItem(`spreadsheetId_${CURRENT_KEY}`) || PG_SS_ID;
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
    const callbackName = 'cb_' + Math.random().toString(36).substring(7);
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Masa tamat menunggu respon dari Cloud."));
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
      reject(new Error("Gagal menghubungi pelayan. Sila semak sambungan internet atau Script URL."));
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

export const loadAllData = async (): Promise<{ registrations?: RegistrationsMap, config?: EventConfig, error?: string }> => {
  const ssId = getSpreadsheetId();
  const scriptUrl = getScriptUrl();
  
  if (!ssId || !scriptUrl) return { error: "ID Spreadsheet atau URL Skrip tidak sah." };
  
  try {
    const result = await jsonpRequest(scriptUrl, { 
      action: 'loadAll', 
      spreadsheetId: ssId 
    });
    
    if (result.config) {
        localStorage.setItem(`eventConfig_${CURRENT_KEY}`, JSON.stringify(result.config));
    }
    
    return result;
  } catch (e: any) {
    return { error: e.message };
  }
};

export const syncRegistration = async (regId: string, data: any, isUpdate = false) => {
  const payload = {
    action: isUpdate ? 'update' : 'submit',
    registrationId: regId,
    spreadsheetId: getSpreadsheetId(),
    ...data
  };
  return fetch(getScriptUrl(), { 
    method: 'POST', 
    mode: 'no-cors', 
    body: JSON.stringify(payload) 
  });
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
    localStorage.setItem(`spreadsheetId_${CURRENT_KEY}`, spreadsheetId);
    localStorage.setItem(`scriptUrl_${CURRENT_KEY}`, webAppUrl);
};
