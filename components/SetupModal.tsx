
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

  // Schedule Helpers
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

  const getScriptContent = () => {
    return `// MSSD Catur Registration System - Google Apps Script
// Your spreadsheet ID is configured below

const SPREADSHEET_ID = '${spreadsheetId || 'YOUR_SPREADSHEET_ID'}';

function doGet(e) {
  try {
    const action = e.parameter.action;
    const callback = e.parameter.callback;
    
    let result = {};
    
    if (action === 'load') {
      result = loadRegistrations();
    } else if (action === 'search') {
      const regId = e.parameter.regId;
      const password = e.parameter.password;
      result = searchRegistration(regId, password);
    }
    
    // JSONP response
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    const errorResult = { error: error.toString() };
    const callback = e.parameter.callback;
    
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(errorResult) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'submit' || action === 'update') {
      return saveRegistration(data);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function loadRegistrations() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Create sheets if they don't exist
    let teacherSheet = ss.getSheetByName('GURU');
    if (!teacherSheet) {
      teacherSheet = ss.insertSheet('GURU');
      teacherSheet.getRange(1, 1, 1, 10).setValues([['ID PENDAFTARAN', 'NAMA SEKOLAH', 'NAMA GURU', 'EMAIL GURU', 'TELEFON GURU', 'JAWATAN GURU', 'URUTAN GURU', 'TARIKH DAFTAR', 'TARIKH KEMASKINI', 'STATUS']]);
    }
    
    let schoolSheet = ss.getSheetByName('SEKOLAH');
    if (!schoolSheet) {
      schoolSheet = ss.insertSheet('SEKOLAH');
      schoolSheet.getRange(1, 1, 1, 14).setValues([['ID PENDAFTARAN', 'NAMA SEKOLAH', 'JENIS SEKOLAH', 'JUMLAH GURU', 'JUMLAH PELAJAR', 'JUMLAH LELAKI', 'JUMLAH PEREMPUAN', 'JUMLAH U12', 'JUMLAH U15', 'JUMLAH U18', 'TARIKH DAFTAR', 'TARIKH KEMASKINI', 'STATUS', 'CATATAN']]);
    }
    
    let studentSheet = ss.getSheetByName('PELAJAR');
    if (!studentSheet) {
      studentSheet = ss.insertSheet('PELAJAR');
      studentSheet.getRange(1, 1, 1, 14).setValues([['ID PENDAFTARAN', 'NAMA SEKOLAH', 'NAMA PELAJAR', 'NO IC', 'JANTINA', 'KATEGORI UMUR', 'KATEGORI DISPLAY', 'BANGSA', 'ID PEMAIN', 'GURU KETUA', 'TELEFON GURU', 'TARIKH DAFTAR', 'TARIKH KEMASKINI', 'STATUS']]);
    }
    
    const registrations = {};
    
    // Load data from sheets
    const schoolData = schoolSheet.getDataRange().getValues();
    const teacherData = teacherSheet.getDataRange().getValues();
    const studentData = studentSheet.getDataRange().getValues();
    
    // Process schools (skip header row)
    for (let i = 1; i < schoolData.length; i++) {
      const row = schoolData[i];
      const regId = row[0];
      if (regId) {
        registrations[regId] = {
          schoolName: row[1],
          schoolType: row[2],
          createdAt: row[10],
          updatedAt: row[11],
          status: row[12],
          teachers: [],
          students: []
        };
      }
    }
    
    // Process teachers (skip header row)
    for (let i = 1; i < teacherData.length; i++) {
      const row = teacherData[i];
      const regId = row[0];
      if (regId && registrations[regId]) {
        registrations[regId].teachers.push({
          name: row[2],
          email: row[3],
          phone: row[4],
          position: row[5],
          order: row[6]
        });
      }
    }
    
    // Process students (skip header row)
    for (let i = 1; i < studentData.length; i++) {
      const row = studentData[i];
      const regId = row[0];
      if (regId && registrations[regId]) {
        registrations[regId].students.push({
          name: row[2],
          ic: row[3],
          gender: row[4],
          category: row[5],
          categoryDisplay: row[6],
          race: row[7],
          playerId: row[8]
        });
      }
    }
    
    return { registrations: registrations };
    
  } catch (error) {
    return { error: 'Failed to load data: ' + error.toString() };
  }
}

function saveRegistration(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const teacherSheet = ss.getSheetByName('GURU');
    const schoolSheet = ss.getSheetByName('SEKOLAH');
    const studentSheet = ss.getSheetByName('PELAJAR');
    
    const regId = data.registrationId;
    const isUpdate = data.action === 'update';
    
    // For updates, preserve original creation date
    let createdDate, updatedDate;
    if (isUpdate && data.originalCreatedAt) {
      createdDate = new Date(data.originalCreatedAt);
      updatedDate = new Date(data.updateTimestamp);
    } else {
      // New registration - both dates are the same
      createdDate = updatedDate = new Date(data.timestamp || new Date());
    }
    
    // Determine school type - use provided schoolType or auto-detect
    let schoolType = data.schoolType || 'LAIN-LAIN';
    
    // Calculate statistics
    const totalTeachers = data.teachers.length;
    const totalStudents = data.students.length;
    let totalMale = 0, totalFemale = 0;
    let totalU12 = 0, totalU15 = 0, totalU18 = 0;
    
    data.students.forEach(student => {
      if (student.gender === 'Lelaki') totalMale++;
      else totalFemale++;
      
      if (student.category.includes('12')) totalU12++;
      else if (student.category.includes('15')) totalU15++;
      else if (student.category.includes('18')) totalU18++;
    });
    
    // Clear existing data for this registration
    [teacherSheet, schoolSheet, studentSheet].forEach(sheet => {
      const sheetData = sheet.getDataRange().getValues();
      for (let i = sheetData.length - 1; i >= 1; i--) {
        if (sheetData[i][0] === regId) {
          sheet.deleteRow(i + 1);
        }
      }
    });
    
    // Save school data - preserve original creation date for updates
    schoolSheet.appendRow([
      regId, data.schoolName, schoolType, totalTeachers, totalStudents,
      totalMale, totalFemale, totalU12, totalU15, totalU18,
      createdDate, updatedDate, 'AKTIF', ''
    ]);
    
    // Save teachers - preserve original creation date for updates
    data.teachers.forEach((teacher, index) => {
      const position = index === 0 ? 'KETUA' : 'PENGIRING';
      const order = index + 1;
      
      teacherSheet.appendRow([
        regId, data.schoolName, teacher.name, teacher.email, teacher.phone,
        position, order, createdDate, updatedDate, 'AKTIF'
      ]);
    });
    
    // Save students - preserve original creation date for updates
    const headTeacher = data.teachers[0];
    data.students.forEach(student => {
      // Generate category display (L12, P15, etc.)
      const genderCode = student.gender === 'Lelaki' ? 'L' : 'P';
      const ageCode = student.category.includes('12') ? '12' : 
                     student.category.includes('15') ? '15' : '18';
      const categoryDisplay = genderCode + ageCode;
      
      studentSheet.appendRow([
        regId, data.schoolName, student.name, student.ic, student.gender,
        student.category, categoryDisplay, student.race, student.playerId,
        headTeacher.name, headTeacher.phone, createdDate, updatedDate, 'AKTIF'
      ]);
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, registrationId: regId }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function searchRegistration(regId, password) {
  try {
    const registrations = loadRegistrations();
    
    if (registrations.error) {
      return { found: false, error: registrations.error };
    }
    
    const registration = registrations.registrations[regId];
    if (!registration) {
      return { found: false, error: 'Registration not found' };
    }
    
    // Verify password (last 4 digits of first teacher's phone)
    if (registration.teachers.length > 0) {
      const phone = registration.teachers[0].phone.replace(/\\D/g, '');
      const last4 = phone.slice(-4);
      
      if (last4 === password) {
        return { found: true, registration: registration };
      }
    }
    
    return { found: false, error: 'Invalid password' };
    
  } catch (error) {
    return { found: false, error: error.toString() };
  }
}`;
  }

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
                        placeholder="Tajuk Hari (cth: HARI PERTAMA (21 APRIL))"
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
                                placeholder="Masa (8.00 pagi)" 
                                value={item.time}
                                onChange={(e) => updateItem(type, dIdx, iIdx, 'time', e.target.value)}
                              />
                              <input 
                                className="flex-1 p-1 text-sm border rounded" 
                                placeholder="Aktiviti (Pendaftaran)"
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
          {data.length === 0 && <div className="text-sm text-gray-500 italic">Tiada jadual. Klik butang Hari untuk mula.</div>}
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">⚙️ Tetapan Sistem</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('system')}
                className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'system' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Database size={18} /> Google Sheets
            </button>
            <button 
                onClick={() => setActiveTab('event')}
                className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'event' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Calendar size={18} /> Info
            </button>
            <button 
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Clock size={18} /> Jadual
            </button>
            <button 
                onClick={() => setActiveTab('links')}
                className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'links' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <LinkIcon size={18} /> Pautan
            </button>
            <button 
                onClick={() => setActiveTab('docs')}
                className={`px-4 py-3 font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'docs' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <FileText size={18} /> Dokumen
            </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
            
            {/* TAB: SYSTEM */}
            {activeTab === 'system' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-purple-800 mb-4">Sambungan Database</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Spreadsheet ID</label>
                            <input
                                type="text"
                                value={spreadsheetId}
                                onChange={(e) => setSpreadsheetId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Web App URL</label>
                            <input
                                type="text"
                                value={webAppUrl}
                                onChange={(e) => setWebAppUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-bold text-gray-700">Backend Script Code</h3>
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

            {/* TAB: EVENT INFO */}
            {activeTab === 'event' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-orange-800 mb-4">Maklumat Pertandingan</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kejohanan</label>
                            <input
                                type="text"
                                value={eventConfig.eventName}
                                onChange={(e) => setEventConfig({...eventConfig, eventName: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                                placeholder="Contoh: KEJOHANAN CATUR MSSD..."
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tempat / Venue</label>
                            <input
                                type="text"
                                value={eventConfig.eventVenue}
                                onChange={(e) => setEventConfig({...eventConfig, eventVenue: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                                placeholder="Contoh: Dewan Sekolah..."
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telefon Admin (WhatsApp Notification)</label>
                            <input
                                type="text"
                                value={eventConfig.adminPhone}
                                onChange={(e) => setEventConfig({...eventConfig, adminPhone: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                                placeholder="Contoh: 60123456789"
                            />
                            <p className="text-xs text-orange-600 mt-1">Nombor ini akan menerima notifikasi WhatsApp apabila ada pendaftaran baru atau kemaskini.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SCHEDULE */}
            {activeTab === 'schedule' && (
                <div className="space-y-6 animate-fadeIn">
                    <p className="text-sm text-gray-600 mb-4 bg-yellow-50 p-3 rounded border border-yellow-200">
                        Edit jadual pertandingan mengikut hari. Tekan butang <b>Simpan Tetapan</b> di bawah untuk mengemaskini paparan Pengumuman.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <ScheduleEditor type="primary" data={eventConfig.schedules.primary} title="Sekolah Kebangsaan (Rendah)" />
                        <ScheduleEditor type="secondary" data={eventConfig.schedules.secondary} title="Sekolah Menengah" />
                    </div>
                </div>
            )}

            {/* TAB: LINKS */}
            {activeTab === 'links' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">Pautan Pengumuman</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pautan Peraturan Pertandingan (PDF/Drive)</label>
                            <input
                                type="text"
                                value={eventConfig.links.rules}
                                onChange={(e) => setEventConfig({...eventConfig, links: {...eventConfig.links, rules: e.target.value}})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pautan Keputusan (Chess-Results)</label>
                            <input
                                type="text"
                                value={eventConfig.links.results}
                                onChange={(e) => setEventConfig({...eventConfig, links: {...eventConfig.links, results: e.target.value}})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pautan Gambar & Media</label>
                            <input
                                type="text"
                                value={eventConfig.links.photos}
                                onChange={(e) => setEventConfig({...eventConfig, links: {...eventConfig.links, photos: e.target.value}})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: DOCS */}
            {activeTab === 'docs' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-green-800 mb-4">Pautan Dokumen Tambahan</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Surat Jemputan</label>
                            <input
                                type="text"
                                value={eventConfig.documents.invitation}
                                onChange={(e) => setEventConfig({...eventConfig, documents: {...eventConfig.documents, invitation: e.target.value}})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Surat Mesyuarat Pengurus</label>
                            <input
                                type="text"
                                value={eventConfig.documents.meeting}
                                onChange={(e) => setEventConfig({...eventConfig, documents: {...eventConfig.documents, meeting: e.target.value}})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Surat Lantikan Arbiter</label>
                            <input
                                type="text"
                                value={eventConfig.documents.arbiter}
                                onChange={(e) => setEventConfig({...eventConfig, documents: {...eventConfig.documents, arbiter: e.target.value}})}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-medium">
                Batal
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold shadow-md">
                <Save className="w-4 h-4" /> Simpan Tetapan
            </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
