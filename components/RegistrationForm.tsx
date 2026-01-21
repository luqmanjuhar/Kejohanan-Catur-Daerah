
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, generateRegistrationId, sendWhatsAppNotification, isValidEmail, isValidMalaysianPhone } from '../utils/formatters';
import { syncRegistration } from '../services/api';

interface RegistrationFormProps {
  registrations: RegistrationsMap;
  onSuccess: (regId: string, data: any) => void;
  eventConfig: EventConfig;
  draft: {
    schoolName: string;
    schoolType: string;
    teachers: Teacher[];
    students: Student[];
  };
  onDraftChange: (updated: any) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ registrations, onSuccess, eventConfig, draft, onDraftChange }) => {
  const [generatedRegId, setGeneratedRegId] = useState('');
  const [formErrors, setFormErrors] = useState<{teachers: Record<number, string[]>, students: Record<number, string[]>}>({
    teachers: {},
    students: {}
  });

  const { schoolName, schoolType, teachers, students } = draft;

  useEffect(() => {
    if (schoolType === 'Sekolah Kebangsaan') {
      const updatedStudents = students.map(s => ({ ...s, category: 'Bawah 12 Tahun' }));
      onDraftChange({ ...draft, students: updatedStudents });
    }
  }, [schoolType]);

  useEffect(() => {
    if (students.length > 0 && students[0].category) {
        const tempId = generateRegistrationId(students[0].category, registrations);
        setGeneratedRegId(tempId);
    }
  }, [students, registrations]);

  useEffect(() => {
    const updatedStudents = students.map((student, index) => {
        if (student.category && student.gender && schoolName && generatedRegId) {
             const newId = generatePlayerId(student.gender, schoolName, index, student.category, generatedRegId);
             if (newId !== student.playerId) {
                 return { ...student, playerId: newId };
             }
        }
        return student;
    });
    
    const hasChanged = updatedStudents.some((s, idx) => s.playerId !== students[idx].playerId);
    if (hasChanged) {
        onDraftChange({ ...draft, students: updatedStudents });
    }
  }, [schoolName, generatedRegId, students]);

  const validateForm = (): boolean => {
    const errors: any = { teachers: {}, students: {} };
    let hasError = false;

    teachers.forEach((t, i) => {
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

  const handleSchoolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDraftChange({ ...draft, schoolName: formatSchoolName(e.target.value) });
  };

  const handleTeacherChange = (index: number, field: keyof Teacher, value: string) => {
    const updated = [...teachers];
    let val = value;
    if (field === 'name') val = val.toUpperCase();
    if (field === 'phone') val = formatPhoneNumber(val);
    updated[index] = { ...updated[index], [field]: val };
    onDraftChange({ ...draft, teachers: updated });
  };

  const addTeacher = () => {
    onDraftChange({ ...draft, teachers: [...teachers, { name: '', email: '', phone: '', position: 'Pengiring' }] });
  };

  const removeTeacher = (index: number) => {
    if (index === 0) return;
    const updated = teachers.filter((_, i) => i !== index);
    onDraftChange({ ...draft, teachers: updated });
  };

  const handleStudentChange = (index: number, field: keyof Student, value: string) => {
    const updated = [...students];
    let val = value;
    
    if (field === 'name') val = val.toUpperCase();
    
    if (field === 'ic') {
      val = formatIC(val);
      const digitsOnly = val.replace(/\D/g, '');
      if (digitsOnly.length === 12) {
        const lastDigit = parseInt(digitsOnly.charAt(11));
        updated[index].gender = lastDigit % 2 === 0 ? 'Perempuan' : 'Lelaki';
      }
    }
    
    if (field === 'gender') {
       updated[index].gender = val as any;
    } else if (field === 'category') {
       updated[index].category = val;
    } else {
       (updated[index] as any)[field] = val;
    }
    
    const student = updated[index];
    if (student.category && student.gender && schoolName) {
        const tempRegId = generateRegistrationId(student.category, registrations);
        updated[index].playerId = generatePlayerId(student.gender, schoolName, index, student.category, tempRegId);
    }
    
    onDraftChange({ ...draft, students: updated });
  };

  const addStudent = () => {
    const defaultCategory = schoolType === 'Sekolah Kebangsaan' ? 'Bawah 12 Tahun' : '';
    onDraftChange({ ...draft, students: [...students, { name: '', ic: '', gender: '', race: '', category: defaultCategory, playerId: '' }] });
  };

  const removeStudent = (index: number) => {
    const updated = students.filter((_, i) => i !== index);
    onDraftChange({ ...draft, students: updated });
  };

  const resetForm = () => {
    if (confirm("Kosongkan semua data dalam borang ini?")) {
        onDraftChange({
            schoolName: '',
            schoolType: '',
            teachers: [{ name: '', email: '', phone: '', position: 'Ketua' }],
            students: [{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }]
        });
        setFormErrors({ teachers: {}, students: {} });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert("Sila betulkan ralat pada borang.");
      return;
    }
    if (students.length === 0) {
        alert("Sila tambah sekurang-kurangnya seorang pelajar.");
        return;
    }

    const firstCategory = students[0].category;
    const regId = generateRegistrationId(firstCategory, registrations);
    const data = { schoolName, schoolType, teachers, students, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'AKTIF' };

    try {
        await syncRegistration(regId, data, false);
        onSuccess(regId, data);
        sendWhatsAppNotification(regId, data, 'create', eventConfig.adminPhone);
    } catch (err) {
        alert("Pendaftaran gagal dihantar. Sila periksa sambungan internet.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10">
      <section className="bg-white p-4 md:p-8 rounded-[2rem] border-2 border-orange-50">
        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-orange-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm">1</span>
            MAKLUMAT SEKOLAH
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Sekolah *</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={handleSchoolNameChange}
              className="w-full min-h-[50px] px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-sm"
              placeholder="Contoh: SK Taman Desa"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Sekolah *</label>
            <select
              required
              value={schoolType}
              onChange={(e) => onDraftChange({ ...draft, schoolType: e.target.value })}
              className="w-full min-h-[50px] px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:bg-white outline-none transition-all font-bold text-sm"
            >
              <option value="">Pilih...</option>
              <option value="Sekolah Kebangsaan">Sekolah Kebangsaan (U12)</option>
              <option value="Sekolah Menengah">Sekolah Menengah (U15/18)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white p-4 md:p-8 rounded-[2rem] border-2 border-orange-50">
        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-orange-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm">2</span>
            MAKLUMAT GURU
        </h3>
        <div className="space-y-4">
            {teachers.map((teacher, index) => (
              <div key={index} className="p-5 bg-orange-50/30 rounded-2xl border-2 border-orange-50 relative group">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{index === 0 ? 'Guru Pembimbing (Ketua)' : 'Guru Pengiring'}</span>
                    {index > 0 && (
                        <button type="button" onClick={() => removeTeacher(index)} className="text-red-400 hover:text-red-600 active:scale-90 transition-all p-1">
                            <Trash2 size={18} />
                        </button>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input required placeholder="Nama Guru" value={teacher.name} onChange={(e) => handleTeacherChange(index, 'name', e.target.value)} className="w-full min-h-[48px] px-4 py-2 border-2 border-white rounded-xl focus:border-orange-200 outline-none text-sm font-bold shadow-sm" />
                    <input required type="email" placeholder="Email" value={teacher.email} onChange={(e) => handleTeacherChange(index, 'email', e.target.value)} className={`w-full min-h-[48px] px-4 py-2 border-2 rounded-xl focus:border-orange-200 outline-none text-sm font-bold shadow-sm ${formErrors.teachers[index]?.includes('Email tidak sah') ? 'border-red-300' : 'border-white'}`} />
                    <input required type="tel" placeholder="No. Telefon" value={teacher.phone} onChange={(e) => handleTeacherChange(index, 'phone', e.target.value)} className={`w-full min-h-[48px] px-4 py-2 border-2 rounded-xl focus:border-orange-200 outline-none text-sm font-bold shadow-sm ${formErrors.teachers[index]?.includes('No. Telefon tidak sah') ? 'border-red-300' : 'border-white'}`} />
                 </div>
              </div>
            ))}
            <button type="button" onClick={addTeacher} className="w-full py-4 bg-orange-50 text-orange-600 text-xs font-black rounded-2xl border-2 border-dashed border-orange-100 hover:bg-orange-100 transition-all active:scale-95 uppercase tracking-widest">
                + Tambah Guru Pengiring
            </button>
        </div>
      </section>

      <section className="bg-white p-4 md:p-8 rounded-[2rem] border-2 border-blue-50">
        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3">
            <span className="bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm">3</span>
            SENARAI PELAJAR
        </h3>
        <div className="space-y-4">
          {students.map((student, index) => (
            <div key={index} className="p-5 bg-blue-50/30 rounded-2xl border-2 border-blue-50">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Pelajar {index + 1}</span>
                  {students.length > 1 && (
                    <button type="button" onClick={() => removeStudent(index)} className="text-red-400 hover:text-red-600 active:scale-90 transition-all p-1">
                        <Trash2 size={18} />
                    </button>
                  )}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                 <input required placeholder="Nama Penuh (Seperti Dalam IC)" value={student.name} onChange={(e) => handleStudentChange(index, 'name', e.target.value)} className="w-full min-h-[48px] px-4 py-2 border-2 border-white rounded-xl outline-none text-sm font-bold shadow-sm focus:border-blue-200" />
                 <input required placeholder="No. Kad Pengenalan" value={student.ic} onChange={(e) => handleStudentChange(index, 'ic', e.target.value)} className="w-full min-h-[48px] px-4 py-2 border-2 border-white rounded-xl outline-none text-sm font-bold shadow-sm focus:border-blue-200 font-mono" maxLength={14} />
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 <select required value={student.race} onChange={(e) => handleStudentChange(index, 'race', e.target.value)} className="min-h-[48px] px-3 border-2 border-white rounded-xl text-xs font-bold outline-none shadow-sm bg-white">
                   <option value="">Bangsa</option>
                   <option value="Melayu">Melayu</option>
                   <option value="Cina">Cina</option>
                   <option value="India">India</option>
                   <option value="Lain-lain">Lain-lain</option>
                 </select>
                 <select required value={student.gender} onChange={(e) => handleStudentChange(index, 'gender', e.target.value)} className="min-h-[48px] px-3 border-2 border-white rounded-xl text-xs font-bold outline-none shadow-sm bg-white">
                   <option value="">Jantina</option>
                   <option value="Lelaki">Lelaki</option>
                   <option value="Perempuan">Perempuan</option>
                 </select>
                 <select required value={student.category} onChange={(e) => handleStudentChange(index, 'category', e.target.value)} disabled={schoolType === 'Sekolah Kebangsaan'} className="min-h-[48px] px-3 border-2 border-white rounded-xl text-xs font-bold outline-none shadow-sm bg-white disabled:bg-gray-100 disabled:text-gray-400">
                   <option value="">Kategori</option>
                   <option value="Bawah 12 Tahun">U12</option>
                   <option value="Bawah 15 Tahun">U15</option>
                   <option value="Bawah 18 Tahun">U18</option>
                 </select>
                 <div className="min-h-[48px] px-3 bg-gray-100 rounded-xl text-[10px] font-mono flex items-center text-gray-400 border-2 border-white">
                    {student.playerId || 'ID AUTO'}
                 </div>
               </div>
            </div>
          ))}
          <button type="button" onClick={addStudent} className="w-full py-4 bg-blue-50 text-blue-600 text-xs font-black rounded-2xl border-2 border-dashed border-blue-100 hover:bg-blue-100 transition-all active:scale-95 uppercase tracking-widest">
              + Tambah Pelajar
          </button>
        </div>
      </section>

      <div className="flex flex-col-reverse md:flex-row gap-4 justify-end pt-8">
        <button type="button" onClick={resetForm} className="flex-1 md:flex-none px-10 py-5 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-95 transition-all">
          <RefreshCw className="w-4 h-4 inline mr-2" /> Reset
        </button>
        <button type="submit" className="flex-[2] md:flex-none px-16 py-5 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-orange-100 active:scale-95 transition-all flex items-center justify-center gap-3">
          <Save size={20} /> Hantar Pendaftaran
        </button>
      </div>
    </form>
  );
};

export default RegistrationForm;
