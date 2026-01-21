
import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Check, Database, Info, Calendar, Link as LinkIcon, FileText, Plus, Trash2 } from 'lucide-react';
import { saveLocalConfig, syncConfigToCloud, getSpreadsheetId, getScriptUrl } from '../services/api';
import { EventConfig, ScheduleDay } from '../types';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: EventConfig;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose, currentConfig }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'info' | 'jadual' | 'links' | 'docs'>('system');
  const [spreadsheetId, setSpreadsheetId] = useState(getSpreadsheetId());
  const [webAppUrl, setWebAppUrl] = useState(getScriptUrl());
  const [copied, setCopied] = useState(false);
  const [eventConfig, setEventConfig] = useState<EventConfig>(currentConfig);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetId(getSpreadsheetId());
      setWebAppUrl(getScriptUrl());
      setEventConfig(currentConfig);
    }
  }, [isOpen, currentConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        saveLocalConfig(spreadsheetId, webAppUrl);
        await syncConfigToCloud(eventConfig);
        alert("Tetapan berjaya disimpan ke Cloud!");
        onClose();
        window.location.reload(); 
    } catch (e) {
        alert("Gagal menyimpan ke Cloud, tetapi disimpan secara lokal.");
        onClose();
    } finally {
        setIsSaving(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getScriptContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateSchedule = (type: 'primary' | 'secondary', dayIdx: number, itemIdx: number | null, field: string, val: string) => {
      const newConfig = { ...eventConfig };
      if (itemIdx === null) {
          (newConfig.schedules[type][dayIdx] as any)[field] = val;
      } else {
          (newConfig.schedules[type][dayIdx].items[itemIdx] as any)[field] = val;
      }
      setEventConfig(newConfig);
  };

  const addScheduleItem = (type: 'primary' | 'secondary', dayIdx: number) => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type][dayIdx].items.push({ time: '', activity: '' });
      setEventConfig(newConfig);
  };

  const removeScheduleItem = (type: 'primary' | 'secondary', dayIdx: number, itemIdx: number) => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type][dayIdx].items.splice(itemIdx, 1);
      setEventConfig(newConfig);
  };

  const getScriptContent = () => {
    return `/**
 * MSSD Catur - DATABASE ENGINE v3.0
 */

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  const ssId = e.parameter.spreadsheetId;
  
  if (!ssId) return createResponse({error: "No SSID"}, callback);
  
  try {
    const ss = SpreadsheetApp.openById(ssId);
    initSheets(ss);

    let result = {};
    if (action === 'loadAll') {
      result = {
        registrations: loadRegistrations(ss),
        config: loadConfig(ss)
      };
    } else if (action === 'search') {
      result = searchRegistration(ss, e.parameter.regId, e.parameter.password);
    }
    
    return createResponse(result, callback);
  } catch (err) {
    return createResponse({error: err.toString()}, callback);
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(data.spreadsheetId);
  initSheets(ss);

  if (data.action === 'saveConfig') {
    saveConfigToSheet(ss, data.config);
    return ContentService.createTextOutput("OK");
  } else if (data.action === 'submit' || data.action === 'update') {
    return saveRegistration(ss, data);
  }
}

function createResponse(data, callback) {
  const output = JSON.stringify(data);
  return ContentService.createTextOutput(callback ? callback + '(' + output + ')' : output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function initSheets(ss) {
  const configs = {
    'SEKOLAH': ['ID', 'NAMA', 'JENIS', 'GURU', 'PELAJAR', 'L', 'P', 'U12', 'U15', 'U18', 'DAFTAR', 'KEMASKINI', 'STATUS'],
    'GURU': ['ID', 'SEKOLAH', 'NAMA', 'EMAIL', 'TELEFON', 'JAWATAN', 'TARIKH'],
    'PELAJAR': ['ID', 'SEKOLAH', 'NAMA', 'IC', 'JANTINA', 'KATEGORI', 'BANGSA', 'ID PEMAIN', 'TARIKH'],
    'INFO': ['KEY', 'VALUE'],
    'JADUAL': ['TYPE', 'DAY', 'TIME', 'ACTIVITY'],
    'PAUTAN': ['KEY', 'VALUE'],
    'DOKUMEN': ['KEY', 'VALUE']
  };
  Object.keys(configs).forEach(name => {
    if (!ss.getSheetByName(name)) {
      const sh = ss.insertSheet(name);
      sh.appendRow(configs[name]);
      sh.getRange(1,1,1,configs[name].length).setFontWeight('bold').setBackground('#f3f3f3');
    }
  });
}

function loadConfig(ss) {
  const info = getMap(ss, 'INFO');
  const pautan = getMap(ss, 'PAUTAN');
  const dokumen = getMap(ss, 'DOKUMEN');
  const jadualRaw = ss.getSheetByName('JADUAL').getDataRange().getValues();
  
  const schedules = { primary: [], secondary: [] };
  for(let i=1; i<jadualRaw.length; i++) {
    const [type, day, time, activity] = jadualRaw[i];
    const target = type.toLowerCase() === 'primary' ? schedules.primary : schedules.secondary;
    let dayObj = target.find(d => d.date === day);
    if (!dayObj) {
      dayObj = { date: day, items: [] };
      target.push(dayObj);
    }
    dayObj.items.push({ time, activity });
  }

  return {
    eventName: info.eventName || "KEJOHANAN CATUR MSSD",
    eventVenue: info.eventVenue || "Dewan Sekolah",
    adminPhone: info.adminPhone || "60123456789",
    schedules: schedules,
    links: { rules: pautan.rules || "#", results: pautan.results || "#", photos: pautan.photos || "#" },
    documents: { invitation: dokumen.invitation || "#", meeting: dokumen.meeting || "#", arbiter: dokumen.arbiter || "#" }
  };
}

function saveConfigToSheet(ss, config) {
  setMap(ss, 'INFO', { eventName: config.eventName, eventVenue: config.eventVenue, adminPhone: config.adminPhone });
  setMap(ss, 'PAUTAN', config.links);
  setMap(ss, 'DOKUMEN', config.documents);
  
  const jadualSheet = ss.getSheetByName('JADUAL');
  jadualSheet.clear().appendRow(['TYPE', 'DAY', 'TIME', 'ACTIVITY']);
  ['primary', 'secondary'].forEach(type => {
    config.schedules[type].forEach(day => {
      day.items.forEach(item => {
        jadualSheet.appendRow([type, day.date, item.time, item.activity]);
      });
    });
  });
}

function getMap(ss, name) {
  const data = ss.getSheetByName(name).getDataRange().getValues();
  const obj = {};
  for(let i=1; i<data.length; i++) obj[data[i][0]] = data[i][1];
  return obj;
}

function setMap(ss, name, obj) {
  const sh = ss.getSheetByName(name);
  sh.clear().appendRow(['KEY', 'VALUE']);
  Object.keys(obj).forEach(k => sh.appendRow([k, obj[k]]));
}

function loadRegistrations(ss) {
  const schoolData = ss.getSheetByName('SEKOLAH').getDataRange().getValues();
  const teacherData = ss.getSheetByName('GURU').getDataRange().getValues();
  const studentData = ss.getSheetByName('PELAJAR').getDataRange().getValues();
  const regs = {};
  for(let i=1; i<schoolData.length; i++) {
    const id = schoolData[i][0];
    if(!id) continue;
    regs[id] = { schoolName: schoolData[i][1], schoolType: schoolData[i][2], createdAt: schoolData[i][10], updatedAt: schoolData[i][11], status: schoolData[i][12], teachers: [], students: [] };
  }
  for(let i=1; i<teacherData.length; i++) {
    if(regs[teacherData[i][0]]) regs[teacherData[i][0]].teachers.push({ name: teacherData[i][2], email: teacherData[i][3], phone: teacherData[i][4], position: teacherData[i][5] });
  }
  for(let i=1; i<studentData.length; i++) {
    if(regs[studentData[i][0]]) regs[studentData[i][0]].students.push({ name: studentData[i][2], ic: studentData[i][3], gender: studentData[i][4], category: studentData[i][5], race: studentData[i][6], playerId: studentData[i][7] });
  }
  return regs;
}

function saveRegistration(ss, data) {
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  const teacherSheet = ss.getSheetByName('GURU');
  const studentSheet = ss.getSheetByName('PELAJAR');
  const regId = data.registrationId;
  [schoolSheet, teacherSheet, studentSheet].forEach(sh => {
    const vals = sh.getDataRange().getValues();
    for (let i = vals.length - 1; i >= 1; i--) if (vals[i][0] === regId) sh.deleteRow(i + 1);
  });
  const now = new Date();
  let L=0, P=0, U12=0, U15=0, U18=0;
  data.students.forEach(s => {
    if (s.gender === 'Lelaki') L++; else P++;
    if (s.category.includes('12')) U12++; else if (s.category.includes('15')) U15++; else U18++;
  });
  schoolSheet.appendRow([regId, data.schoolName, data.schoolType, data.teachers.length, data.students.length, L, P, U12, U15, U18, data.createdAt || now, now, 'AKTIF']);
  data.teachers.forEach(t => teacherSheet.appendRow([regId, data.schoolName, t.name, t.email, t.phone, t.position, now]));
  data.students.forEach(s => studentSheet.appendRow([regId, data.schoolName, s.name, s.ic, s.gender, s.category, s.race, s.playerId, now]));
  return ContentService.createTextOutput("Success");
}

function searchRegistration(ss, regId, password) {
  const regs = loadRegistrations(ss);
  const reg = regs[regId];
  if (!reg) return { found: false, error: "Pendaftaran tidak dijumpai." };
  const teacherPhone = reg.teachers[0]?.phone || "";
  if (teacherPhone.replace(/\\D/g, '').slice(-4) === password) return { found: true, registration: reg };
  return { found: false, error: "Kata laluan salah." };
}
`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl overflow-hidden animate-scaleIn flex flex-col">
        <div className="p-6 bg-orange-600 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">⚙️ Tetapan Pangkalan Data & Acara</h2>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors"><X /></button>
        </div>

        <div className="flex border-b overflow-x-auto bg-gray-50">
            <button onClick={() => setActiveTab('system')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'system' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-500'}`}>Sistem</button>
            <button onClick={() => setActiveTab('info')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'info' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-500'}`}>Maklumat</button>
            <button onClick={() => setActiveTab('jadual')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'jadual' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-500'}`}>Jadual</button>
            <button onClick={() => setActiveTab('links')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'links' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-500'}`}>Pautan</button>
            <button onClick={() => setActiveTab('docs')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'docs' ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-500'}`}>Dokumen</button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {activeTab === 'system' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                        <Database className="text-blue-600 mt-1" />
                        <div>
                            <h4 className="font-bold text-blue-800">Sambungan Google Sheets</h4>
                            <p className="text-xs text-blue-600">ID dan URL ini menghubungkan aplikasi ke pengurus data anda.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Spreadsheet ID</label>
                        <input value={spreadsheetId} onChange={e => setSpreadsheetId(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 font-mono text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Script Web App URL</label>
                        <input value={webAppUrl} onChange={e => setWebAppUrl(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 font-mono text-sm" />
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase">Kod Engine (Apps Script)</span>
                            <button onClick={copyCode} className="text-xs text-orange-400 font-bold hover:underline flex items-center gap-1">
                                {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Telah Disalin' : 'Salin Kod'}
                            </button>
                        </div>
                        <div className="h-24 overflow-y-auto text-[10px] font-mono text-gray-500 bg-black/20 p-2 rounded">
                            {getScriptContent()}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'info' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nama Kejohanan</label>
                        <input value={eventConfig.eventName} onChange={e => setEventConfig({...eventConfig, eventName: e.target.value})} className="w-full p-3 border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tempat / Venue</label>
                        <input value={eventConfig.eventVenue} onChange={e => setEventConfig({...eventConfig, eventVenue: e.target.value})} className="w-full p-3 border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">No. Telefon Admin (Tanpa '+')</label>
                        <input value={eventConfig.adminPhone} onChange={e => setEventConfig({...eventConfig, adminPhone: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="601..." />
                    </div>
                </div>
            )}

            {activeTab === 'jadual' && (
                <div className="grid md:grid-cols-2 gap-6">
                    {['primary', 'secondary'].map((type: any) => (
                        <div key={type} className="bg-gray-50 p-4 rounded-xl border">
                            <h4 className="font-bold text-gray-700 mb-4 uppercase">{type === 'primary' ? 'Sekolah Rendah' : 'Sekolah Menengah'}</h4>
                            {eventConfig.schedules[type as 'primary' | 'secondary'].map((day, dIdx) => (
                                <div key={dIdx} className="mb-6 space-y-2">
                                    <input value={day.date} onChange={e => updateSchedule(type, dIdx, null, 'date', e.target.value)} className="w-full p-2 font-bold bg-white border rounded" />
                                    <div className="space-y-2 pl-4 border-l-2 border-orange-200">
                                        {day.items.map((item, iIdx) => (
                                            <div key={iIdx} className="flex gap-2 items-center">
                                                <input value={item.time} onChange={e => updateSchedule(type, dIdx, iIdx, 'time', e.target.value)} className="w-24 p-1 text-xs border rounded" placeholder="Masa" />
                                                <input value={item.activity} onChange={e => updateSchedule(type, dIdx, iIdx, 'activity', e.target.value)} className="flex-1 p-1 text-xs border rounded" placeholder="Aktiviti" />
                                                <button onClick={() => removeScheduleItem(type, dIdx, iIdx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => addScheduleItem(type, dIdx)} className="text-xs text-orange-600 font-bold flex items-center gap-1 hover:underline">
                                            <Plus size={14} /> Tambah Aktiviti
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'links' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link Peraturan (PDF)</label>
                        <input value={eventConfig.links.rules} onChange={e => setEventConfig({...eventConfig, links: {...eventConfig.links, rules: e.target.value}})} className="w-full p-3 border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link Keputusan (Chess-Results)</label>
                        <input value={eventConfig.links.results} onChange={e => setEventConfig({...eventConfig, links: {...eventConfig.links, results: e.target.value}})} className="w-full p-3 border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link Gambar / Media</label>
                        <input value={eventConfig.links.photos} onChange={e => setEventConfig({...eventConfig, links: {...eventConfig.links, photos: e.target.value}})} className="w-full p-3 border rounded-xl" />
                    </div>
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link Surat Jemputan</label>
                        <input value={eventConfig.documents.invitation} onChange={e => setEventConfig({...eventConfig, documents: {...eventConfig.documents, invitation: e.target.value}})} className="w-full p-3 border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link Surat Mesyuarat</label>
                        <input value={eventConfig.documents.meeting} onChange={e => setEventConfig({...eventConfig, documents: {...eventConfig.documents, meeting: e.target.value}})} className="w-full p-3 border rounded-xl" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Link Lantikan Arbiter</label>
                        <input value={eventConfig.documents.arbiter} onChange={e => setEventConfig({...eventConfig, documents: {...eventConfig.documents, arbiter: e.target.value}})} className="w-full p-3 border rounded-xl" />
                    </div>
                </div>
            )}
        </div>

        <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t">
            <button onClick={onClose} className="px-5 py-2 text-gray-500 font-bold">Batal</button>
            <button onClick={handleSave} disabled={isSaving} className="px-8 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all flex items-center gap-2 disabled:opacity-50">
                <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan ke Cloud'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
