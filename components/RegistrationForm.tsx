
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, generateRegistrationId, sendWhatsAppNotification, isValidEmail, isValidMalaysianPhone } from '../utils/formatters';
import { syncRegistration } from '../services/api';

interface RegistrationFormProps {
  registrations: RegistrationsMap;
  onSuccess: (regId: string, data: any) => void;
  eventConfig: EventConfig;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ registrations, onSuccess, eventConfig }) => {
  const [schoolName, setSchoolName] = useState('');
  const [schoolType, setSchoolType] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([
    { name: '', email: '', phone: '', position: 'Ketua' }
  ]);
  const [students, setStudents] = useState<Student[]>([
    { name: '', ic: '', gender: '', race: '', category: '', playerId: '' }
  ]);
  const [generatedRegId, setGeneratedRegId] = useState('');
  const [formErrors, setFormErrors] = useState<{teachers: Record<number, string[]>, students: Record<number, string[]>}>({
    teachers: {},
    students: {}
  });

  // Automasi Kategori jika Sekolah Kebangsaan dipilih
  useEffect(() => {
    if (schoolType === 'Sekolah Kebangsaan') {
      setStudents(prev => prev.map(s => ({ ...s, category: 'Bawah 12 Tahun' })));
    }
  }, [schoolType]);

  useEffect(() => {
    if (students.length > 0 && students[0].category) {
        const tempId = generateRegistrationId(students[0].category, registrations);
        setGeneratedRegId(tempId);
    }
  }, [students, registrations]);

  useEffect(() => {
    setStudents(prev => prev.map((student, index) => {
        if (student.category && student.gender && schoolName && generatedRegId) {
             const newId = generatePlayerId(student.gender, schoolName, index, student.category, generatedRegId);
             if (newId !== student.playerId) {
                 return { ...student, playerId: newId };
             }
        }
        return student;
    }));
  }, [schoolName, generatedRegId]);

  const validateForm = (): boolean => {
    const errors: any = { teachers: {}, students: {} };
    let hasError = false;

    teachers.forEach((t, i) => {
      const tErrors = [];
      if (!isValidEmail(t.email)) tErrors.push('Email tidak sah');
      if (!isValidMalaysianPhone(t.phone)) tErrors.push('No. Telefon tidak sah (Format: 01x-xxxxxxx)');
      if (tErrors.length > 0) {
        errors.teachers[i] = tErrors;
        hasError = true;
      }
    });

    setFormErrors(errors);
    return !hasError;
  };

  const handleSchoolNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchoolName(formatSchoolName(e.target.value));
  };

  const handleTeacherChange = (index: number, field: keyof Teacher, value: string) => {
    const updated = [...teachers];
    let val = value;
    if (field === 'name') val = val.toUpperCase();
    if (field === 'phone') val = formatPhoneNumber(val);
    updated[index] = { ...updated[index], [field]: val };
    setTeachers(updated);
  };

  const addTeacher = () => {
    setTeachers([...teachers, { name: '', email: '', phone: '', position: 'Pengiring' }]);
  };

  const removeTeacher = (index: number) => {
    if (index === 0) return;
    const updated = teachers.filter((_, i) => i !== index);
    setTeachers(updated);
  };

  const handleStudentChange = (index: number, field: keyof Student, value: string) => {
    const updated = [...students];
    let val = value;
    
    if (field === 'name') val = val.toUpperCase();
    
    if (field === 'ic') {
      val = formatIC(val);
      // Logik Automasi Jantina berdasarkan IC (Digit terakhir)
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
    
    // Trigger Player ID update
    if (field === 'category' || field === 'gender' || field === 'ic') {
        const student = updated[index];
        if (student.category && student.gender && schoolName) {
            const tempRegId = generateRegistrationId(student.category, registrations);
            updated[index].playerId = generatePlayerId(student.gender, schoolName, index, student.category, tempRegId);
        }
    }
    setStudents(updated);
  };

  const addStudent = () => {
    const defaultCategory = schoolType === 'Sekolah Kebangsaan' ? 'Bawah 12 Tahun' : '';
    setStudents([...students, { name: '', ic: '', gender: '', race: '', category: defaultCategory, playerId: '' }]);
  };

  const removeStudent = (index: number) => {
    const updated = students.filter((_, i) => i !== index);
    setStudents(updated);
  };

  const resetForm = () => {
    setSchoolName('');
    setSchoolType('');
    setTeachers([{ name: '', email: '', phone: '', position: 'Ketua' }]);
    setStudents([{ name: '', ic: '', gender: '', race: '', category: '', playerId: '' }]);
    setGeneratedRegId('');
    setFormErrors({ teachers: {}, students: {} });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert("Sila betulkan ralat pada borang sebelum menghantar.");
      return;
    }

    if (students.length === 0) {
        alert("Sila tambah sekurang-kurangnya seorang pelajar.");
        return;
    }

    const firstCategory = students[0].category;
    const regId = generateRegistrationId(firstCategory, registrations);

    const data = {
        schoolName,
        schoolType,
        teachers,
        students,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'AKTIF'
    };

    try {
        await syncRegistration(regId, data, false);
        onSuccess(regId, data);
        sendWhatsAppNotification(regId, data, 'create', eventConfig.adminPhone);
        resetForm();
    } catch (err) {
        alert("Pendaftaran disimpan secara lokal tetapi gagal disegerakkan ke awan. Sila semak sambungan.");
        onSuccess(regId, data);
        resetForm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Maklumat Sekolah</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Nama Sekolah *</label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={handleSchoolNameChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
              placeholder="Contoh: SK Taman Desa"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Jenis Sekolah *</label>
            <select
              required
              value={schoolType}
              onChange={(e) => setSchoolType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
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

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Maklumat Guru</h3>
        {teachers.map((teacher, index) => (
          <div key={index} className="bg-orange-50 p-4 rounded-lg mb-4 relative border border-orange-100">
             <div className="flex justify-between mb-2">
                <h4 className="font-semibold text-orange-800 text-sm">
                    {index === 0 ? 'Guru 1 (Ketua)' : `Guru ${index + 1} (Pengiring)`}
                </h4>
                {index > 0 && (
                    <button type="button" onClick={() => removeTeacher(index)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <input
                    type="text"
                    required
                    placeholder="Nama Guru"
                    value={teacher.name}
                    onChange={(e) => handleTeacherChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-300 outline-none"
                  />
               </div>
               <div>
                  <input
                    type="email"
                    required
                    placeholder="Email (e.g. guru@email.com)"
                    value={teacher.email}
                    onChange={(e) => handleTeacherChange(index, 'email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-300 outline-none ${formErrors.teachers[index]?.includes('Email tidak sah') ? 'border-red-500 bg-red-50' : ''}`}
                  />
                  {formErrors.teachers[index]?.includes('Email tidak sah') && (
                    <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-bold">
                      <AlertCircle size={10} /> Format email salah
                    </p>
                  )}
               </div>
               <div>
                  <input
                    type="tel"
                    required
                    placeholder="No. Telefon (e.g. 012-345 6789)"
                    value={teacher.phone}
                    onChange={(e) => handleTeacherChange(index, 'phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-orange-300 outline-none ${formErrors.teachers[index]?.includes('No. Telefon tidak sah (Format: 01x-xxxxxxx)') ? 'border-red-500 bg-red-50' : ''}`}
                  />
                  {formErrors.teachers[index]?.includes('No. Telefon tidak sah (Format: 01x-xxxxxxx)') && (
                    <p className="text-red-500 text-[10px] mt-1 flex items-center gap-1 font-bold">
                      <AlertCircle size={10} /> Format No. Telefon Malaysia (01x-xxxxxxx)
                    </p>
                  )}
               </div>
             </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addTeacher}
          className="mt-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Guru Pengiring
        </button>
      </section>

      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Pendaftaran Pelajar</h3>
        {students.map((student, index) => (
          <div key={index} className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
             <div className="flex justify-between mb-2">
                <h4 className="font-semibold text-blue-800 text-sm">Pelajar {index + 1}</h4>
                <button type="button" onClick={() => removeStudent(index)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
               <input
                 type="text"
                 required
                 placeholder="Nama Pelajar"
                 value={student.name}
                 onChange={(e) => handleStudentChange(index, 'name', e.target.value)}
                 className="px-3 py-2 border rounded focus:ring-2 focus:ring-blue-300 outline-none"
               />
               <div>
                  <input
                    type="text"
                    required
                    placeholder="No. IC (XXXXXX-XX-XXXX)"
                    value={student.ic}
                    onChange={(e) => handleStudentChange(index, 'ic', e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-300 outline-none"
                    maxLength={14}
                  />
                  {student.ic.replace(/\D/g, '').length === 12 && (
                    <p className="text-[9px] text-blue-600 mt-1 font-bold italic">✨ Jantina dikesan automatik dari IC</p>
                  )}
               </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <select
                 required
                 value={student.race}
                 onChange={(e) => handleStudentChange(index, 'race', e.target.value)}
                 className="px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-blue-300"
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
                 className="px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-blue-300 bg-white"
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
                 className={`px-3 py-2 border rounded outline-none focus:ring-2 focus:ring-blue-300 ${schoolType === 'Sekolah Kebangsaan' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
               >
                 <option value="">Kategori</option>
                 <option value="Bawah 12 Tahun">Bawah 12 Tahun</option>
                 <option value="Bawah 15 Tahun">Bawah 15 Tahun</option>
                 <option value="Bawah 18 Tahun">Bawah 18 Tahun</option>
               </select>
               <input
                 type="text"
                 readOnly
                 placeholder="Player ID (Auto)"
                 value={student.playerId}
                 className="px-3 py-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed font-mono text-xs"
               />
             </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addStudent}
          className="mt-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Pelajar
        </button>
      </section>

      <div className="flex gap-4 justify-end items-center">
        <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-bold shadow-md"
        >
            <RefreshCw className="w-4 h-4" /> Reset
        </button>
        <button
            type="submit"
            className="flex items-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-bold shadow-lg transform active:scale-95"
        >
            <Save className="w-4 h-4" /> Hantar Pendaftaran
        </button>
      </div>
    </form>
  );
};

export default RegistrationForm;
