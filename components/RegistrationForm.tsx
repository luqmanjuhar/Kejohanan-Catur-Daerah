
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertCircle } from 'lucide-react';
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
        alert("Pendaftaran gagal dihantar ke Cloud. Sila semak sambungan internet anda.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
      <section className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-black text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Maklumat Sekolah</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold text-xs md:text-sm mb-2 uppercase">Nama Sekolah *</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={handleSchoolNameChange}
              className="w-full px-4 py-3 md:py-2 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm"
              placeholder="Contoh: SK Taman Desa"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-bold text-xs md:text-sm mb-2 uppercase">Jenis Sekolah *</label>
            <select
              required
              value={schoolType}
              onChange={(e) => onDraftChange({ ...draft, schoolType: e.target.value })}
              className="w-full px-4 py-3 md:py-2 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm bg-white"
            >
              <option value="">Pilih Jenis Sekolah</option>
              <option value="Sekolah Kebangsaan">Sekolah Kebangsaan</option>
              <option value="Sekolah Menengah">Sekolah Menengah</option>
            </select>
            {schoolType === 'Sekolah Kebangsaan' && (
              <p className="text-[10px] text-orange-600 mt-1 font-bold italic">💡 Kategori ditetapkan automatik ke U12</p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-black text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Maklumat Guru</h3>
        {teachers.map((teacher, index) => (
          <div key={index} className="bg-orange-50/50 p-4 rounded-xl mb-4 relative border border-orange-100">
             <div className="flex justify-between mb-3 items-center">
                <h4 className="font-black text-orange-800 text-[10px] uppercase tracking-widest">
                    {index === 0 ? 'Guru 1 (Ketua)' : `Guru ${index + 1} (Pengiring)`}
                </h4>
                {index > 0 && (
                    <button type="button" onClick={() => removeTeacher(index)} className="text-red-500 hover:text-red-700 bg-white p-1.5 rounded-lg shadow-sm">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
               <div>
                  <input
                    type="text"
                    required
                    placeholder="Nama Guru"
                    value={teacher.name}
                    onChange={(e) => handleTeacherChange(index, 'name', e.target.value)}
                    className="w-full px-4 py-3 md:py-2 border-2 border-white rounded-xl focus:ring-2 focus:ring-orange-300 outline-none text-sm bg-white shadow-sm"
                  />
               </div>
               <div>
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={teacher.email}
                    onChange={(e) => handleTeacherChange(index, 'email', e.target.value)}
                    className={`w-full px-4 py-3 md:py-2 border-2 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none text-sm bg-white shadow-sm ${formErrors.teachers[index]?.includes('Email tidak sah') ? 'border-red-500' : 'border-white'}`}
                  />
               </div>
               <div>
                  <input
                    type="tel"
                    required
                    placeholder="No. Telefon"
                    value={teacher.phone}
                    onChange={(e) => handleTeacherChange(index, 'phone', e.target.value)}
                    className={`w-full px-4 py-3 md:py-2 border-2 rounded-xl focus:ring-2 focus:ring-orange-300 outline-none text-sm bg-white shadow-sm ${formErrors.teachers[index]?.includes('No. Telefon tidak sah') ? 'border-red-500' : 'border-white'}`}
                  />
               </div>
             </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addTeacher}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 text-xs font-black text-orange-600 bg-orange-100 rounded-xl hover:bg-orange-200 transition-all uppercase tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Guru Pengiring
        </button>
      </section>

      <section className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-black text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Pendaftaran Pelajar</h3>
        <div className="space-y-4">
          {students.map((student, index) => (
            <div key={index} className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
               <div className="flex justify-between mb-3 items-center">
                  <h4 className="font-black text-blue-800 text-[10px] uppercase tracking-widest">Pelajar {index + 1}</h4>
                  {students.length > 1 && (
                    <button type="button" onClick={() => removeStudent(index)} className="text-red-500 hover:text-red-700 bg-white p-1.5 rounded-lg shadow-sm">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  )}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                 <input
                   type="text"
                   required
                   placeholder="Nama Pelajar"
                   value={student.name}
                   onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                   className="px-4 py-3 md:py-2 border-2 border-white rounded-xl focus:ring-2 focus:ring-blue-300 outline-none text-sm bg-white shadow-sm"
                 />
                 <input
                   type="text"
                   required
                   placeholder="No. IC (XXXXXX-XX-XXXX)"
                   value={student.ic}
                   onChange={(e) => handleStudentChange(index, 'ic', e.target.value)}
                   className="px-4 py-3 md:py-2 border-2 border-white rounded-xl focus:ring-2 focus:ring-blue-300 outline-none text-sm bg-white shadow-sm font-mono"
                   maxLength={14}
                 />
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 <select
                   required
                   value={student.race}
                   onChange={(e) => handleStudentChange(index, 'race', e.target.value)}
                   className="px-4 py-3 md:py-2 border-2 border-white rounded-xl outline-none focus:ring-2 focus:ring-blue-300 text-xs bg-white shadow-sm"
                 >
                   <option value="">Bangsa</option>
                   <option value="Melayu">Melayu</option>
                   <option value="Cina">Cina</option>
                   <option value="India">India</option>
                   <option value="Bumiputera">Bumiputera</option>
                   <option value="Lain-lain">Lain-lain</option>
                 </select>
                 <select
                   required
                   value={student.gender}
                   onChange={(e) => handleStudentChange(index, 'gender', e.target.value)}
                   className="px-4 py-3 md:py-2 border-2 border-white rounded-xl outline-none focus:ring-2 focus:ring-blue-300 text-xs bg-white shadow-sm"
                 >
                   <option value="">Jantina</option>
                   <option value="Lelaki">Lelaki</option>
                   <option value="Perempuan">Perempuan</option>
                 </select>
                 <select
                   required
                   value={student.category}
                   onChange={(e) => handleStudentChange(index, 'category', e.target.value)}
                   disabled={schoolType === 'Sekolah Kebangsaan'}
                   className={`px-4 py-3 md:py-2 border-2 border-white rounded-xl outline-none focus:ring-2 focus:ring-blue-300 text-xs shadow-sm ${schoolType === 'Sekolah Kebangsaan' ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-800'}`}
                 >
                   <option value="">Kategori</option>
                   <option value="Bawah 12 Tahun">U12</option>
                   <option value="Bawah 15 Tahun">U15</option>
                   <option value="Bawah 18 Tahun">U18</option>
                 </select>
                 <input
                   type="text"
                   readOnly
                   placeholder="Player ID (Auto)"
                   value={student.playerId}
                   className="px-4 py-3 md:py-2 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-400 text-[10px] font-mono flex items-center"
                 />
               </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addStudent}
          className="w-full md:w-auto mt-4 flex items-center justify-center gap-2 px-6 py-3 text-xs font-black text-blue-600 bg-blue-100 rounded-xl hover:bg-blue-200 transition-all uppercase tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Pelajar
        </button>
      </section>

      <div className="flex flex-col-reverse md:flex-row gap-4 justify-end items-stretch md:items-center pt-6">
        <button
            type="button"
            onClick={resetForm}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-500 text-white rounded-2xl hover:bg-gray-600 transition-all font-black shadow-lg shadow-gray-100 uppercase text-xs tracking-widest active:scale-95"
        >
            <RefreshCw className="w-4 h-4" /> Reset Borang
        </button>
        <button
            type="submit"
            className="flex items-center justify-center gap-2 px-10 py-5 md:py-4 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all font-black shadow-xl shadow-orange-100 transform active:scale-95 uppercase text-sm md:text-xs tracking-widest"
        >
            <Save className="w-5 h-5 md:w-4 md:h-4" /> Hantar Pendaftaran
        </button>
      </div>
    </form>
  );
};

export default RegistrationForm;
