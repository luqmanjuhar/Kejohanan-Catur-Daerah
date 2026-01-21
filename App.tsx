
import React, { useState, useEffect } from 'react';
import { RegistrationsMap, EventConfig } from './types';
import { loadAllData, getDistrictKey, resetLocalConfig } from './services/api';
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
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setConnectionError(null);
    try {
        const result = await loadAllData();
        
        if (result.error) {
            setConnectionError(result.error);
            showNotif(result.error, "error");
        } else {
            if (result.config) {
                setEventConfig(result.config);
                document.title = result.config.eventName;
            }
            if (result.registrations) {
                setRegistrations(result.registrations);
            }
            showNotif("Sambungan Cloud Berjaya!", "success");
        }
    } catch (error: any) {
        setConnectionError("Gagal menyambung ke pelayan API Google.");
        showNotif("Ralat sambungan API.", "error");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    handleSync();
  }, []);

  const showNotif = (msg: string, type: 'success' | 'error') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenSetup = () => {
      const password = prompt("Masukkan kata laluan untuk akses setup:");
      if (password === "kamuscatur") setShowSetup(true);
      else if (password !== null) alert("Kata laluan salah!");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl min-h-screen flex flex-col">
      <header className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center border-b-4 border-orange-600 relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-2 h-full bg-orange-600"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-orange-600 tracking-tight relative z-10">
            {eventConfig.eventName}
        </h1>
        <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 mt-3 text-gray-500 font-medium relative z-10">
            <span className="bg-orange-100 text-orange-700 px-3 py-0.5 rounded-full text-sm">📍 {eventConfig.eventVenue}</span>
            <span className="hidden md:inline text-gray-300">|</span>
            <span className="text-sm">Sistem Pendaftaran & Maklumat Rasmi Daerah</span>
        </div>
      </header>

      <nav className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm p-2 mb-8 sticky top-4 z-40 border border-white/50 shrink-0">
        <div className="flex flex-wrap gap-1 justify-center">
            <NavButton active={activeTab === 'pendaftaran'} onClick={() => setActiveTab('pendaftaran')}>📝 Pendaftaran</NavButton>
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</NavButton>
            <NavButton active={activeTab === 'pengumuman'} onClick={() => setActiveTab('pengumuman')}>📢 Jadual</NavButton>
            <NavButton active={activeTab === 'dokumen'} onClick={() => setActiveTab('dokumen')}>📄 Dokumen</NavButton>
        </div>
      </nav>

      {notification && (
          <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold animate-slideUp max-w-sm flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              <div className="bg-white/20 p-2 rounded-full">
                  {notification.type === 'success' ? '✅' : '❌'}
              </div>
              {notification.msg}
          </div>
      )}

      <main className="flex-1">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-orange-600 font-bold">Menghubungkan ke Pangkalan Data Cloud...</p>
            </div>
        ) : connectionError ? (
            <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-10 text-center animate-fadeIn max-w-2xl mx-auto">
                <div className="text-5xl mb-4">🔌</div>
                <h2 className="text-2xl font-bold text-red-800 mb-2">Gagal Menghubungkan Data</h2>
                <p className="text-red-600 mb-6 font-medium">{connectionError}</p>
                <div className="flex flex-wrap gap-3 justify-center">
                    <button onClick={handleSync} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all">
                        Cuba Lagi
                    </button>
                    <button onClick={resetLocalConfig} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all">
                        Reset Cache Sistem
                    </button>
                </div>
                <div className="mt-8 text-left bg-white p-4 rounded-xl border text-xs text-gray-500 space-y-2">
                    <p className="font-bold text-gray-700 uppercase">Panduan Penyelesaian:</p>
                    <p>1. Pastikan Google Apps Script dideploy sebagai <b>"Anyone"</b>.</p>
                    <p>2. Pastikan anda telah klik <b>"Allow"</b> pada Authorization Google.</p>
                    <p>3. Pastikan Spreadsheet ID <b>{getDistrictKey().toUpperCase()}</b> adalah betul.</p>
                </div>
            </div>
        ) : (
            <div className="animate-fadeIn">
                {activeTab === 'pendaftaran' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10">
                        <div className="flex items-center gap-2 mb-8 bg-gray-50 p-1.5 rounded-2xl w-fit">
                            <button onClick={() => setSubTab('daftar-baru')} className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${subTab === 'daftar-baru' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-orange-400'}`}>➕ Baru</button>
                            <button onClick={() => setSubTab('kemaskini')} className={`px-6 py-2.5 rounded-xl font-bold transition-all text-sm ${subTab === 'kemaskini' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-orange-400'}`}>✏️ Kemaskini</button>
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
            </div>
        )}
      </main>

      <footer className="mt-12 mb-8 text-center shrink-0">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6"></div>
          <p className="text-gray-400 text-sm font-medium italic">♟️ "Satukan Pemain, Gilap Bakat, Ukir Kejayaan" 🏆</p>
          <div className="mt-2 text-xs text-gray-300 font-bold uppercase tracking-widest">© {new Date().getFullYear()} MSSD {getDistrictKey().toUpperCase()}</div>
          <button onClick={handleOpenSetup} className="mt-6 text-gray-200 hover:text-orange-400 transition-colors text-[10px] font-bold uppercase">⚙️ Konfigurasi Sistem</button>
      </footer>

      <SetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} currentConfig={eventConfig} />
    </div>
  );
}

const NavButton = ({ active, children, onClick }: any) => (
    <button onClick={onClick} className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm md:text-base ${active ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-500 hover:bg-orange-50 hover:text-orange-600'}`}>
        {children}
    </button>
);

export default App;
