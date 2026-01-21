
import React, { useState } from 'react';
import { Search, Save, X, Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { searchRemoteRegistration, syncRegistration } from '../services/api';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, sendWhatsAppNotification, isValidEmail, isValidMalaysianPhone } from '../utils/formatters';

interface UpdateRegistrationProps {
  localRegistrations: RegistrationsMap;
  onUpdateSuccess: (regId: string) => void;
  eventConfig: EventConfig;
}

const UpdateRegistration: React.FC<UpdateRegistrationProps> = ({ localRegistrations, onUpdateSuccess, eventConfig }) => {
  const [searchRegId, setSearchRegId] = useState('');
  const [searchPassword, setSearchPassword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editingReg, setEditingReg] = useState<{ id: string; data: any } | null>(null);
  const [formErrors, setFormErrors] = useState<{teachers: Record<number, string[]>, students: Record<number, string[]>}>({
    teachers: {},
    students: {}
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    setEditingReg(null);

    try {
        let found = localRegistrations[searchRegId];
        let isValid = false;

        if (found && found.teachers.length > 0) {
            const phone = found.teachers[0].phone.replace(/\D/g, '');
            const last4 = phone.slice(-4);
            if (last4 === searchPassword) isValid = true;
        }

        if (isValid) {
            setEditingReg({ id: searchRegId, data: JSON.parse(JSON.stringify(found)) });
            setIsSearching(false);
            return;
        }

        const remoteResult = await searchRemoteRegistration(searchRegId, searchPassword);
        if (remoteResult.found && remoteResult.registration) {
             setEditingReg({ id: searchRegId, data: remoteResult.registration });
        } else {
             setSearchError(remoteResult.error || "Pendaftaran tidak dijumpai atau kata laluan salah.");
        }

    } catch (err: any) {
        setSearchError(err.message || "Ralat mencari pendaftaran.");
    } finally {
        setIsSearching(false);
    }
  };

  const validateEditForm = (): boolean => {
    if (!editingReg) return false;
    const errors: any = { teachers: {}, students: {} };
    let hasError = false;

    editingReg.data.teachers.forEach((t: Teacher, i: number) => {
      const tErrors = [];
      if (!isValidEmail(t.email)) tErrors.push('Email tidak sah');
      if (!isValidMalaysianPhone(t.phone)) tErrors.push('No. Telefon tidak sah');
      if (tErrors.length > 0) {
        errors.teachers[i] = tErrors;
        hasError = true;
      }
    });

    setFormErrors(errors);
    return !hasError;
  };

  const cancelEdit = () => {
    setEditingReg(null);
    setSearchRegId('');
    setSearchPassword('');
    setFormErrors({ teachers: {}, students: {} });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;

    if (!validateEditForm()) {
      alert("Sila betulkan ralat format email atau no telefon.");
      return;
    }

    try {
        await syncRegistration(editingReg.id, editingReg.data, true);
        onUpdateSuccess(editingReg.id);
        sendWhatsAppNotification(editingReg.id, editingReg.data, 'update', eventConfig.adminPhone);
        setEditingReg(null);
        setSearchRegId('');
        setSearchPassword('');
    } catch (err) {
        alert("Gagal mengemaskini. Sila cuba lagi.");
    }
  };

  const updateData = (updater: (prev: any) => any) => {
    setEditingReg(prev => prev ? { ...prev, data: updater(prev.data) } : null);
  };

  if (editingReg) {
    const { data } = editingReg;
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-blue-800">Kemaskini: {editingReg.id}</h3>
                <button onClick={cancelEdit} className="text-gray-400 hover:text-red-500 transition-colors"><X /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        value={data.schoolName} 
                        onChange={e => updateData(d => ({...d, schoolName: formatSchoolName(e.target.value)}))}
                        className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none" placeholder="Nama Sekolah" required
                    />
                    <select 
                        value={data.schoolType}
                        onChange={e => {
                            const type = e.target.value;
                            updateData(d => {
                                const students = type === 'Sekolah Kebangsaan' 
                                    ? d.students.map((s: Student) => ({...s, category: 'Bawah 12 Tahun'}))
                                    : d.students;
                                return {...d, schoolType: type, students};
                            });
                        }}
                        className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none" required
                    >
                        <option value="Sekolah Kebangsaan">Sekolah Kebangsaan</option>
                        <option value="Sekolah Menengah">Sekolah Menengah</option>
                    </select>
                 </div>

                 <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">👨‍🏫 Maklumat Guru</h4>
                    {data.teachers.map((t: Teacher, i: number) => (
                        <div key={i} className="mb-4 grid md:grid-cols-3 gap-4 pb-4 border-b border-orange-200 last:border-0">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Nama Penuh</label>
                                <input 
                                    value={t.name}
                                    onChange={e => updateData(d => {
                                        const teachers = [...d.teachers];
                                        teachers[i].name = e.target.value.toUpperCase();
                                        return { ...d, teachers };
                                    })}
                                    className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-orange-300" placeholder="Nama" required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Email Rasmi</label>
                                <input 
                                    value={t.email}
                                    type="email"
                                    onChange={e => updateData(d => {
                                        const teachers = [...d.teachers];
                                        teachers[i].email = e.target.value;
                                        return { ...d, teachers };
                                    })}
                                    className={`p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-orange-300 ${formErrors.teachers[i]?.includes('Email tidak sah') ? 'border-red-500 bg-red-50' : ''}`} placeholder="Email" required
                                />
                                {formErrors.teachers[i]?.includes('Email tidak sah') && (
                                  <p className="text-red-500 text-[9px] mt-1 font-bold italic">Ralat format email</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">No. Telefon</label>
                                    <input 
                                        value={t.phone}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].phone = formatPhoneNumber(e.target.value);
                                            return { ...d, teachers };
                                        })}
                                        className={`p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-orange-300 ${formErrors.teachers[i]?.includes('No. Telefon tidak sah') ? 'border-red-500 bg-red-50' : ''}`} placeholder="Telefon" required
                                    />
                                    {formErrors.teachers[i]?.includes('No. Telefon tidak sah') && (
                                      <p className="text-red-500 text-[9px] mt-1 font-bold italic">No. Malaysia sahaja</p>
                                    )}
                                </div>
                                {i > 0 && (
                                    <div className="flex items-end">
                                        <button type="button" onClick={() => updateData(d => ({...d, teachers: d.teachers.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 mb-2 p-1 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => ({...d, teachers: [...d.teachers, {name:'', email:'', phone:'', position:'Pengiring'}]}))} className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition-colors flex items-center gap-1 mt-2 shadow-sm">
                        <Plus size={14} /> TAMBAH GURU PENGIRING
                    </button>
                 </div>

                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">👥 Maklumat Pelajar</h4>
                    {data.students.map((s: Student, i: number) => (
                        <div key={i} className="mb-4 border-b border-blue-200 pb-4 last:border-0">
                            <div className="grid md:grid-cols-2 gap-4 mb-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Nama Pelajar</label>
                                    <input 
                                        value={s.name}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].name = e.target.value.toUpperCase();
                                            return {...d, students};
                                        })}
                                        className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-300" placeholder="Nama" required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">No. IC (Penuh)</label>
                                        <input 
                                            value={s.ic}
                                            onChange={e => updateData(d => {
                                                const students = [...d.students];
                                                const formatted = formatIC(e.target.value);
                                                students[i].ic = formatted;
                                                
                                                // Automasi Jantina dari IC
                                                const digits = formatted.replace(/\D/g, '');
                                                if (digits.length === 12) {
                                                  const last = parseInt(digits.charAt(11));
                                                  students[i].gender = last % 2 === 0 ? 'Perempuan' : 'Lelaki';
                                                }
                                                
                                                if (students[i].category && students[i].gender) {
                                                  students[i].playerId = generatePlayerId(students[i].gender, d.schoolName, i, students[i].category, editingReg.id);
                                                }
                                                return {...d, students};
                                            })}
                                            className="p-2 border rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-300" placeholder="IC" required
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button type="button" onClick={() => updateData(d => ({...d, students: d.students.filter((_: any, idx: number) => idx !== i)}))} className="text-red-400 hover:text-red-600 mb-2 p-1 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-tighter">Bangsa</label>
                                    <select value={s.race} onChange={e => updateData(d => { const students = [...d.students]; students[i].race = e.target.value; return {...d, students}; })} className="p-2 border rounded-lg w-full text-xs outline-none focus:ring-2 focus:ring-blue-300" required>
                                        <option value="">Bangsa...</option>
                                        <option value="Melayu">Melayu</option>
                                        <option value="Cina">Cina</option>
                                        <option value="India">India</option>
                                        <option value="Bumiputera">Bumiputera</option>
                                        <option value="Lain-lain">Lain-lain</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-tighter">Jantina</label>
                                    <select value={s.gender} onChange={e => updateData(d => { const students = [...d.students]; students[i].gender = e.target.value as any; if (students[i].category && students[i].gender) students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id); return {...d, students}; })} className="p-2 border rounded-lg w-full text-xs outline-none focus:ring-2 focus:ring-blue-300" required>
                                        <option value="">Jantina...</option>
                                        <option value="Lelaki">Lelaki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-tighter">Kategori</label>
                                    <select 
                                      value={s.category} 
                                      disabled={data.schoolType === 'Sekolah Kebangsaan'}
                                      onChange={e => updateData(d => { const students = [...d.students]; students[i].category = e.target.value; if (students[i].category && students[i].gender) students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id); return {...d, students}; })} 
                                      className={`p-2 border rounded-lg w-full text-xs outline-none focus:ring-2 focus:ring-blue-300 ${data.schoolType === 'Sekolah Kebangsaan' ? 'bg-gray-100' : 'bg-white'}`} required
                                    >
                                        <option value="Bawah 12 Tahun">U12</option>
                                        <option value="Bawah 15 Tahun">U15</option>
                                        <option value="Bawah 18 Tahun">U18</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-tighter">Player ID</label>
                                    <input value={s.playerId} readOnly className="p-2 bg-gray-100 rounded-lg w-full text-[10px] font-mono" />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => {
                      const defaultCat = d.schoolType === 'Sekolah Kebangsaan' ? 'Bawah 12 Tahun' : '';
                      return {...d, students: [...d.students, {name:'', ic:'', gender:'', race:'', category:defaultCat, playerId:''}]};
                    })} className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-1 mt-2 shadow-sm">
                        <Plus size={14} /> TAMBAH PELAJAR
                    </button>
                 </div>

                 <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={cancelEdit} className="px-6 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-all">BATAL</button>
                    <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 transform active:scale-95">
                        <Save size={18} /> SIMPAN KEMASKINI
                    </button>
                 </div>
            </form>
        </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 md:p-8 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><Search size={20} /></div>
          <h4 className="text-xl font-bold text-blue-800">Cari Pendaftaran</h4>
      </div>
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-600 font-bold text-sm mb-2 uppercase tracking-wide">ID Pendaftaran *</label>
            <input
              type="text"
              required
              value={searchRegId}
              onChange={(e) => setSearchRegId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-mono"
              placeholder="Contoh: MSSD-01-01"
            />
          </div>
          <div>
            <label className="block text-gray-600 font-bold text-sm mb-2 uppercase tracking-wide">4 Digit Akhir No. Telefon *</label>
            <input
              type="text"
              required
              maxLength={4}
              value={searchPassword}
              onChange={(e) => setSearchPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-mono"
              placeholder="Contoh: 1234"
            />
          </div>
        </div>
        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-shake">
            <AlertCircle size={16} /> {searchError}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
          >
            {isSearching ? <><RefreshCw className="animate-spin" size={18} /> Mencari...</> : <><Search size={18} /> Cari Pendaftaran</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateRegistration;
