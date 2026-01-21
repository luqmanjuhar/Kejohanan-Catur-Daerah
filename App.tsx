
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
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-7xl flex-1">
        <header className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6 md:mb-8 text-center border-b-4 border-orange-600">
          <h1 className="text-xl md:text-4xl font-extrabold text-orange-600 uppercase tracking-tighter leading-tight">{eventConfig.eventName}</h1>
          <p className="text-gray-500 mt-2 font-black italic uppercase text-[10px] md:text-xs tracking-widest opacity-70">📍 {eventConfig.eventVenue} • Pasir Gudang Cloud Hub</p>
        </header>

        {/* Navigation - Enhanced for Mobile Sync */}
        <nav className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg p-2 mb-8 sticky top-2 z-[40] border border-white/50">
          <div className="flex flex-row md:flex-row gap-1.5 md:gap-2 justify-between md:justify-center overflow-x-auto no-scrollbar pb-0.5">
              {[
                  { id: 'pendaftaran', label: '📝 Daftar' },
                  { id: 'dashboard', label: '📊 Status' },
                  { id: 'pengumuman', label: '📢 Jadual' },
                  { id: 'dokumen', label: '📄 Info' }
              ].map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 md:flex-none min-w-[85px] md:min-w-[150px] px-2 md:px-6 py-3.5 rounded-xl font-black transition-all text-[11px] md:text-sm capitalize whitespace-nowrap active:scale-90 touch-none ${
                          activeTab === tab.id 
                          ? 'bg-orange-600 text-white shadow-md' 
                          : 'bg-white text-gray-500 hover:bg-orange-50'
                      }`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>
        </nav>

        {notification && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl text-white font-black animate-slideUp flex items-center gap-3 w-[90%] md:w-auto text-sm" style={{ backgroundColor: notification.type === 'success' ? '#059669' : '#dc2626' }}>
                {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
            </div>
        )}

        <main className="relative z-10 pb-10">
          {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 animate-pulse">
                  <div className="w-14 h-14 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <p className="text-orange-600 font-black uppercase text-[10px] tracking-[0.3em]">Menyambung Ke Awan...</p>
              </div>
          ) : apiError ? (
              <div className="bg-white rounded-[2rem] p-8 md:p-12 text-center border-2 border-red-100 max-w-2xl mx-auto shadow-2xl animate-fadeIn">
                  <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="text-red-500" size={32}/>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 tracking-tight">Cloud Tidak Tersambung</h2>
                  <p className="text-gray-500 font-bold mb-8 text-sm md:text-base leading-relaxed">
                      Sila pastikan Web App anda di-deploy sebagai <b>'Anyone'</b>.<br/>
                      <span className="text-red-500 text-xs font-mono mt-2 block opacity-70">Error: {apiError}</span>
                  </p>
                  <div className="flex flex-col gap-3">
                      <button onClick={handleSync} className="bg-gray-800 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Segerak Semula</button>
                      <button onClick={handleOpenSetup} className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Periksa Kredensial</button>
                  </div>
              </div>
          ) : (
              <div className="animate-fadeIn">
                  {activeTab === 'pendaftaran' && (
                      <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] shadow-sm border border-white p-2 md:p-10">
                          <div className="flex gap-2 p-2 mb-4 bg-gray-100/50 rounded-2xl">
                              <button onClick={() => setSubTab('daftar-baru')} className={`flex-1 py-3.5 font-black rounded-xl transition-all active:scale-95 text-xs uppercase tracking-wider ${subTab === 'daftar-baru' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Baru</button>
                              <button onClick={() => setSubTab('kemaskini')} className={`flex-1 py-3.5 font-black rounded-xl transition-all active:scale-95 text-xs uppercase tracking-wider ${subTab === 'kemaskini' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400'}`}>Edit</button>
                          </div>
                          <div className="bg-white rounded-3xl p-4 md:p-8 shadow-sm">
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
                      </div>
                  )}
                  {activeTab === 'dashboard' && <Dashboard registrations={registrations} onRefresh={handleSync} onOpenSetup={handleOpenSetup} />}
                  {activeTab === 'pengumuman' && <Announcements config={eventConfig} />}
                  {activeTab === 'dokumen' && <Documents config={eventConfig} />}
              </div>
          )}
        </main>
      </div>

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
