
import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Check, AlertCircle, Loader2, Cloud, Info, Calendar, Link, FileText, Plus, Trash2 } from 'lucide-react';
import { saveConfig, getSpreadsheetId, getScriptUrl, validateCredentials, getDistrictKey, getEventConfig, updateRemoteConfig } from '../services/api';
import { EventConfig, ScheduleDay } from '../types';

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

  const handleSaveAll = async () => {
    setError(null);
    setIsSaving(true);

    try {
        // 1. Simpan Kredensial dahulu
        const check = await validateCredentials(spreadsheetId, webAppUrl);
        if (!check.success) {
            setError(check.error || "Gagal menyambung ke Cloud.");
            setIsSaving(false);
            return;
        }
        saveConfig(spreadsheetId, webAppUrl);

        // 2. Simpan Konfigurasi ke Cloud
        await updateRemoteConfig(config);
        
        // Simpan lokal juga
        localStorage.setItem(`eventConfig_${getDistrictKey()}`, JSON.stringify(config));
        
        onClose();
        window.location.reload(); 
    } catch (err: any) {
        setError("Gagal menyimpan ke Cloud. Pastikan Web App disetkan kepada 'Anyone'.");
    } finally {
        setIsSaving(false);
    }
  };

  const updateSchedule = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number, field: 'time' | 'activity', value: string) => {
    const newConfig = { ...config };
    newConfig.schedules[type][dayIndex].items[itemIndex][field] = value;
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
  
  if (data.action === 'submit' || data.action === 'update') {
    return saveRegistration(ss, data);
  } else if (data.action === 'updateConfig') {
    return saveRemoteConfig(ss, data.config);
  }
}

function saveRemoteConfig(ss, config) {
  const infoSheet = ss.getSheetByName('INFO') || ss.insertSheet('INFO');
  infoSheet.clear().appendRow(['Nama', 'Lokasi', 'Telefon Admin']);
  infoSheet.appendRow([config.eventName, config.eventVenue, config.adminPhone]);

  const pautanSheet = ss.getSheetByName('PAUTAN') || ss.insertSheet('PAUTAN');
  pautanSheet.clear().appendRow(['Peraturan', 'Keputusan', 'Gambar']);
  pautanSheet.appendRow([config.links.rules, config.links.results, config.links.photos]);

  const docSheet = ss.getSheetByName('DOKUMEN') || ss.insertSheet('DOKUMEN');
  docSheet.clear().appendRow(['Jemputan', 'Mesyuarat', 'Arbiter']);
  docSheet.appendRow([config.documents.invitation, config.documents.meeting, config.documents.arbiter]);

  const jadualSheet = ss.getSheetByName('JADUAL') || ss.insertSheet('JADUAL');
  jadualSheet.clear().appendRow(['Kategori', 'Hari', 'Masa', 'Aktiviti']);
  
  config.schedules.primary.forEach(day => {
    day.items.forEach(item => jadualSheet.appendRow(['RENDAH', day.date, item.time, item.activity]));
  });
  config.schedules.secondary.forEach(day => {
    day.items.forEach(item => jadualSheet.appendRow(['MENENGAH', day.date, item.time, item.activity]));
  });

  return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}

