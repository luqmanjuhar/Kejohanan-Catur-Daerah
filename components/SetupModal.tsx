
import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { saveConfig, getSpreadsheetId, getScriptUrl, validateCredentials, getDistrictKey } from '../services/api';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose }) => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetId(getSpreadsheetId());
      setWebAppUrl(getScriptUrl());
      setError(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError(null);
    setIsValidating(true);

    try {
        const check = await validateCredentials(spreadsheetId, webAppUrl);
        if (check.success) {
            saveConfig(spreadsheetId, webAppUrl);
            onClose();
            window.location.reload(); 
        } else {
            setError(check.error || "Ralat tidak diketahui semasa validasi.");
        }
    } catch (err: any) {
        setError("Gagal menyambung ke Cloud. Pastikan Web App disetkan kepada 'Anyone'.");
    } finally {
        setIsValidating(false);
    }
  };

  const getScriptContent = () => {
    return `/**
 * Backend MSSD Catur - Pemetaan INFO, JADUAL, PAUTAN, DOKUMEN
 */
function doGet(e) {
  const action = e.parameter.action;
  const ssId = e.parameter.spreadsheetId;
  const callback = e.parameter.callback;
  
  try {
    const ss = SpreadsheetApp.openById(ssId);
    let result = {};
    if (action === 'loadAll') {
      result = { config: fetchRemoteConfig(ss), registrations: fetchRegistrations(ss) };
    } else if (action === 'search') {
      result = searchRegistration(ss, e.parameter.regId, e.parameter.password);
    }
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (err) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify({ error: err.toString() }) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(data.spreadsheetId);
  if (data.action === 'submit' || data.action === 'update') return saveRegistration(ss, data);
}

function fetchRemoteConfig(ss) {
  const info = ss.getSheetByName('INFO')?.getRange('A2:C2').getValues()[0] || ["KEJOHANAN CATUR", "LOKASI", "60123"];
  const pautan = ss.getSheetByName('PAUTAN')?.getRange('A2:C2').getValues()[0] || ["#","#","#"];
  const doc = ss.getSheetByName('DOKUMEN')?.getRange('A2:C2').getValues()[0] || ["#","#","#"];
  const jadualData = ss.getSheetByName('JADUAL')?.getDataRange().getValues() || [];
  
  const schedules = { primary: [], secondary: [] };
  for (let i = 1; i < jadualData.length; i++) {
    const [cat, day, time, act] = jadualData[i];
    const target = cat.toLowerCase().includes('rendah') ? 'primary' : 'secondary';
    let dayObj = schedules[target].find(d => d.date === day);
    if (!dayObj) { dayObj = { date: day, items: [] }; schedules[target].push(dayObj); }
    dayObj.items.push({ time, activity: act });
  }

  return {
    eventName: info[0], eventVenue: info[1], adminPhone: info[2],
    schedules: schedules,
    links: { rules: pautan[0], results: pautan[1], photos: pautan[2] },
    documents: { invitation: doc[0], meeting: doc[1], arbiter: doc[2] }
  };
}

function fetchRegistrations(ss) {
  const schoolData = ss.getSheetByName('SEKOLAH').getDataRange().getValues();
  const teacherData = ss.getSheetByName('GURU').getDataRange().getValues();
  const studentData = ss.getSheetByName('PELAJAR').getDataRange().getValues();
  const registrations = {};
  for (let i = 1; i < schoolData.length; i++) {
    const id = schoolData[i][0];
    registrations[id] = { schoolName: schoolData[i][1], schoolType: schoolData[i][2], teachers: [], students: [], createdAt: schoolData[i][10] };
  }
  for (let i = 1; i < teacherData.length; i++) {
    const id = teacherData[i][0];
    if (registrations[id]) registrations[id].teachers.push({ name: teacherData[i][2], phone: teacherData[i][4], position: teacherData[i][5] });
  }
  for (let i = 1; i < studentData.length; i++) {
    const id = studentData[i][0];
    if (registrations[id]) registrations[id].students.push({ name: studentData[i][2], category: studentData[i][5], gender: studentData[i][4], race: studentData[i][7] });
  }
  return registrations;
}

function saveRegistration(ss, data) {
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  const teacherSheet = ss.getSheetByName('GURU');
  const studentSheet = ss.getSheetByName('PELAJAR');
  const id = data.registrationId;
  [schoolSheet, teacherSheet, studentSheet].forEach(sheet => {
    const vals = sheet.getDataRange().getValues();
    for (let i = vals.length - 1; i >= 1; i--) if (vals[i][0] === id) sheet.deleteRow(i + 1);
  });
  schoolSheet.appendRow([id, data.schoolName, data.schoolType, data.teachers.length, data.students.length, 0, 0, 0, 0, 0, new Date(), new Date(), 'AKTIF']);
  data.teachers.forEach(t => teacherSheet.appendRow([id, data.schoolName, t.name, t.email, t.phone, t.position]));
  data.students.forEach(s => studentSheet.appendRow([id, data.schoolName, s.name, s.ic, s.gender, s.category, '', s.race, s.playerId]));
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function searchRegistration(ss, id, pass) {
  const regs = fetchRegistrations(ss);
  const found = regs[id];
  if (!found) return { found: false, error: "Pendaftaran tidak ditemui." };
  const last4 = found.teachers[0].phone.replace(/\\D/g, '').slice(-4);
  return last4 === pass ? { found: true, registration: found } : { found: false, error: "Kata laluan salah." };
}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        <div className="p-6 bg-orange-600 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold">⚙️ Konfigurasi Cloud {getDistrictKey().toUpperCase()}</h2>
            <button onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="font-bold">Gagal Menyambung!</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Spreadsheet ID</label>
                <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-orange-500 outline-none" placeholder="1iKLf--vY8U75GuIewn1OJbNGFsDPDaqNk8njAAsUSU0" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Script Web App URL</label>
                <input type="text" value={webAppUrl} onChange={(e) => setWebAppUrl(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-orange-500 outline-none" placeholder="https://script.google.com/macros/s/.../exec" />
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400">TEMPLATE GOOGLE APPS SCRIPT</span>
                    <button onClick={() => { navigator.clipboard.writeText(getScriptContent()); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-orange-600 font-bold text-xs flex items-center gap-1">
                        {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'TELAH DISALIN' : 'SALIN KOD'}
                    </button>
                </div>
                <div className="text-[10px] font-mono text-gray-400 max-h-32 overflow-y-auto leading-relaxed">
                    Pastikan anda mempunyai tab: <b>INFO</b>, <b>JADUAL</b>, <b>PAUTAN</b>, <b>DOKUMEN</b>, <b>SEKOLAH</b>, <b>GURU</b>, dan <b>PELAJAR</b> dalam Spreadsheet anda.
                </div>
            </div>
        </div>

        <div className="p-6 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 font-bold text-gray-400">BATAL</button>
            <button onClick={handleSave} disabled={isValidating} className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:bg-orange-300">
                {isValidating ? <><Loader2 className="animate-spin" size={18}/> MENGESAHKAN...</> : <><Save size={18}/> SAHKAN & SIMPAN</>}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
