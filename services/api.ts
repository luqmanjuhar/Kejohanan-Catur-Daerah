
import { RegistrationsMap, EventConfig, ScheduleDay, DistrictConfig } from "../types";

// --- KONFIGURASI RASMI PASIR GUDANG (HARDCODED) ---
const PG_SS_ID = '1iKLf--vY8U75GuIewn1OJbNGFsDPDaqNk8njAAsUSU0';
const PG_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxHa79w-hI1uYyfvoW58KyelV4GIlH-5yEhpVwEqar2UMyoZgXJGZUXkRzJUOW7xawW/exec';

export const getDistrictKey = (): string => {
  const hostname = window.location.hostname;
  if (hostname.includes('mssdpasirgudang')) return 'mssdpasirgudang';
  const parts = hostname.split('.');
  return parts.length >= 2 ? parts[0].toLowerCase() : 'mssdpasirgudang';
};

const CURRENT_KEY = getDistrictKey();

export const getScriptUrl = (): string => {
  if (CURRENT_KEY === 'mssdpasirgudang') return PG_SCRIPT_URL;
  const saved = localStorage.getItem(`scriptUrl_${CURRENT_KEY}`);
  return saved || PG_SCRIPT_URL;
};

export const getSpreadsheetId = (): string => {
  if (CURRENT_KEY === 'mssdpasirgudang') return PG_SS_ID;
  const saved = localStorage.getItem(`spreadsheetId_${CURRENT_KEY}`);
  return saved || PG_SS_ID;
};

/**
 * Fungsi JSONP untuk komunikasi rentas domain dengan Google Apps Script.
 */
const jsonpRequest = (url: string, params: Record<string, string>): Promise<any> => {
  return new Promise((resolve, reject) => {
    const callbackName = 'cb_' + Math.random().toString(36).substring(7);
    const script = document.createElement('script');
    
    // Timer untuk timeout
    const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Masa tamat (30s). Google Apps Script tidak merespon. Sila pastikan skrip dideploy sebagai 'Anyone'."));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      const s = document.getElementById(callbackName);
      if (s) s.remove();
    };

    // Callback function
    (window as any)[callbackName] = (data: any) => {
      cleanup();
      console.log("API Response received:", data);
      if (data && data.error) reject(new Error(data.error));
      else resolve(data);
    };

    // Menangani ralat muatan skrip
    script.onerror = () => {
      cleanup();
      reject(new Error("Gagal menghubungi Google Apps Script. Pastikan URL betul dan Deployment disetkan sebagai 'Anyone'."));
    };

    // Bina URL lengkap dengan nocache t
    const queryParams = { ...params, callback: callbackName, t: Date.now().toString() };
    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    script.id = callbackName;
    script.src = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    script.async = true;

    console.log("Fetching from Cloud:", script.src);
    document.head.appendChild(script);
  });
};

/**
 * Memuatkan semua data dari Google Sheets.
 */
export const loadAllData = async (): Promise<{ registrations?: RegistrationsMap, config?: EventConfig, error?: string }> => {
  const ssId = getSpreadsheetId();
  const scriptUrl = getScriptUrl();
  
  if (!ssId || !scriptUrl) return { error: "Konfigurasi ID atau URL tidak ditemui." };
  
  try {
    const result = await jsonpRequest(scriptUrl, { 
      action: 'loadAll', 
      spreadsheetId: ssId 
    });
    return result;
  } catch (e: any) {
    console.error("LoadAllData Error:", e);
    return { error: e.message || "Ralat tidak diketahui semasa memuatkan data." };
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
    headers: { 'Content-Type': 'application/json' },
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

export const resetLocalConfig = () => {
    localStorage.removeItem(`spreadsheetId_${CURRENT_KEY}`);
    localStorage.removeItem(`scriptUrl_${CURRENT_KEY}`);
    console.log("Pangkalan data local dibersihkan. Memuat semula...");
    window.location.reload();
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