function fetchRemoteConfig(ss) {
  const info = ss.getSheetByName('INFO')?.getRange('A2:C2').getValues()[0] || ["KEJOHANAN CATUR", "LOKASI", "60123"];
  const pautan = ss.getSheetByName('PAUTAN')?.getRange('A2:C2').getValues()[0] || ["#","#","#"];
  const doc = ss.getSheetByName('DOKUMEN')?.getRange('A2:C2').getValues()[0] || ["#","#","#"];
  const jadualData = ss.getSheetByName('JADUAL')?.getDataRange().getValues() || [];
  
  const schedules = { primary: [], secondary: [] };
  for (let i = 1; i < jadualData.length; i++) {
    const [cat, day, time, act] = jadualData[i];
    if (!cat || !day) continue;
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
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  if (!schoolSheet) return {};
  const schoolData = schoolSheet.getDataRange().getValues();
  const teacherData = ss.getSheetByName('GURU')?.getDataRange().getValues() || [];
  const studentData = ss.getSheetByName('PELAJAR')?.getDataRange().getValues() || [];
  const registrations = {};
  for (let i = 1; i < schoolData.length; i++) {
    const id = schoolData[i][0];
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
  const schoolSheet = ss.getSheetByName('SEKOLAH') || ss.insertSheet('SEKOLAH');
  const teacherSheet = ss.getSheetByName('GURU') || ss.insertSheet('GURU');
  const studentSheet = ss.getSheetByName('PELAJAR') || ss.insertSheet('PELAJAR');
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] max-w-4xl w-full shadow-2xl flex flex-col overflow-hidden animate-fadeIn my-auto">
        {/* Header */}
        <div className="p-6 bg-orange-600 text-white flex justify-between items-center shadow-lg relative z-10">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl"><Cloud size={24}/></div>
                <div>
                    <h2 className="text-xl font-bold">MSSD Catur Setup</h2>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Daerah: {getDistrictKey()}</p>
                </div>
            </div>
            <button onClick={onClose} className="hover:bg-black/10 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex flex-wrap bg-gray-50 border-b overflow-x-auto">
            {[
                { id: 'cloud', label: 'Cloud', icon: <Cloud size={16}/> },
                { id: 'info', label: 'Maklumat', icon: <Info size={16}/> },
                { id: 'jadual', label: 'Jadual', icon: <Calendar size={16}/> },
                { id: 'pautan', label: 'Pautan', icon: <Link size={16}/> },
                { id: 'dokumen', label: 'Dokumen', icon: <FileText size={16}/> },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                        activeTab === tab.id ? 'border-orange-600 text-orange-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] bg-white">
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl flex items-start gap-3 animate-shake">
                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                    <div className="text-sm">
                        <p className="font-bold">Ralat Konfigurasi!</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {activeTab === 'cloud' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Spreadsheet ID</label>
                            <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-sm" placeholder="ID dari URL Google Sheet" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Script URL</label>
                            <input type="text" value={webAppUrl} onChange={(e) => setWebAppUrl(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-sm" placeholder="https://script.google.com/macros/s/.../exec" />
                        </div>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-indigo-800 font-bold flex items-center gap-2 text-sm"><FileText size={16}/> SCRIPT TEMPLATE</h4>
                            <button onClick={() => { navigator.clipboard.writeText(getScriptContent()); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all">
                                {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'TELAH DISALIN' : 'SALIN KOD'}
                            </button>
                        </div>
                        <p className="text-[10px] text-indigo-400 leading-relaxed mb-4">
                            Salin kod di atas dan tampal ke dalam <b>Extensions &gt; Apps Script</b> di Google Sheet anda. Kemudian <b>Deploy &gt; New Deployment</b> sebagai Web App.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'info' && (
                <div className="space-y-6 animate-fadeIn">
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Nama Kejohanan</label>
                        <input type="text" value={config.eventName} onChange={(e) => setConfig({...config, eventName: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-bold" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Lokasi Kejohanan</label>
                            <input type="text" value={config.eventVenue} onChange={(e) => setConfig({...config, eventVenue: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">No. Telefon Admin (WhatsApp)</label>
                            <input type="text" value={config.adminPhone} onChange={(e) => setConfig({...config, adminPhone: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all" />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'jadual' && (
                <div className="space-y-8 animate-fadeIn">
                    {(['primary', 'secondary'] as const).map(type => (
                        <div key={type} className="bg-gray-50 p-6 rounded-[2rem] border">
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase tracking-tighter">
                                {type === 'primary' ? '🏫 Sekolah Rendah' : '🎓 Sekolah Menengah'}
                            </h4>
                            {config.schedules[type].map((day, dIdx) => (
                                <div key={dIdx} className="mb-6 bg-white p-4 rounded-2xl border">
                                    <input 
                                        type="text" 
                                        value={day.date} 
                                        onChange={(e) => {
                                            const newConfig = {...config};
                                            newConfig.schedules[type][dIdx].date = e.target.value;
                                            setConfig(newConfig);
                                        }}
                                        className="font-black text-orange-600 mb-4 outline-none border-b-2 border-orange-50 w-full"
                                    />
                                    <div className="space-y-3">
                                        {day.items.map((item, iIdx) => (
                                            <div key={iIdx} className="flex gap-2">
                                                <input value={item.time} onChange={(e) => updateSchedule(type, dIdx, iIdx, 'time', e.target.value)} placeholder="Masa" className="w-32 text-xs p-2 border rounded-xl" />
                                                <input value={item.activity} onChange={(e) => updateSchedule(type, dIdx, iIdx, 'activity', e.target.value)} placeholder="Aktiviti" className="flex-1 text-xs p-2 border rounded-xl" />
                                                <button onClick={() => removeScheduleItem(type, dIdx, iIdx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                        <button onClick={() => addScheduleItem(type, dIdx)} className="w-full py-2 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-xl border border-dashed border-orange-200 hover:bg-orange-100 flex items-center justify-center gap-1">
                                            <Plus size={12}/> TAMBAH AKTIVITI
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'pautan' && (
                <div className="space-y-6 animate-fadeIn">
                    {Object.entries(config.links).map(([key, val]) => (
                        <div key={key}>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">{key}</label>
                            <input type="text" value={val} onChange={(e) => setConfig({...config, links: {...config.links, [key]: e.target.value}})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-xs" />
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'dokumen' && (
                <div className="space-y-6 animate-fadeIn">
                    {Object.entries(config.documents).map(([key, val]) => (
                        <div key={key}>
                            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">{key}</label>
                            <input type="text" value={val} onChange={(e) => setConfig({...config, documents: {...config.documents, [key]: e.target.value}})} className="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-xs" />
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 flex justify-between items-center border-t">
            <p className="text-[10px] text-gray-400 max-w-[50%]">Klik simpan untuk mengemas kini semua tab maklumat kejohanan ke Spreadsheet Cloud anda.</p>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-400 hover:text-gray-600 transition-colors">BATAL</button>
                <button onClick={handleSaveAll} disabled={isSaving} className="px-8 py-3 bg-orange-600 text-white rounded-[1.25rem] font-bold shadow-xl shadow-orange-100 flex items-center gap-2 disabled:bg-orange-300 hover:bg-orange-700 transition-all transform active:scale-95">
                    {isSaving ? <><Loader2 className="animate-spin" size={18}/> MENYIMPAN...</> : <><Save size={18}/> SIMPAN KE CLOUD</>}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
