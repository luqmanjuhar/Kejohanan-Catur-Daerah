
import { RegistrationsMap, EventConfig, ScheduleDay, DistrictConfig } from "../types";

const MASTER_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwWNUtbfV4VKvsmbGyD4RWNUEVFdKwkk8bOsXuPdBkfgJ_-QFySGx0uJmfsBW5087mlPQ/exec';

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { date: "HARI PERTAMA", items: [{ time: "8.00 pagi", activity: "Pendaftaran" }] }
];

const BASE_CONFIG: EventConfig = {
  eventName: "KEJOHANAN CATUR MSSD",
  eventVenue: "Dewan Sekolah",
  adminPhone: "60123456789",
  schedules: { primary: DEFAULT_SCHEDULE, secondary: DEFAULT_SCHEDULE },
  links: { rules: "#", results: "https://chess-results.com", photos: "#" },
  documents: { invitation: "#", meeting: "#", arbiter: "#" }
};

export const getDistrictKey = (): string => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  return parts.length >= 2 ? parts[0].toLowerCase() : 'default';
};

const CURRENT_KEY = getDistrictKey();

export const getScriptUrl = (): string => {
  return localStorage.getItem(`scriptUrl_${CURRENT_KEY}`) || MASTER_SCRIPT_URL;
};

export const getSpreadsheetId = (): string => {
  return localStorage.getItem(`spreadsheetId_${CURRENT_KEY}`) || '';
};

const jsonpRequest = (url: string, params: Record<string, string>): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Math.random().toString(36).substring(7);
    const cleanup = () => {
      delete (window as any)[callbackName];
      const s = document.getElementById(callbackName);
      if (s) s.remove();
    };

    (window as any)[callbackName] = (data: any) => {
      resolve(data);
      cleanup();
    };

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}&callback=${callbackName}`;

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = finalUrl;
    script.onerror = () => { cleanup(); reject(new Error("Network Error")); };
    document.head.appendChild(script);

    setTimeout(() => { if ((window as any)[callbackName]) { cleanup(); reject(new Error("Timeout")); } }, 15000);
  });
};

export const loadAllData = async (): Promise<{ registrations?: RegistrationsMap, config?: EventConfig, error?: string }> => {
  const ssId = getSpreadsheetId();
  if (!ssId) return { error: "ID Spreadsheet tidak dikesan. Sila tetapkan di Setup." };
  
  return jsonpRequest(getScriptUrl(), { 
    action: 'loadAll', 
    spreadsheetId: ssId 
  });
};

export const syncConfigToCloud = async (config: EventConfig) => {
  const payload = {
    action: 'saveConfig',
    spreadsheetId: getSpreadsheetId(),
    config: config
  };
  return fetch(getScriptUrl(), { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const syncRegistration = async (regId: string, data: any, isUpdate = false) => {
  const payload = {
    action: isUpdate ? 'update' : 'submit',
    registrationId: regId,
    spreadsheetId: getSpreadsheetId(),
    ...data
  };
  await fetch(getScriptUrl(), { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};

export const searchRemoteRegistration = async (regId: string, password: string): Promise<any> => {
  return jsonpRequest(getScriptUrl(), {
    action: 'search',
    regId,
    password,
    spreadsheetId: getSpreadsheetId()
  });
};

export const saveLocalConfig = (spreadsheetId: string, webAppUrl: string) => {
    localStorage.setItem(`spreadsheetId_${CURRENT_KEY}`, spreadsheetId);
    localStorage.setItem(`scriptUrl_${CURRENT_KEY}`, webAppUrl);
};

// Fix: Missing exports for SuperAdminDashboard
export const loadAllDistricts = async (): Promise<DistrictConfig[]> => {
  return jsonpRequest(MASTER_SCRIPT_URL, { action: 'loadDistricts' });
};

// Fix: Missing export for SuperAdminDashboard
export const saveDistrict = async (config: DistrictConfig) => {
  const payload = {
    action: 'saveDistrict',
    config: config
  };
  return fetch(MASTER_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
};
