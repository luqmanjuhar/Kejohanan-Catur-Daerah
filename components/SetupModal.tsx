
import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Check, AlertCircle, Loader2, Cloud, Info, Calendar, Link, FileText, Plus, Trash2, RefreshCcw } from 'lucide-react';
import { saveConfig, getSpreadsheetId, getScriptUrl, validateCredentials, getDistrictKey, getEventConfig, updateRemoteConfig, clearCachedCredentials } from '../services/api';
import { EventConfig } from '../types';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'info' | 'jadual' | 'pautan' | 'dokumen'>('cloud');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [config, setConfig] = useState<EventConfig>(getEventConfig());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetId(getSpreadsheetId());
      setWebAppUrl(getScriptUrl());
      setConfig(getEventConfig());
      setError(null);
    }
  }, [isOpen]);

  const handleReset = () => {
    if (confirm("Adakah anda pasti mahu memulihkan kredensial Pasir Gudang yang asal? Semua URL kustom akan dipadam.")) {
        clearCachedCredentials();
        window.location.reload();
    }
  };

  const handleSaveAll = async () => {
    setError(null);
    setIsSaving(true);
    try {
        const check = await validateCredentials(spreadsheetId, webAppUrl);
        if (!check.success) {
            setError(check.error || "Gagal menyambung ke Cloud.");
            setIsSaving(false);
            return;
        }
        saveConfig(spreadsheetId, webAppUrl);
        await updateRemoteConfig(config);
        localStorage.setItem(`eventConfig_${getDistrictKey()}`, JSON.stringify(config));
        onClose();
        window.location.reload(); 
    } catch (err: any) {
        setError(err.message || "Ralat semasa menyimpan ke Cloud.");
    } finally {
        setIsSaving(false);
    }
  };

  const updateScheduleItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number, field: 'time' | 'activity', value: string) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items[itemIndex][field] = value;
    setConfig(newConfig);
  };

  const addScheduleDay = (type: 'primary' | 'secondary') => {
    const newConfig = { ...config };
    newConfig.schedules[type].push({ date: 'HARI BARU', items: [{ time: '', activity: '' }] });
    setConfig(newConfig);
  };

  const removeScheduleDay = (type: 'primary' | 'secondary', dayIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type].splice(dayIndex, 1);
    setConfig(newConfig);
  };

  const addScheduleItem = (type: 'primary' | 'secondary', dayIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items.push({ time: '', activity: '' });
    setConfig(newConfig);
  };

  const removeScheduleItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items.splice(itemIndex, 1);
    setConfig(newConfig);
  };

  const getScriptContent = () => {
    return `/**
 * Backend MSSD Catur v3.5 - Pasir Gudang Edition
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
  if (data.action === 'submit' || data.action === 'update') {
    return saveRegistration(ss, data);
  } else if (data.action === 'updateConfig') {
    return saveRemoteConfig(ss, data.config);
  }
}

function saveRemoteConfig(ss, config) {
  const getSheet = (name) => ss.getSheetByName(name) || ss.insertSheet(name);
  const infoSheet = getSheet('INFO');
  infoSheet.clear().appendRow(['Nama', 'Lokasi', 'Telefon Admin']);
  infoSheet.appendRow([config.eventName, config.eventVenue, config.adminPhone]);
  const pautanSheet = getSheet('PAUTAN');
  pautanSheet.clear().appendRow(['Peraturan', 'Keputusan', 'Gambar']);
  pautanSheet.appendRow([config.links.rules, config.links.results, config.links.photos]);
  const docSheet = getSheet('DOKUMEN');
  docSheet.clear().appendRow(['Jemputan', 'Mesyuarat', 'Arbiter']);
  docSheet.appendRow([config.documents.invitation, config.documents.meeting, config.documents.arbiter]);
  const jadualSheet = getSheet('JADUAL');
  jadualSheet.clear().appendRow(['Kategori', 'Hari', 'Masa', 'Aktiviti']);
  config.schedules.primary.forEach(day => day.items.forEach(item => jadualSheet.appendRow(['RENDAH', day.date, item.time, item.activity])));
  config.schedules.secondary.forEach(day => day.items.forEach(item => jadualSheet.appendRow(['MENENGAH', day.date, item.time, item.activity])));
  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function fetchRemoteConfig(ss) {
  const getVal = (sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet ? sheet.getRange('A2:C2').getValues()[0] : null;
    return data && data[0] ? data : ["#","#","#"];
  };
  const info = getVal('INFO');
  const pautan = getVal('PAUTAN');
  const doc = getVal('DOKUMEN');
  const jadualSheet = ss.getSheetByName('JADUAL');
  const jadualData = jadualSheet ? jadualSheet.getDataRange().getValues() : [];
  const schedules = { primary: [], secondary: [] };
  for (let i = 1; i < jadualData.length; i++) {
    const [cat, day, time, act] = jadualData[i];
    if (!cat || !day) continue;
    const target = cat === 'RENDAH' ? 'primary' : 'secondary';
    let dayObj = schedules[target].find(d => d.date === day);
    if (!dayObj) { dayObj = { date: day, items: [] }; schedules[target].push(dayObj); }
    dayObj.items.push({ time, activity: act });
  }
  return {
    eventName: info[0], eventVenue: info[1], adminPhone: info[2],
    schedules, links: { rules: pautan[0], results: pautan[1], photos: pautan[2] },
    documents: { invitation: doc[0], meeting: doc[1], arbiter: doc[2] }
  };
}

function fetchRegistrations(ss) {
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  if (!schoolSheet) return {};
  const schoolData = schoolSheet.getDataRange().getValues();
  const teacherData = ss.getSheetByName('GURU')?.getDataRange().getValues() || [];
  const studentData = ss.getSheetByName('PELAJAR')?.getDataRange().getValues() || [];
  const registrations = {};
  for (let i = 1; i < schoolData.length; i++) {
    const id = schoolData[i][0];
    if (!id) continue;
    registrations[id] = { schoolName: schoolData[i][1], schoolType: schoolData[i][2], teachers: [], students: [], createdAt: schoolData[i][10] };
  }
  for (let i = 1; i < teacherData.length; i++) {
    const id = teacherData[i][0];
    if (registrations[id]) registrations[id].teachers.push({ name: teacherData[i][2], email: teacherData[i][3], phone: teacherData[i][4], position: teacherData[i][5] });
  }
  for (let i = 1; i < studentData.length; i++) {
    const id = studentData[i][0];
    if (registrations[id]) registrations[id].students.push({ name: studentData[i][2], ic: studentData[i][3], gender: studentData[i][4], category: studentData[i][5], race: studentData[i][7], playerId: studentData[i][8] });
  }
  return registrations;
}

function saveRegistration(ss, data) {
  const getSheet = (name) => ss.getSheetByName(name) || ss.insertSheet(name);
  const schoolSheet = getSheet('SEKOLAH');
  const teacherSheet = getSheet('GURU');
  const studentSheet = getSheet('PELAJAR');
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] max-w-5xl w-full shadow-2xl flex flex-col overflow-hidden animate-fadeIn h-[90vh]">
        {/* Header */}
        <div className="p-8 bg-orange-600 text-white flex justify-between items-center relative">
            <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"><Cloud size={28}/></div>
                <div>
                    <h2 className="text-2xl font-black tracking-tight">Setup Kejohanan</h2>
                    <p className="text-xs font-bold opacity-70 tracking-widest uppercase">Daerah Pasir Gudang</p>
                </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-black/20 p-3 rounded-full transition-all"><X size={24} /></button>
        </div>
        
        {/* Navigation */}
        <div className="flex bg-gray-50 border-b overflow-x-auto no-scrollbar">
            {[
                { id: 'cloud', label: 'Cloud', icon: <Cloud size={18}/> },
                { id: 'info', label: 'Info', icon: <Info size={18}/> },
                { id: 'jadual', label: 'Jadual', icon: <Calendar size={18}/> },
                { id: 'pautan', label: 'Pautan', icon: <Link size={18}/> },
                { id: 'dokumen', label: 'Dokumen', icon: <FileText size={18}/> },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-8 py-5 text-sm font-black transition-all border-b-4 whitespace-nowrap ${
                        activeTab === tab.id ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
            {error && (
                <div className="bg-red-50 border-2 border-red-100 p-5 rounded-3xl flex items-start gap-4 animate-shake">
                    <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                    <div className="text-sm">
                        <p className="font-black text-red-800">Ralat Konfigurasi</p>
                        <p className="text-red-600 font-medium">{error}</p>
                        <button onClick={handleReset} className="mt-2 text-xs font-black text-red-700 underline flex items-center gap-1">
                            <RefreshCcw size={12}/> Klik di sini untuk Reset Kredensial (Cadangan)
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'cloud' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-3xl mb-8">
                        <h4 className="font-black text-orange-800 text-sm mb-2 flex items-center gap-2">
                           <AlertCircle size={18}/> PANDUAN PENTING
                        </h4>
                        <ol className="text-xs text-orange-700 font-bold space-y-2 list-decimal ml-4">
                            <li>Buka Google Sheet anda > Extensions > Apps Script.</li>
                            <li>Tampal kod dari butang di bawah. <b>Klik Save & Run (Authorize).</b></li>
                            <li>Klik <b>Deploy > New Deployment</b>.</li>
                            <li>Setkan Type kepada <b>Web App</b>.</li>
                            <li>Setkan "Who has access" kepada <b>Anyone</b> (PUNCA UTAMA RALAT JIKA TIDAK DIBUAT).</li>
                        </ol>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Spreadsheet ID</label>
                            <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all font-mono text-xs" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Apps Script URL</label>
                            <input type="text" value={webAppUrl} onChange={(e) => setWebAppUrl(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all font-mono text-xs" />
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1 bg-indigo-50/50 p-8 rounded-[2rem] border-2 border-indigo-100/50">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-indigo-900 font-black text-sm tracking-tight flex items-center gap-2">
                                    <FileText size={20} className="text-indigo-600"/> TEMPLATE BACKEND SCRIPT
                                </h4>
                                <button onClick={() => { navigator.clipboard.writeText(getScriptContent()); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all uppercase">
                                    {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Berjaya Disalin' : 'Salin Skrip'}
                                </button>
                            </div>
                            <p className="text-xs text-indigo-500/80 leading-relaxed font-bold">
                                Gunakan versi 3.5 untuk kestabilan maksimum. Pastikan anda "Deploy" semula Web App selepas mengemaskini kod dalam Apps Script.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'info' && (
                <div className="space-y-8 animate-fadeIn max-w-2xl">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Nama Rasmi Kejohanan</label>
                        <input type="text" value={config.eventName} onChange={(e) => setConfig({...config, eventName: e.target.value})} className="w-full px-6 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-black text-lg text-orange-600" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Lokasi / Venue</label>
                            <input type="text" value={config.eventVenue} onChange={(e) => setConfig({...config, eventVenue: e.target.value})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">No. Telefon Admin</label>
                            <input type="text" value={config.adminPhone} onChange={(e) => setConfig({...config, adminPhone: e.target.value})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold" />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'jadual' && (
                <div className="space-y-12 animate-fadeIn">
                    {(['primary', 'secondary'] as const).map(type => (
                        <div key={type} className="bg-gray-50/50 p-8 rounded-[2.5rem] border-2 border-gray-100">
                            <div className="flex justify-between items-center mb-8">
                                <h4 className="font-black text-gray-800 flex items-center gap-3 text-lg">
                                    {type === 'primary' ? '🏫 Sekolah Rendah' : '🎓 Sekolah Menengah'}
                                </h4>
                                <button onClick={() => addScheduleDay(type)} className="px-5 py-2.5 bg-gray-800 text-white text-[10px] font-black rounded-xl hover:bg-black transition-all flex items-center gap-2 uppercase">
                                    <Plus size={14}/> Tambah Hari
                                </button>
                            </div>
                            
                            <div className="grid lg:grid-cols-2 gap-8">
                                {config.schedules[type].map((day, dIdx) => (
                                    <div key={dIdx} className="bg-white p-6 rounded-[2rem] border-2 border-gray-100 shadow-sm relative group">
                                        <button onClick={() => removeScheduleDay(type, dIdx)} className="absolute -top-3 -right-3 bg-red-100 text-red-500 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm"><Trash2 size={16}/></button>
                                        <input 
                                            type="text" 
                                            value={day.date} 
                                            onChange={(e) => {
                                                const newConfig = {...config};
                                                newConfig.schedules[type][dIdx].date = e.target.value;
                                                setConfig(newConfig);
                                            }}
                                            className="font-black text-orange-600 mb-6 outline-none border-b-4 border-orange-50 w-full text-base focus:border-orange-500 uppercase pb-2"
                                        />
                                        <div className="space-y-4">
                                            {day.items.map((item, iIdx) => (
                                                <div key={iIdx} className="flex gap-3">
                                                    <input value={item.time} onChange={(e) => updateScheduleItem(type, dIdx, iIdx, 'time', e.target.value)} placeholder="Masa" className="w-28 text-[11px] font-bold p-3 border-2 border-gray-50 rounded-xl focus:border-orange-200 outline-none" />
                                                    <input value={item.activity} onChange={(e) => updateScheduleItem(type, dIdx, iIdx, 'activity', e.target.value)} placeholder="Aktiviti" className="flex-1 text-[11px] font-bold p-3 border-2 border-gray-50 rounded-xl focus:border-orange-200 outline-none" />
                                                    <button onClick={() => removeScheduleItem(type, dIdx, iIdx)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                            <button onClick={() => addScheduleItem(type, dIdx)} className="w-full py-3 bg-orange-50 text-orange-600 text-[10px] font-black rounded-xl border-2 border-dashed border-orange-100 hover:bg-orange-100 flex items-center justify-center gap-2 transition-all">
                                                <Plus size={14}/> TAMBAH SLOT MASA
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'pautan' && (
                <div className="space-y-8 animate-fadeIn max-w-2xl">
                    {Object.entries(config.links).map(([key, val]) => (
                        <div key={key}>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">{key}</label>
                            <input type="text" value={val} onChange={(e) => setConfig({...config, links: {...config.links, [key]: e.target.value}})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-xs text-blue-600" placeholder="https://..." />
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'dokumen' && (
                <div className="space-y-8 animate-fadeIn max-w-2xl">
                    {Object.entries(config.documents).map(([key, val]) => (
                        <div key={key}>
                            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">{key}</label>
                            <input type="text" value={val} onChange={(e) => setConfig({...config, documents: {...config.documents, [key]: e.target.value}})} className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-xs text-red-600" placeholder="https://..." />
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 flex justify-between items-center border-t border-gray-100">
            <button onClick={handleReset} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest">
                <RefreshCcw size={14}/> Reset Credentials
            </button>
            <div className="flex gap-4">
                <button onClick={onClose} className="px-8 py-3 font-black text-gray-400 hover:text-gray-600 transition-colors uppercase text-xs">Batal</button>
                <button onClick={handleSaveAll} disabled={isSaving} className="px-10 py-4 bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-orange-100 flex items-center gap-3 disabled:bg-orange-300 hover:bg-orange-700 transition-all transform active:scale-95 uppercase text-xs tracking-widest">
                    {isSaving ? <><Loader2 className="animate-spin" size={18}/> Menyimpan...</> : <><Save size={18}/> Simpan Ke Cloud</>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
