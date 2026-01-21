
import { RegistrationsMap, EventConfig, ScheduleDay, DistrictConfig } from "../types";

// Konfigurasi Khas Pasir Gudang
const PASIR_GUDANG_SS_ID = '1iKLf--vY8U75GuIewn1OJbNGFsDPDaqNk8njAAsUSU0';
const PASIR_GUDANG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHa79w-hI1uYyfvoW58KyelV4GIlH-5yEhpVwEqar2UMyoZgXJGZUXkRzJUOW7xawW/exec';

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { date: "HARI PERTAMA", items: [{ time: "8.00 pagi", activity: "Pendaftaran" }] }
];

export const getDistrictKey = (): string => {
  const hostname = window.location.hostname;
  if (hostname.includes('mssdpasirgudang')) return 'mssdpasirgudang';
  const parts = hostname.split('.');
  return parts.length >= 2 ? parts[0].toLowerCase() : 'mssdpasirgudang';
};

const CURRENT_KEY = getDistrictKey();

export const getScriptUrl = (): string => {
  const saved = localStorage.getItem(`scriptUrl_${CURRENT_KEY}`);
  if (saved) return saved;
  return PASIR_GUDANG_SCRIPT_URL;
};

export const getSpreadsheetId = (): string => {
  const saved = localStorage.getItem(`spreadsheetId_${CURRENT_KEY}`);
  if (saved) return saved;
  return PASIR_GUDANG_SS_ID;
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
      cleanup();
      resolve(data);
    };

    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}&callback=${callbackName}`;

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = finalUrl;
    script.onerror = () => { 
      cleanup(); 
      reject(new Error("Gagal memuatkan skrip API.")); 
    };
    document.head.appendChild(script);

    setTimeout(() => { 
      if ((window as any)[callbackName]) { 
        cleanup(); 
        reject(new Error("Masa tamat (Timeout).")); 
      } 
    }, 20000);
  });
};

export const loadAllData = async (): Promise<{ registrations?: RegistrationsMap, config?: EventConfig, error?: string }> => {
  const ssId = getSpreadsheetId();
  const scriptUrl = getScriptUrl();
  
  if (!ssId) return { error: "ID Spreadsheet tidak dikesan." };
  
  try {
    const result = await jsonpRequest(scriptUrl, { 
      action: 'loadAll', 
      spreadsheetId: ssId 
    });
    return result;
  } catch (e: any) {
    return { error: e.message || "Ralat memuatkan data cloud." };
  }
};

export const syncConfigToCloud = async (config: EventConfig) => {
  const payload = {
    action: 'saveConfig',
    spreadsheetId: getSpreadsheetId(),
    config: config
  };
  return fetch(getScriptUrl(), { 
    method: 'POST', 
    mode: 'no-cors', 
    body: JSON.stringify(payload) 
  });
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

export const saveLocalConfig = (spreadsheetId: string, webAppUrl: string) => {
    localStorage.setItem(`spreadsheetId_${CURRENT_KEY}`, spreadsheetId);
    localStorage.setItem(`scriptUrl_${CURRENT_KEY}`, webAppUrl);
};

export const loadAllDistricts = async (): Promise<DistrictConfig[]> => {
  const saved = localStorage.getItem('mssd_all_districts');
  return saved ? JSON.parse(saved) : [];
};

export const saveDistrict = async (config: DistrictConfig): Promise<void> => {
  const districts = await loadAllDistricts();
  const index = districts.findIndex(d => d.id === config.id);
  if (index > -1) {
    districts[index] = config;
  } else {
    districts.push(config);
  }
  localStorage.setItem('mssd_all_districts', JSON.stringify(districts));
};
