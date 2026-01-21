
import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Check } from 'lucide-react';
import { saveConfig, getSpreadsheetId, getScriptUrl } from '../services/api';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ isOpen, onClose }) => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetId(getSpreadsheetId());
      setWebAppUrl(getScriptUrl());
    }
  }, [isOpen]);

  const handleSave = () => {
    saveConfig(spreadsheetId, webAppUrl);
    onClose();
    window.location.reload(); 
  };

  const getScriptContent = () => {
    return `/**
 * MSSD Catur - Pasir Gudang Edition 2026
 * Backend for dynamic sheets: INFO, JADUAL, PAUTAN, DOKUMEN
 */

function doGet(e) {
  const action = e.parameter.action;
  const ssId = e.parameter.spreadsheetId;
  const callback = e.parameter.callback;
  
  try {
    const ss = SpreadsheetApp.openById(ssId);
    let result = {};
    
    if (action === 'loadAll') {
      result = {
        config: fetchRemoteConfig(ss),
        registrations: fetchRegistrations(ss)
      };
    } else if (action === 'search') {
      result = searchRegistration(ss, e.parameter.regId, e.parameter.password);
    }
    
    const output = callback + '(' + JSON.stringify(result) + ')';
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (err) {
    const errorOutput = callback + '(' + JSON.stringify({ error: err.toString() }) + ')';
    return ContentService.createTextOutput(errorOutput).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(data.spreadsheetId);
  
  if (data.action === 'submit' || data.action === 'update') {
    return saveRegistration(ss, data);
  }
}

function fetchRemoteConfig(ss) {
  const infoSheet = ss.getSheetByName('INFO') || ss.insertSheet('INFO');
  const infoData = infoSheet.getRange('A2:C2').getValues()[0];
  
  const pautanSheet = ss.getSheetByName('PAUTAN') || ss.insertSheet('PAUTAN');
  const pautanData = pautanSheet.getRange('A2:C2').getValues()[0];
  
  const docSheet = ss.getSheetByName('DOKUMEN') || ss.insertSheet('DOKUMEN');
  const docData = docSheet.getRange('A2:C2').getValues()[0];
  
  const jadualSheet = ss.getSheetByName('JADUAL') || ss.insertSheet('JADUAL');
  const jadualData = jadualSheet.getDataRange().getValues();
  
  const schedules = { primary: [], secondary: [] };
  
  for (let i = 1; i < jadualData.length; i++) {
    const [cat, day, time, act] = jadualData[i];
    const target = cat.toLowerCase().includes('rendah') ? 'primary' : 'secondary';
    let dayObj = schedules[target].find(d => d.date === day);
    if (!dayObj) {
      dayObj = { date: day, items: [] };
      schedules[target].push(dayObj);
    }
    dayObj.items.push({ time, activity: act });
  }

  return {
    eventName: infoData[0] || "KEJOHANAN CATUR MSSD PASIR GUDANG",
    eventVenue: infoData[1] || "DEWAN SEKOLAH",
    adminPhone: infoData[2] || "60123456789",
    schedules: schedules,
    links: { rules: pautanData[0] || "#", results: pautanData[1] || "#", photos: pautanData[2] || "#" },
    documents: { invitation: docData[0] || "#", meeting: docData[1] || "#", arbiter: docData[2] || "#" }
  };
}

function fetchRegistrations(ss) {
  const schoolSheet = ss.getSheetByName('SEKOLAH') || ss.insertSheet('SEKOLAH');
  const teacherSheet = ss.getSheetByName('GURU') || ss.insertSheet('GURU');
  const studentSheet = ss.getSheetByName('PELAJAR') || ss.insertSheet('PELAJAR');
  
  const schoolData = schoolSheet.getDataRange().getValues();
  const teacherData = teacherSheet.getDataRange().getValues();
  const studentData = studentSheet.getDataRange().getValues();
  
  const registrations = {};
  for (let i = 1; i < schoolData.length; i++) {
    const id = schoolData[i][0];
    registrations[id] = { schoolName: schoolData[i][1], schoolType: schoolData[i][2], teachers: [], students: [], createdAt: schoolData[i][10], status: schoolData[i][12] };
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
  const schoolSheet = ss.getSheetByName('SEKOLAH');
  const teacherSheet = ss.getSheetByName('GURU');
  const studentSheet = ss.getSheetByName('PELAJAR');
  const id = data.registrationId;

  // Delete existing
  [schoolSheet, teacherSheet, studentSheet].forEach(sheet => {
    const vals = sheet.getDataRange().getValues();
    for (let i = vals.length - 1; i >= 1; i--) if (vals[i][0] === id) sheet.deleteRow(i + 1);
  });

  // Append New
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
  if (last4 === pass) return { found: true, registration: found };
  return { found: false, error: "Kata laluan salah." };
}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 bg-orange-600 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold">⚙️ Konfigurasi Cloud Pasir Gudang</h2>
            <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="p-8 space-y-6">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Spreadsheet ID</label>
                <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-orange-500 outline-none" />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Script Web App URL</label>
                <input type="text" value={webAppUrl} onChange={(e) => setWebAppUrl(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-orange-500 outline-none" placeholder="https://script.google.com/..." />
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-400">GOOGLE APPS SCRIPT (AUTO-CONFIG)</span>
                    <button onClick={() => { navigator.clipboard.writeText(getScriptContent()); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-orange-600 font-bold text-xs flex items-center gap-1">
                        {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'TELAH DISALIN' : 'SALIN KOD'}
                    </button>
                </div>
                <div className="text-[10px] font-mono text-gray-400 max-h-32 overflow-y-auto">
                    Salin kod ini dan tampal di Editor Google Apps Script anda untuk menyokong tab INFO, JADUAL, PAUTAN, dan DOKUMEN.
                </div>
            </div>
        </div>
        <div className="p-6 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 font-bold text-gray-400">BATAL</button>
            <button onClick={handleSave} className="px-8 py-2 bg-orange-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
                <Save size={18} /> SIMPAN TETAPAN
            </button>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;
