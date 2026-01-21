
import React, { useState, useEffect } from 'react';
import { RegistrationsMap, EventConfig } from './types';
import { loadAllData, getEventConfig } from './services/api';
import RegistrationForm from './components/RegistrationForm';
import UpdateRegistration from './components/UpdateRegistration';
import Dashboard from './components/Dashboard/Dashboard';
import Announcements from './components/Announcements';
import Documents from './components/Documents';
import SetupModal from './components/SetupModal';

function App() {
  const [activeTab, setActiveTab] = useState('pendaftaran');
  const [subTab, setSubTab] = useState('daftar-baru');
  const [registrations, setRegistrations] = useState<RegistrationsMap>({});
  const [showSetup, setShowSetup] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);
  const [eventConfig, setEventConfig] = useState<EventConfig>(getEventConfig());
  const [loading, setLoading] = useState(true);

  const handleSync = async () => {
    setLoading(true);
    try {
        const result = await loadAllData();
        if (result.config) {
            setEventConfig(result.config);
            document.title = result.config.eventName;
        }
        if (result.registrations) {
            setRegistrations(result.registrations);
            showNotif("Data berjaya dikemaskini!", "success");
        } else if (result.error) {
            showNotif(result.error, "error");
        }
    } catch (error: any) {
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
      setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenSetup = () => {
      const password = prompt("Masukkan kata laluan untuk akses setup:");
      if (password === "kamuscatur") setShowSetup(true);
      else if (password !== null) alert("Kata laluan salah!");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center border-b-4 border-orange-600">
        <h1 className="text-3xl md:text-4xl font-extrabold text-orange-600">{eventConfig.eventName}</h1>
        <p className="text-gray-500 mt-2 font-medium">📍 {eventConfig.eventVenue} • Sistem Pendaftaran & Maklumat Rasmi</p>
      </header>

      <nav className="bg-white rounded-2xl shadow-sm p-2 mb-8 sticky top-4 z-40 border border-gray-100">
        <div className="flex flex-wrap gap-2 justify-center">
            {['pendaftaran', 'dashboard', 'pengumuman', 'dokumen'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all capitalize ${
                        activeTab === tab 
                        ? 'bg-orange-600 text-white shadow-lg' 
                        : 'text-gray-500 hover:bg-orange-50'
                    }`}
                >
                    {tab === 'dashboard' ? '📊 Dashboard' : 
                     tab === 'pendaftaran' ? '📝 Pendaftaran' : 
                     tab === 'pengumuman' ? '📢 Jadual' : '📄 Dokumen'}
                </button>
            ))}
        </div>
      </nav>

      {notification && (
          <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold animate-bounce ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {notification.msg}
          </div>
      )}

      <main>
        {loading && (
            <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
        {!loading && (
            <div className="animate-fadeIn">
                {activeTab === 'pendaftaran' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10">
                        <div className="flex gap-4 mb-8">
                            <button onClick={() => setSubTab('daftar-baru')} className={`px-4 py-2 font-bold rounded-lg transition-all ${subTab === 'daftar-baru' ? 'bg-orange-100 text-orange-600' : 'text-gray-400'}`}>➕ Baru</button>
                            <button onClick={() => setSubTab('kemaskini')} className={`px-4 py-2 font-bold rounded-lg transition-all ${subTab === 'kemaskini' ? 'bg-orange-100 text-orange-600' : 'text-gray-400'}`}>✏️ Kemaskini</button>
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

      <SetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
    </div>
  );
}

export default App;
