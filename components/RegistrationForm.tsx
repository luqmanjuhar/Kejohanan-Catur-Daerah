
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { Teacher, Student, RegistrationsMap, EventConfig } from '../types';
import { formatSchoolName, formatPhoneNumber, formatIC, generatePlayerId, generateRegistrationId, sendWhatsAppNotification } from '../utils/formatters';
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

  // Auto-generate ID logic
  useEffect(() => {
    // Generate temp reg ID if we have at least one student with a category
    if (students.length > 0 && students[0].category) {
        const tempId = generateRegistrationId(students[0].category, registrations);
        setGeneratedRegId(tempId);
    }
  }, [students, registrations]);

  // Update student IDs when dependencies change
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
  }, [schoolName, generatedRegId]); // Intentionally not including entire 'students' array to avoid infinite loops, simplistic approach

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
    if (field === 'ic') val = formatIC(val);
    
    // Type coercion for specific string literals
    if (field === 'gender' && (val === 'Lelaki' || val === 'Perempuan' || val === '')) {
       updated[index] = { ...updated[index], gender: val as 'Lelaki'|'Perempuan'|'' };
    } else {
       (updated[index] as any)[field] = val;
    }
    
    // Immediate re-calculation of Player ID for this row if specific fields changed
    if (field === 'category' || field === 'gender') {
        const student = updated[index];
        if (student.category && student.gender && schoolName) {
            // Need current regID (or simplistic placeholder if not ready)
            // Use the effect-based one or recompute
            const tempRegId = generateRegistrationId(student.category, registrations);
            updated[index].playerId = generatePlayerId(student.gender, schoolName, index, student.category, tempRegId);
        }
    }
    
    setStudents(updated);
  };

  const addStudent = () => {
    setStudents([...students, { name: '', ic: '', gender: '', race: '', category: '', playerId: '' }]);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (students.length === 0) {
        alert("Please add at least one student.");
        return;
    }

    const firstCategory = students[0].category;
    if (!firstCategory) {
        alert("Please select a category for the first student to generate Registration ID.");
        return;
    }

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
        alert("Saved locally but failed to sync to cloud. Check connection.");
        // Still treat as success for local usage
        onSuccess(regId, data);
        resetForm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* School Info */}
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
          </div>
        </div>
      </section>

      {/* Teachers */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Maklumat Guru</h3>
        {teachers.map((teacher, index) => (
          <div key={index} className="bg-orange-50 p-4 rounded-lg mb-4 relative">
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
               <input
                 type="text"
                 required
                 placeholder="Nama Guru"
                 value={teacher.name}
                 onChange={(e) => handleTeacherChange(index, 'name', e.target.value)}
                 className="px-3 py-2 border rounded"
               />
               <input
                 type="email"
                 required
                 placeholder="Email"
                 value={teacher.email}
                 onChange={(e) => handleTeacherChange(index, 'email', e.target.value)}
                 className="px-3 py-2 border rounded"
               />
               <input
                 type="tel"
                 required
                 placeholder="No. Telefon"
                 value={teacher.phone}
                 onChange={(e) => handleTeacherChange(index, 'phone', e.target.value)}
                 className="px-3 py-2 border rounded"
               />
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

      {/* Students */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-orange-600 mb-4 border-b-2 border-orange-100 pb-2">Pendaftaran Pelajar</h3>
        {students.map((student, index) => (
          <div key={index} className="bg-blue-50 p-4 rounded-lg mb-4">
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
                 className="px-3 py-2 border rounded"
               />
               <input
                 type="text"
                 required
                 placeholder="No. IC (XXXXXX-XX-XXXX)"
                 value={student.ic}
                 onChange={(e) => handleStudentChange(index, 'ic', e.target.value)}
                 className="px-3 py-2 border rounded"
                 maxLength={14}
               />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <select
                 required
                 value={student.race}
                 onChange={(e) => handleStudentChange(index, 'race', e.target.value)}
                 className="px-3 py-2 border rounded"
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
                 className="px-3 py-2 border rounded"
               >
                 <option value="">Jantina</option>
                 <option value="Lelaki">Lelaki</option>
                 <option value="Perempuan">Perempuan</option>
               </select>
               <select
                 required
                 value={student.category}
                 onChange={(e) => handleStudentChange(index, 'category', e.target.value)}
                 className="px-3 py-2 border rounded"
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
                 className="px-3 py-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed"
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

      <div className="flex gap-4 justify-end">
        <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
            <RefreshCw className="w-4 h-4" /> Reset
        </button>
        <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
        >
            <Save className="w-4 h-4" /> Hantar Pendaftaran
        </button>
      </div>
    </form>
  );
};

export default RegistrationForm;
