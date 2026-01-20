
import React, { useState } from 'react';
import { Search, Save, X, Plus, Trash2 } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { searchRemoteRegistration, syncRegistration } from '../services/api';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, sendWhatsAppNotification } from '../utils/formatters';

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchError(null);
    setEditingReg(null);

    try {
        // 1. Try local
        let found = localRegistrations[searchRegId];
        let isValid = false;

        if (found && found.teachers.length > 0) {
            const phone = found.teachers[0].phone.replace(/\D/g, '');
            const last4 = phone.slice(-4);
            if (last4 === searchPassword) {
                isValid = true;
            }
        }

        if (isValid) {
            setEditingReg({ id: searchRegId, data: JSON.parse(JSON.stringify(found)) });
            setIsSearching(false);
            return;
        }

        // 2. Try remote
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

  const cancelEdit = () => {
    setEditingReg(null);
    setSearchRegId('');
    setSearchPassword('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;

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

  // Helper to update state inside editingReg
  const updateData = (updater: (prev: any) => any) => {
    setEditingReg(prev => prev ? { ...prev, data: updater(prev.data) } : null);
  };

  if (editingReg) {
    const { data } = editingReg;
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-blue-800">Kemaskini: {editingReg.id}</h3>
                <button onClick={cancelEdit} className="text-gray-500 hover:text-red-500"><X /></button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-6">
                 {/* School */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                        value={data.schoolName} 
                        onChange={e => updateData(d => ({...d, schoolName: formatSchoolName(e.target.value)}))}
                        className="p-2 border rounded" placeholder="Nama Sekolah" required
                    />
                    <select 
                        value={data.schoolType}
                        onChange={e => updateData(d => ({...d, schoolType: e.target.value}))}
                        className="p-2 border rounded" required
                    >
                        <option value="Sekolah Kebangsaan">Sekolah Kebangsaan</option>
                        <option value="Sekolah Menengah">Sekolah Menengah</option>
                    </select>
                 </div>

                 {/* Teachers */}
                 <div className="bg-orange-50 p-4 rounded">
                    <h4 className="font-semibold text-orange-800 mb-3">Guru</h4>
                    {data.teachers.map((t: Teacher, i: number) => (
                        <div key={i} className="mb-4 grid md:grid-cols-3 gap-2 pb-4 border-b border-orange-200 last:border-0">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Nama</label>
                                <input 
                                    value={t.name}
                                    onChange={e => updateData(d => {
                                        const teachers = [...d.teachers];
                                        teachers[i].name = e.target.value.toUpperCase();
                                        return { ...d, teachers };
                                    })}
                                    className="p-2 border rounded w-full" placeholder="Nama" required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Email</label>
                                <input 
                                    value={t.email}
                                    type="email"
                                    onChange={e => updateData(d => {
                                        const teachers = [...d.teachers];
                                        teachers[i].email = e.target.value;
                                        return { ...d, teachers };
                                    })}
                                    className="p-2 border rounded w-full" placeholder="Email" required
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">No. Telefon</label>
                                    <input 
                                        value={t.phone}
                                        onChange={e => updateData(d => {
                                            const teachers = [...d.teachers];
                                            teachers[i].phone = formatPhoneNumber(e.target.value);
                                            return { ...d, teachers };
                                        })}
                                        className="p-2 border rounded w-full" placeholder="Telefon" required
                                    />
                                </div>
                                {i > 0 && (
                                    <div className="flex items-end">
                                        <button type="button" onClick={() => updateData(d => ({...d, teachers: d.teachers.filter((_: any, idx: number) => idx !== i)}))} className="text-red-500 mb-2 p-1">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => ({...d, teachers: [...d.teachers, {name:'', email:'', phone:'', position:'Pengiring'}]}))} className="text-sm text-orange-700 flex items-center gap-1 mt-2">
                        <Plus size={16} /> Tambah Guru
                    </button>
                 </div>

                 {/* Students */}
                 <div className="bg-blue-50 p-4 rounded">
                    <h4 className="font-semibold text-blue-800 mb-3">Pelajar</h4>
                    {data.students.map((s: Student, i: number) => (
                        <div key={i} className="mb-4 border-b border-blue-200 pb-4">
                            <div className="grid md:grid-cols-2 gap-2 mb-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Nama Pelajar</label>
                                    <input 
                                        value={s.name}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].name = e.target.value.toUpperCase();
                                            return {...d, students};
                                        })}
                                        className="p-2 border rounded w-full" placeholder="Nama" required
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 block mb-1">No. IC</label>
                                        <input 
                                            value={s.ic}
                                            onChange={e => updateData(d => {
                                                const students = [...d.students];
                                                students[i].ic = formatIC(e.target.value);
                                                return {...d, students};
                                            })}
                                            className="p-2 border rounded w-full" placeholder="IC" required
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button type="button" onClick={() => updateData(d => ({...d, students: d.students.filter((_: any, idx: number) => idx !== i)}))} className="text-red-500 mb-2 p-1">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Bangsa</label>
                                    <select 
                                        value={s.race}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].race = e.target.value;
                                            return {...d, students};
                                        })}
                                        className="p-2 border rounded w-full"
                                        required
                                    >
                                        <option value="">Pilih...</option>
                                        <option value="Melayu">Melayu</option>
                                        <option value="Cina">Cina</option>
                                        <option value="India">India</option>
                                        <option value="Bumiputera">Bumiputera</option>
                                        <option value="Lain-lain">Lain-lain</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Jantina</label>
                                    <select 
                                        value={s.gender}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].gender = e.target.value as any;
                                            // Recalc ID
                                            if (students[i].category && students[i].gender) {
                                                students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id);
                                            }
                                            return {...d, students};
                                        })}
                                        className="p-2 border rounded w-full"
                                        required
                                    >
                                        <option value="">Pilih...</option>
                                        <option value="Lelaki">Lelaki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Kategori</label>
                                    <select 
                                        value={s.category}
                                        onChange={e => updateData(d => {
                                            const students = [...d.students];
                                            students[i].category = e.target.value;
                                             if (students[i].category && students[i].gender) {
                                                students[i].playerId = generatePlayerId(students[i].gender, data.schoolName, i, students[i].category, editingReg.id);
                                            }
                                            return {...d, students};
                                        })}
                                        className="p-2 border rounded w-full"
                                        required
                                    >
                                        <option value="Bawah 12 Tahun">U12</option>
                                        <option value="Bawah 15 Tahun">U15</option>
                                        <option value="Bawah 18 Tahun">U18</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Player ID</label>
                                    <input value={s.playerId} readOnly className="p-2 bg-gray-100 rounded w-full text-xs" />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => updateData(d => ({...d, students: [...d.students, {name:'', ic:'', gender:'', race:'', category:'', playerId:''}]}))} className="text-sm text-blue-700 flex items-center gap-1 mt-2">
                        <Plus size={16} /> Tambah Pelajar
                    </button>
                 </div>

                 <div className="flex justify-end gap-3">
                    <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-500 text-white rounded">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2">
                        <Save size={18} /> Simpan
                    </button>
                 </div>
            </form>
        </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-blue-800 mb-4">🔍 Cari Pendaftaran</h4>
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">ID Pendaftaran *</label>
            <input
              type="text"
              required
              value={searchRegId}
              onChange={(e) => setSearchRegId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: MSSD-01-01"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">4 Digit Akhir No. Telefon Guru (Ketua) *</label>
            <input
              type="text"
              required
              maxLength={4}
              value={searchPassword}
              onChange={(e) => setSearchPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: 1234"
            />
          </div>
        </div>
        {searchError && <p className="text-red-500 mb-4 text-sm">{searchError}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSearching}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            <Search className="w-4 h-4" /> {isSearching ? 'Mencari...' : 'Cari Pendaftaran'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateRegistration;
