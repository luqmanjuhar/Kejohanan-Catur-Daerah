
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { RegistrationsMap, EventConfig, Teacher, Student } from './types';
import { loadAllData, getEventConfig } from './services/api';
import RegistrationForm from './components/RegistrationForm';
import UpdateRegistration from './components/UpdateRegistration';
import Dashboard from './components/Dashboard/Dashboard';
import Announcements from './components/Announcements';
import Documents from './components/Documents';
import SetupModal from './components/SetupModal';
import SuccessPopup from './components/SuccessPopup';

function App() {
  const [activeTab, setActiveTab] = useState('pendaftaran');
  const [subTab, setSubTab] = useState('daftar-baru');
  const [registrations, setRegistrations] = useState<RegistrationsMap>({});
  const [showSetup, setShowSetup] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: string} | null>(null);
  const [eventConfig, setEventConfig] = useState<EventConfig>(getEventConfig());
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Persistence State for Registration Form
  const [draftRegistration, setDraftRegistration] = useState<{
    schoolName: string;
    schoolType: string;
    teachers: Teacher[];
    students: Student[];
  }>({
    schoolName: '',
    schoolType: '',
    teachers: [{ name: '', email: '', phone: '', position: 'Ketua' }],
    students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }]
  });

  // Success Popup State
  const [successData, setSuccessData] = useState<{ isOpen: boolean; regId: string; schoolName: string }>({
    isOpen: false,
    regId: '',
    schoolName: ''
  });

  const handleSync = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
        const result = await loadAllData();
        if (result.config) {
            setEventConfig(result.config);
            document.title = result.config.eventName;
        }
        if (result.registrations) {
            setRegistrations(result.registrations);
            showNotif("Data Cloud berjaya disegerakkan!", "success");
        } else if (result.error) {
            setApiError(result.error);
            showNotif(result.error, "error");
        }
    } catch (error) {
        setApiError("Ralat sambungan API yang serius.");
        showNotif("Ralat sambungan API.", "error");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    handleSync();
  }, []);

  const showNotif = (msg: string, type: 'success' | 'error') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 4000);
  };

  const handleRegistrationSuccess = (regId: string, data: any) => {
    setRegistrations({...registrations, [regId]: data});
    setDraftRegistration({
        schoolName: '',
        schoolType: '',
        teachers: [{ name: '', email: '', phone: '', position: 'Ketua' }],
        students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }]
    });
    setSuccessData({
        isOpen: true,
        regId: regId,
        schoolName: data.schoolName
    });
  };

  const handleOpenSetup = () => {
      const password = prompt("Masukkan kata laluan setup:");
      if (password === "kamuscatur") setShowSetup(true);
      else if (password !== null) alert("Akses ditolak!");
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl relative">
      <header className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6 md:mb-8 text-center border-b-4 border-orange-600">
        <h1 className="text-xl md:text-4xl font-extrabold text-orange-600 uppercase tracking-tighter leading-tight">{eventConfig.eventName}</h1>
        <p className="text-gray-500 mt-2 font-black italic uppercase text-[10px] md:text-xs tracking-widest opacity-70">📍 {eventConfig.eventVenue} • Pasir Gudang Cloud Hub</p>
      </header>

      {/* Navigasi Responsif: Grid pada mobile, Flex pada desktop */}
      <nav className="bg-white/90 backdrop-blur-md rounded-2xl shadow-md p-2 mb-8 sticky top-2 md:top-4 z-40 border border-white/50">
        <div className="grid grid-cols-2 md:flex md:flex-row gap-2 justify-center">
            {[
                { id: 'pendaftaran', label: '📝 Pendaftaran' },
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'pengumuman', label: '📢 Jadual' },
                { id: 'dokumen', label: '📄 Dokumen' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 md:px-6 py-3 rounded-xl font-bold transition-all text-sm md:text-base capitalize whitespace-nowrap shadow-sm active:scale-95 ${
                        activeTab === tab.id 
                        ? 'bg-orange-600 text-white shadow-orange-200' 
                        : 'bg-white text-gray-500 hover:bg-orange-50'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </nav>

      {notification && (
          <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:right-8 md:left-auto z-[100] px-6 py-4 rounded-2xl shadow-2xl text-white font-bold animate-slideUp flex items-center justify-center text-center text-sm md:text-base bg-opacity-95 backdrop-blur-sm" style={{ backgroundColor: notification.type === 'success' ? '#16a34a' : '#dc2626' }}>
              {notification.msg}
          </div>
      )}

      <main className="relative z-10">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-orange-600 font-black animate-pulse uppercase text-xs tracking-widest">Menghubungi Cloud...</p>
            </div>
        ) : apiError ? (
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-12 text-center border-4 border-dashed border-red-100 max-w-2xl mx-auto shadow-2xl shadow-red-50 animate-fadeIn">
                <div className="bg-red-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="text-red-500" size={32}/>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 tracking-tight">Ralat Sambungan Cloud</h2>
                <p className="text-gray-500 font-bold mb-8 leading-relaxed text-sm md:text-base">
                    Aplikasi gagal berkomunikasi dengan Google Apps Script anda.<br/>
                    <span className="text-red-500 text-xs mt-2 block italic">"{apiError}"</span>
                </p>
                <div className="flex flex-col gap-3">
                    <button onClick={handleSync} className="bg-gray-800 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all active:scale-95">Cuba Segerak Lagi</button>
                    <button onClick={handleOpenSetup} className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all active:scale-95">Masuk Setup & Periksa URL</button>
                </div>
            </div>
        ) : (
            <div className="animate-fadeIn">
                {activeTab === 'pendaftaran' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-10">
                        <div className="flex gap-2 md:gap-4 mb-6 md:mb-8">
                            <button onClick={() => setSubTab('daftar-baru')} className={`flex-1 md:flex-none px-5 py-3 font-bold rounded-xl transition-all active:scale-95 ${subTab === 'daftar-baru' ? 'bg-orange-100 text-orange-600 shadow-inner' : 'text-gray-400'}`}>➕ Baru</button>
                            <button onClick={() => setSubTab('kemaskini')} className={`flex-1 md:flex-none px-5 py-3 font-bold rounded-xl transition-all active:scale-95 ${subTab === 'kemaskini' ? 'bg-orange-100 text-orange-600 shadow-inner' : 'text-gray-400'}`}>✏️ Kemaskini</button>
                        </div>
                        {subTab === 'daftar-baru' ? 
                          <RegistrationForm 
                            registrations={registrations} 
                            onSuccess={handleRegistrationSuccess} 
                            eventConfig={eventConfig} 
                            draft={draftRegistration}
                            onDraftChange={setDraftRegistration}
                          /> : 
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

      {/* Modals & Popups */}
      <SetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
      <SuccessPopup 
        isOpen={successData.isOpen} 
        onClose={() => setSuccessData({ ...successData, isOpen: false })} 
        regId={successData.regId} 
        schoolName={successData.schoolName}
      />
    </div>
  );
}

export default App;
