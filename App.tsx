
import React, { useState, useEffect } from 'react';
// Fix: Import AlertCircle from lucide-react
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <header className="bg-white rounded-2xl shadow-sm p-8 mb-8 text-center border-b-4 border-orange-600">
        <h1 className="text-3xl md:text-4xl font-extrabold text-orange-600 uppercase tracking-tighter">{eventConfig.eventName}</h1>
        <p className="text-gray-500 mt-2 font-black italic uppercase text-xs tracking-widest opacity-70">📍 {eventConfig.eventVenue} • Pasir Gudang Cloud Hub</p>
      </header>

      <nav className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-2 mb-8 sticky top-4 z-40 border border-white/50">
        <div className="flex flex-wrap gap-2 justify-center">
            {[
                { id: 'pendaftaran', label: '📝 Pendaftaran' },
                { id: 'dashboard', label: '📊 Dashboard' },
                { id: 'pengumuman', label: '📢 Jadual' },
                { id: 'dokumen', label: '📄 Dokumen' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all capitalize ${
                        activeTab === tab.id 
                        ? 'bg-orange-600 text-white shadow-lg' 
                        : 'text-gray-500 hover:bg-orange-50'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </nav>

      {notification && (
          <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold animate-slideUp ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
              {notification.msg}
          </div>
      )}

      <main>
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-orange-600 font-black animate-pulse uppercase text-xs tracking-widest">Menghubungi Cloud Pasir Gudang...</p>
            </div>
        ) : apiError ? (
            <div className="bg-white rounded-[2.5rem] p-12 text-center border-4 border-dashed border-red-100 max-w-2xl mx-auto shadow-2xl shadow-red-50 animate-fadeIn">
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="text-red-500" size={40}/>
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-4 tracking-tight">Ralat Sambungan Cloud</h2>
                <p className="text-gray-500 font-bold mb-8 leading-relaxed">
                    Aplikasi gagal berkomunikasi dengan Google Apps Script anda.<br/>
                    <span className="text-red-500 text-sm mt-2 block italic">"{apiError}"</span>
                </p>
                <div className="flex flex-col gap-3">
                    <button onClick={handleSync} className="bg-gray-800 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">Cuba Segerak Lagi</button>
                    <button onClick={handleOpenSetup} className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-700 transition-all">Masuk Setup & Periksa URL</button>
                </div>
            </div>
        ) : (
            <div className="animate-fadeIn">
                {activeTab === 'pendaftaran' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10">
                        <div className="flex gap-4 mb-8">
                            <button onClick={() => setSubTab('daftar-baru')} className={`px-5 py-2 font-bold rounded-xl transition-all ${subTab === 'daftar-baru' ? 'bg-orange-100 text-orange-600' : 'text-gray-400'}`}>➕ Baru</button>
                            <button onClick={() => setSubTab('kemaskini')} className={`px-5 py-2 font-bold rounded-xl transition-all ${subTab === 'kemaskini' ? 'bg-orange-100 text-orange-600' : 'text-gray-400'}`}>✏️ Kemaskini</button>
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
