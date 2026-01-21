
import React, { useState, useEffect } from 'react';
import { RegistrationsMap, EventConfig } from './types';
import { loadRegistrations, getEventConfig } from './services/api';
import RegistrationForm from './components/RegistrationForm';
import UpdateRegistration from './components/UpdateRegistration';
import Dashboard from './components/Dashboard/Dashboard';
import Announcements from './components/Announcements';
import Documents from './components/Documents';
import SetupModal from './components/SetupModal';

function App() {
  const [activeTab, setActiveTab] = useState('pendaftaran');
  const [subTab, setSubTab] = useState('daftar-baru'); // 'daftar-baru' or 'kemaskini'
  const [registrations, setRegistrations] = useState<RegistrationsMap>({});
  const [showSetup, setShowSetup] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);
  const [eventConfig, setEventConfig] = useState<EventConfig>(getEventConfig());

  // Load initial data and set Title
  useEffect(() => {
    // 1. Load LocalStorage Data
    const local = localStorage.getItem('registrations');
    if (local) {
        try {
            setRegistrations(JSON.parse(local));
        } catch(e) { console.error(e); }
    }

    // 2. Load Config (Detected from Domain)
    const config = getEventConfig();
    setEventConfig(config);
    
    // Update Browser Title
    document.title = config.eventName || "Sistem Pendaftaran Catur MSSD";

    // 3. Sync from Cloud
    handleSync();
  }, []);

  const handleSync = async () => {
    try {
        const result = await loadRegistrations();
        if (result.registrations) {
            const merged = { ...registrations, ...result.registrations };
            setRegistrations(merged);
            localStorage.setItem('registrations', JSON.stringify(merged));
            showNotif("Data disegerakkan!", "success");
        } else if (result.error) {
            showNotif(result.error, "error");
        }
    } catch (error: any) {
        console.error("Sync failed", error);
        showNotif(error.message || "Gagal menyegerak data cloud.", "error");
    }
  };

  const showNotif = (msg: string, type: 'success' | 'error') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 5000);
  };

  const handleRegistrationSuccess = (regId: string, data: any) => {
      const newRegs = { ...registrations, [regId]: data };
      setRegistrations(newRegs);
      localStorage.setItem('registrations', JSON.stringify(newRegs));
      showNotif(`Pendaftaran Berjaya: ${regId}`, 'success');
  };

  const handleOpenSetup = () => {
      const password = prompt("Masukkan kata laluan untuk akses setup:");
      if (password === "kamuscatur") {
          setShowSetup(true);
      } else if (password !== null) {
          alert("Kata laluan salah! Akses ditolak.");
      }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <header className="bg-white rounded-lg shadow-lg p-6 mb-6 text-center">
        <h1 className="text-3xl font-bold text-orange-600">{eventConfig.eventName}</h1>
        <p className="text-gray-600 mt-2">Sistem Pendaftaran Kejohanan Catur Peringkat Daerah</p>
      </header>

      {/* Navigation */}
      <nav className="bg-white rounded-lg shadow-md p-4 mb-6 sticky top-2 z-30">
        <div className="flex flex-wrap gap-3 justify-center">
            {['pendaftaran', 'dashboard', 'pengumuman', 'dokumen'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all capitalize ${
                        activeTab === tab 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    {tab === 'dashboard' ? '📊 Dashboard' : 
                     tab === 'pendaftaran' ? '📝 Pendaftaran' : 
                     tab === 'pengumuman' ? '📢 Pengumuman' : '📄 Dokumen'}
                </button>
            ))}
        </div>
      </nav>

      {/* Notifications */}
      {notification && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded shadow-lg text-white font-medium max-w-sm transition-all animate-in slide-in-from-right ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {notification.msg}
          </div>
      )}

      {/* Content */}
      <main>
        {activeTab === 'pendaftaran' && (
            <div className="bg-white rounded-lg shadow-lg p-6 animate-fadeIn">
                <div className="flex gap-4 mb-6 border-b border-gray-200">
                    <button 
                        onClick={() => setSubTab('daftar-baru')}
                        className={`px-4 py-2 font-semibold border-b-2 transition-colors ${subTab === 'daftar-baru' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}
                    >
                        ➕ Daftar Baru
                    </button>
                    <button 
                        onClick={() => setSubTab('kemaskini')}
                        className={`px-4 py-2 font-semibold border-b-2 transition-colors ${subTab === 'kemaskini' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500'}`}
                    >
                        ✏️ Kemaskini
                    </button>
                </div>

                {subTab === 'daftar-baru' ? (
                    <RegistrationForm 
                        registrations={registrations} 
                        onSuccess={handleRegistrationSuccess}
                        eventConfig={eventConfig} 
                    />
                ) : (
                    <UpdateRegistration 
                        localRegistrations={registrations}
                        onUpdateSuccess={(id) => {
                            showNotif(`Kemaskini ${id} Berjaya`, 'success');
                            handleSync(); // re-sync to be sure
                        }}
                        eventConfig={eventConfig}
                    />
                )}
            </div>
        )}

        {activeTab === 'dashboard' && (
            <Dashboard 
                registrations={registrations} 
                onRefresh={handleSync}
                onOpenSetup={handleOpenSetup}
            />
        )}

        {activeTab === 'pengumuman' && <Announcements config={eventConfig} />}
        
        {activeTab === 'dokumen' && <Documents config={eventConfig} />}
      </main>

      <SetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
    </div>
  );
}

export default App;
