
import React, { useState, useEffect } from 'react';
import { RegistrationsMap, EventConfig } from './types';
import { loadAllData, getDistrictKey } from './services/api';
import RegistrationForm from './components/RegistrationForm';
import UpdateRegistration from './components/UpdateRegistration';
import Dashboard from './components/Dashboard/Dashboard';
import Announcements from './components/Announcements';
import Documents from './components/Documents';
import SetupModal from './components/SetupModal';

const DEFAULT_SCHEDULE = [{ date: "HARI PERTAMA", items: [{ time: "8.00 pagi", activity: "Pendaftaran" }] }];
const INITIAL_CONFIG: EventConfig = {
  eventName: "KEJOHANAN CATUR MSSD PASIR GUDANG",
  eventVenue: "Lokasi Acara",
  adminPhone: "60123456789",
  schedules: { primary: DEFAULT_SCHEDULE, secondary: DEFAULT_SCHEDULE },
  links: { rules: "#", results: "#", photos: "#" },
  documents: { invitation: "#", meeting: "#", arbiter: "#" }
};

function App() {
  const [activeTab, setActiveTab] = useState('pendaftaran');
  const [subTab, setSubTab] = useState('daftar-baru');
  const [registrations, setRegistrations] = useState<RegistrationsMap>({});
  const [showSetup, setShowSetup] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);
  const [eventConfig, setEventConfig] = useState<EventConfig>(INITIAL_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleSync();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
        const result = await loadAllData();
        if (result.registrations) setRegistrations(result.registrations);
        if (result.config) {
            setEventConfig(result.config);
            document.title = result.config.eventName;
        }
        if (result.error) showNotif(result.error, "error");
        else showNotif("Data Berjaya Disegerakkan!", "success");
    } catch (error: any) {
        showNotif("Gagal menyegerak data cloud.", "error");
    } finally {
        setLoading(false);
    }
  };

  const showNotif = (msg: string, type: 'success' | 'error') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenSetup = () => {
      const password = prompt("Masukkan kata laluan untuk akses setup:");
      if (password === "kamuscatur") setShowSetup(true);
      else if (password !== null) alert("Kata laluan salah!");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center border-b-4 border-orange-600 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-orange-600"></div>
        <h1 className="text-4xl font-extrabold text-orange-600 tracking-tight">
            {eventConfig.eventName}
        </h1>
        <p className="text-gray-400 font-medium mt-3 text-lg">
            Sistem Pendaftaran & Maklumat Rasmi
        </p>
      </header>

      <nav className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-3 mb-8 sticky top-4 z-40 border border-white/50">
        <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => setActiveTab('pendaftaran')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'pendaftaran' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:bg-orange-50'}`}>
                📝 Pendaftaran
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:bg-orange-50'}`}>
                📊 Dashboard
            </button>
            <button onClick={() => setActiveTab('pengumuman')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'pengumuman' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:bg-orange-50'}`}>
                📢 Pengumuman
            </button>
            <button onClick={() => setActiveTab('dokumen')} className={`px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'dokumen' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:bg-orange-50'}`}>
                📄 Dokumen
            </button>
        </div>
      </nav>

      {notification && (
          <div className={`fixed bottom-8 right-8 z-50 px-6 py-3 rounded-xl shadow-2xl text-white font-bold animate-slideUp max-w-sm ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {notification.msg}
          </div>
      )}

      <main className={loading ? 'opacity-50 pointer-events-none' : ''}>
        {activeTab === 'pendaftaran' && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 animate-fadeIn">
                <div className="flex gap-4 mb-8">
                    <button onClick={() => setSubTab('daftar-baru')} className={`px-5 py-2 rounded-lg font-bold transition-all ${subTab === 'daftar-baru' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-orange-500'}`}>➕ Daftar Baru</button>
                    <button onClick={() => setSubTab('kemaskini')} className={`px-5 py-2 rounded-lg font-bold transition-all ${subTab === 'kemaskini' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:text-orange-500'}`}>✏️ Kemaskini</button>
                </div>
                {subTab === 'daftar-baru' ? 
                  <RegistrationForm registrations={registrations} onSuccess={(id, d) => { setRegistrations({...registrations, [id]: d}); showNotif(`Pendaftaran Berjaya: ${id}`, 'success'); }} eventConfig={eventConfig} /> : 
                  <UpdateRegistration localRegistrations={registrations} onUpdateSuccess={() => handleSync()} eventConfig={eventConfig} />
                }
            </div>
        )}

        {activeTab === 'dashboard' && <Dashboard registrations={registrations} onRefresh={handleSync} onOpenSetup={handleOpenSetup} />}
        {activeTab === 'pengumuman' && <Announcements config={eventConfig} />}
        {activeTab === 'dokumen' && <Documents config={eventConfig} />}
      </main>

      <footer className="mt-12 mb-8 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Kejohanan Catur MSSD {getDistrictKey().toUpperCase()}</p>
          <button onClick={handleOpenSetup} className="mt-4 text-gray-300 hover:text-orange-400 transition-colors">⚙️ Konfigurasi Sistem</button>
      </footer>

      <SetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} currentConfig={eventConfig} />
    </div>
  );
}

export default App;
