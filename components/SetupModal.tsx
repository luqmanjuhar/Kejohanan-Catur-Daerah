
import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Check, Database, Calendar, Link as LinkIcon, FileText, Clock, Trash2, Plus } from 'lucide-react';
import { saveConfig, getEventConfig } from '../services/api';
import { EventConfig, ScheduleDay } from '../types';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'event' | 'schedule' | 'links' | 'docs'>('system');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [eventConfig, setEventConfig] = useState<EventConfig>(getEventConfig());

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetId(localStorage.getItem('spreadsheetId') || '1FJnBiWM5cuH0a1Yw0CxAR9zy_LiD1lVtQg9ijXRrPS4');
      setWebAppUrl(localStorage.getItem('webAppUrl') || 'https://script.google.com/macros/s/AKfycbwWNUtbfV4VKvsmbGyD4RWNUEVFdKwkk8bOsXuPdBkfgJ_-QFySGx0uJmfsBW5087mlPQ/exec');
      setEventConfig(getEventConfig());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveConfig(spreadsheetId, webAppUrl, eventConfig);
    onClose();
    window.location.reload(); 
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getScriptContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScriptContent = () => {
    return `// MSSD Catur Registration System - Google Apps Script
// This script is generic and uses the spreadsheetId sent by the application.

const DEFAULT_SPREADSHEET_ID = '${spreadsheetId || 'YOUR_SPREADSHEET_ID'}';

function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    const sheetId = e.parameter.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    
    let result = {};
    
    if (action === 'load') {
      result = loadRegistrations(sheetId);
    } else if (action === 'search') {
      const regId = e.parameter.regId;
      const password = e.parameter.password;
      result = searchRegistration(regId, password, sheetId);
    }
    
    if (callback) {
      const output = callback + '(' + JSON.stringify(result) + ')';
      return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    const err = { error: error.toString(), stack: error.stack };
    const callback = e.parameter.callback;
    if (callback) return ContentService.createTextOutput(callback + '(' + JSON.stringify(err) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    return ContentService.createTextOutput(JSON.stringify(err)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheetId = data.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    
    if (action === 'submit' || action === 'update') {
      return saveRegistration(data, sheetId);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function loadRegistrations(sheetId) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    let teacherSheet = ss.getSheetByName('GURU') || ss.insertSheet('GURU');
    let schoolSheet = ss.getSheetByName('SEKOLAH') || ss.insertSheet('SEKOLAH');
    let studentSheet = ss.getSheetByName('PELAJAR') || ss.insertSheet('PELAJAR');
    
    if (schoolSheet.getLastRow() === 0) schoolSheet.appendRow(['ID PENDAFTARAN', 'NAMA SEKOLAH', 'JENIS SEKOLAH', 'JUMLAH GURU', 'JUMLAH PELAJAR', 'JUMLAH LELAKI', 'JUMLAH PEREMPUAN', 'JUMLAH U12', 'JUMLAH U15', 'JUMLAH U18', 'TARIKH DAFTAR', 'TARIKH KEMASKINI', 'STATUS', 'CATATAN']);
    if (teacherSheet.getLastRow() === 0) teacherSheet.appendRow(['ID PENDAFTARAN', 'NAMA SEKOLAH', 'NAMA GURU', 'EMAIL GURU', 'TELEFON GURU', 'JAWATAN GURU', 'URUTAN GURU', 'TARIKH DAFTAR', 'TARIKH KEMASKINI', 'STATUS']);
    if (studentSheet.getLastRow() === 0) studentSheet.appendRow(['ID PENDAFTARAN', 'NAMA SEKOLAH', 'NAMA PELAJAR', 'NO IC', 'JANTINA', 'KATEGORI UMUR', 'KATEGORI DISPLAY', 'BANGSA', 'ID PEMAIN', 'GURU KETUA', 'TELEFON GURU', 'TARIKH DAFTAR', 'TARIKH KEMASKINI', 'STATUS']);

    const registrations = {};
    const schoolData = schoolSheet.getDataRange().getValues();
    const teacherData = teacherSheet.getDataRange().getValues();
    const studentData = studentSheet.getDataRange().getValues();
    
    for (let i = 1; i < schoolData.length; i++) {
      const regId = schoolData[i][0];
      if (regId) registrations[regId] = { schoolName: schoolData[i][1], schoolType: schoolData[i][2], createdAt: schoolData[i][10], updatedAt: schoolData[i][11], status: schoolData[i][12], teachers: [], students: [] };
    }
    
    for (let i = 1; i < teacherData.length; i++) {
      const regId = teacherData[i][0];
      if (regId && registrations[regId]) registrations[regId].teachers.push({ name: teacherData[i][2], email: teacherData[i][3], phone: teacherData[i][4], position: teacherData[i][5], order: teacherData[i][6] });
    }
    
    for (let i = 1; i < studentData.length; i++) {
      const regId = studentData[i][0];
      if (regId && registrations[regId]) registrations[regId].students.push({ name: studentData[i][2], ic: studentData[i][3], gender: studentData[i][4], category: studentData[i][5], categoryDisplay: studentData[i][6], race: studentData[i][7], playerId: studentData[i][8] });
    }
    
    return { registrations: registrations };
  } catch (error) {
    return { error: 'Failed to load data: ' + error.toString() };
  }
}

function saveRegistration(data, sheetId) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const teacherSheet = ss.getSheetByName('GURU');
    const schoolSheet = ss.getSheetByName('SEKOLAH');
    const studentSheet = ss.getSheetByName('PELAJAR');
    const regId = data.registrationId;
    const isUpdate = data.action === 'update';
    
    let createdDate = isUpdate && data.originalCreatedAt ? new Date(data.originalCreatedAt) : new Date(data.timestamp || new Date());
    let updatedDate = new Date();
    
    [teacherSheet, schoolSheet, studentSheet].forEach(sheet => {
      const sheetData = sheet.getDataRange().getValues();
      for (let i = sheetData.length - 1; i >= 1; i--) if (sheetData[i][0] === regId) sheet.deleteRow(i + 1);
    });
    
    let totalM = 0, totalF = 0, u12 = 0, u15 = 0, u18 = 0;
    data.students.forEach(s => {
      if (s.gender === 'Lelaki') totalM++; else totalF++;
      if (s.category.includes('12')) u12++; else if (s.category.includes('15')) u15++; else u18++;
    });

    schoolSheet.appendRow([regId, data.schoolName, data.schoolType, data.teachers.length, data.students.length, totalM, totalF, u12, u15, u18, createdDate, updatedDate, 'AKTIF', '']);
    data.teachers.forEach((t, idx) => teacherSheet.appendRow([regId, data.schoolName, t.name, t.email, t.phone, idx === 0 ? 'KETUA' : 'PENGIRING', idx + 1, createdDate, updatedDate, 'AKTIF']));
    data.students.forEach(s => {
      const catDisp = (s.gender === 'Lelaki' ? 'L' : 'P') + (s.category.includes('12') ? '12' : s.category.includes('15') ? '15' : '18');
      studentSheet.appendRow([regId, data.schoolName, s.name, s.ic, s.gender, s.category, catDisp, s.race, s.playerId, data.teachers[0].name, data.teachers[0].phone, createdDate, updatedDate, 'AKTIF']);
    });
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, registrationId: regId })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function searchRegistration(regId, password, sheetId) {
  try {
    const regs = loadRegistrations(sheetId);
    if (regs.error) return { found: false, error: regs.error };
    const registration = regs.registrations[regId];
    if (!registration) return { found: false, error: 'Registration not found' };
    if (registration.teachers.length > 0) {
      const phone = registration.teachers[0].phone.replace(/\\D/g, '');
      if (phone.slice(-4) === password) return { found: true, registration: registration };
    }
    return { found: false, error: 'Invalid password' };
  } catch (error) {
    return { found: false, error: error.toString() };
  }
}`;
  }

  // Simplified schedule helpers
  const addDay = (type: 'primary' | 'secondary') => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type] = [...newConfig.schedules[type], { date: 'HARI BARU', items: [] }];
      setEventConfig(newConfig);
  };

  const removeDay = (type: 'primary' | 'secondary', index: number) => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type] = newConfig.schedules[type].filter((_, i) => i !== index);
      setEventConfig(newConfig);
  };

  const updateDayDate = (type: 'primary' | 'secondary', index: number, val: string) => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type][index].date = val;
      setEventConfig(newConfig);
  };

  const addItem = (type: 'primary' | 'secondary', dayIndex: number) => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type][dayIndex].items.push({ time: '', activity: '' });
      setEventConfig(newConfig);
  };

  const removeItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number) => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type][dayIndex].items = newConfig.schedules[type][dayIndex].items.filter((_, i) => i !== itemIndex);
      setEventConfig(newConfig);
  };

  const updateItem = (type: 'primary' | 'secondary', dayIndex: number, itemIndex: number, field: 'time' | 'activity', val: string) => {
      const newConfig = { ...eventConfig };
      newConfig.schedules[type][dayIndex].items[itemIndex][field] = val;
      setEventConfig(newConfig);
  };

  if (!isOpen) return null;

  const ScheduleEditor = ({ type, data, title }: { type: 'primary' | 'secondary', data: ScheduleDay[], title: string }) => (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="font-bold text-gray-800 mb-3 flex justify-between items-center">
              {title}
              <button onClick={() => addDay(type)} className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 flex items-center gap-1">
                  <Plus size={14}/> Hari
              </button>
          </h4>
          {data.map((day, dIdx) => (
              <div key={dIdx} className="bg-white p-3 rounded shadow-sm mb-3">
                  <div className="flex gap-2 mb-2">
                      <input 
                        className="flex-1 p-2 border rounded text-sm font-semibold" 
                        placeholder="Tajuk Hari"
                        value={day.date}
                        onChange={(e) => updateDayDate(type, dIdx, e.target.value)}
                      />
                      <button onClick={() => removeDay(type, dIdx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                      {day.items.map((item, iIdx) => (
                          <div key={iIdx} className="flex gap-2 items-center">
                              <input 
                                className="w-1/3 p-1 text-sm border rounded" 
                                placeholder="Masa" 
                                value={item.time}
                                onChange={(e) => updateItem(type, dIdx, iIdx, 'time', e.target.value)}
                              />
                              <input 
                                className="flex-1 p-1 text-sm border rounded" 
                                placeholder="Aktiviti"
                                value={item.activity}
                                onChange={(e) => updateItem(type, dIdx, iIdx, 'activity', e.target.value)}
                              />
                              <button onClick={() => removeItem(type, dIdx, iIdx)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                          </div>
                      ))}
                      <button onClick={() => addItem(type, dIdx)} className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-1">
                          <Plus size={12}/> Tambah Aktiviti
                      </button>
                  </div>
              </div>
          ))}
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">⚙️ Tetapan Sistem</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
            <button onClick={() => setActiveTab('system')} className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${activeTab === 'system' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500'}`}>System</button>
            <button onClick={() => setActiveTab('event')} className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${activeTab === 'event' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}>Info</button>
            <button onClick={() => setActiveTab('schedule')} className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${activeTab === 'schedule' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500'}`}>Jadual</button>
            <button onClick={() => setActiveTab('links')} className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${activeTab === 'links' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>Pautan</button>
            <button onClick={() => setActiveTab('docs')} className={`px-4 py-3 font-medium border-b-2 whitespace-nowrap ${activeTab === 'docs' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500'}`}>Dokumen</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'system' && (
                <div className="space-y-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-purple-800 mb-4">Google Sheets Connection</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
                            <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Web App URL (Script URL)</label>
                            <input type="text" value={webAppUrl} onChange={(e) => setWebAppUrl(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500" placeholder="https://script.google.com/macros/s/.../exec" />
                        </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-gray-700">Google Apps Script Code</h3>
                            <button onClick={copyCode} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="bg-gray-800 text-gray-100 rounded p-3 text-xs font-mono max-h-40 overflow-y-auto">
                            <pre>{getScriptContent()}</pre>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'event' && (
                <div className="space-y-6">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-orange-800 mb-4">Maklumat Pertandingan</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kejohanan</label>
                            <input type="text" value={eventConfig.eventName} onChange={(e) => setEventConfig({...eventConfig, eventName: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tempat / Venue</label>
                            <input type="text" value={eventConfig.eventVenue} onChange={(e) => setEventConfig({...eventConfig, eventVenue: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telefon Admin</label>
                            <input type="text" value={eventConfig.adminPhone} onChange={(e) => setEventConfig({...eventConfig, adminPhone: e.target.value})} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-500" />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'schedule' && (
                <div className="grid md:grid-cols-2 gap-4">
                    <ScheduleEditor type="primary" data={eventConfig.schedules.primary} title="Rendah (U12)" />
                    <ScheduleEditor type="secondary" data={eventConfig.schedules.secondary} title="Menengah (U15/18)" />
                </div>
            )}

            {activeTab === 'links' && (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Peraturan (PDF Link)</label>
                        <input type="text" value={eventConfig.links.rules} onChange={(e) => setEventConfig({...eventConfig, links: {...eventConfig.links, rules: e.target.value}})} className="w-full px-3 py-2 border rounded mb-3" />
                        
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keputusan (Chess-Results)</label>
                        <input type="text" value={eventConfig.links.results} onChange={(e) => setEventConfig({...eventConfig, links: {...eventConfig.links, results: e.target.value}})} className="w-full px-3 py-2 border rounded mb-3" />
                        
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gambar & Media</label>
                        <input type="text" value={eventConfig.links.photos} onChange={(e) => setEventConfig({...eventConfig, links: {...eventConfig.links, photos: e.target.value}})} className="w-full px-3 py-2 border rounded" />
                    </div>
                </div>
            )}

            {activeTab === 'docs' && (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Surat Jemputan</label>
                        <input type="text" value={eventConfig.documents.invitation} onChange={(e) => setEventConfig({...eventConfig, documents: {...eventConfig.documents, invitation: e.target.value}})} className="w-full px-3 py-2 border rounded mb-3" />
                        
                        <label className="block text-sm font-medium text-gray-700 mb-1">Surat Mesyuarat</label>
                        <input type="text" value={eventConfig.documents.meeting} onChange={(e) => setEventConfig({...eventConfig, documents: {...eventConfig.documents, meeting: e.target.value}})} className="w-full px-3 py-2 border rounded mb-3" />
                        
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lantikan Arbiter</label>
                        <input type="text" value={eventConfig.documents.arbiter} onChange={(e) => setEventConfig({...eventConfig, documents: {...eventConfig.documents, arbiter: e.target.value}})} className="w-full px-3 py-2 border rounded" />
                    </div>
                </div>
            )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium">Batal</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold shadow-md">
                <Save className="w-4 h-4" /> Simpan Tetapan
            </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
