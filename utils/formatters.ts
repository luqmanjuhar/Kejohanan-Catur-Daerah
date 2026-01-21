
import { RegistrationsMap } from '../types';

export const formatSchoolName = (name: string): string => {
  let formatted = name.toUpperCase();
  formatted = formatted.replace(/SEKOLAH KEBANGSAAN/gi, 'SK');
  formatted = formatted.replace(/SEKOLAH MENENGAH KEBANGSAAN AGAMA/gi, 'SMKA');
  formatted = formatted.replace(/SEKOLAH MENENGAH KEBANGSAAN/gi, 'SMK');
  formatted = formatted.replace(/SEKOLAH JENIS KEBANGSAAN \(CINA\)/gi, 'SJKC');
  formatted = formatted.replace(/SEKOLAH JENIS KEBANGSAAN \(TAMIL\)/gi, 'SJKT');
  formatted = formatted.replace(/SEKOLAH JENIS KEBANGSAAN/gi, 'SJK');
  return formatted;
};

export const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 11) {
    return cleaned.substring(0, 3) + '-' + cleaned.substring(3, 6) + ' ' + cleaned.substring(6, 11);
  } else if (cleaned.length >= 10) {
    return cleaned.substring(0, 3) + '-' + cleaned.substring(3, 6) + ' ' + cleaned.substring(6, 10);
  }
  return cleaned;
};

export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidMalaysianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  // Format Malaysia: 01x-xxxxxxxx (10 digit) atau 011-xxxxxxxx (11 digit)
  // Juga terima format antarabangsa 601...
  return (cleaned.startsWith('01') && (cleaned.length === 10 || cleaned.length === 11)) ||
         (cleaned.startsWith('601') && (cleaned.length === 11 || cleaned.length === 12));
};

export const formatIC = (ic: string): string => {
  let cleaned = ic.replace(/\D/g, '');
  if (cleaned.length >= 12) {
    return cleaned.substring(0, 6) + '-' + cleaned.substring(6, 8) + '-' + cleaned.substring(8, 12);
  }
  return cleaned;
};

export const generateRegistrationId = (category: string, registrations: RegistrationsMap): string => {
  let categoryCount = 0;
  Object.values(registrations).forEach(reg => {
    const hasCategory = reg.students.some(student => student.category === category);
    if (hasCategory) {
      categoryCount++;
    }
  });

  const categoryCode = category.includes('12') ? '01' : '02';
  const count = String(categoryCount + 1).padStart(2, '0');
  
  return `MSSD-${categoryCode}-${count}`;
};

export const generatePlayerId = (
  gender: string, 
  schoolName: string, 
  studentIndex: number, 
  category: string, 
  regId: string
): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  let categoryCode = '15';
  if (category.includes('12')) {
    categoryCode = '12';
  } else if (category.includes('15')) {
    categoryCode = '15';
  } else if (category.includes('18')) {
    categoryCode = '18';
  }
  const genderCode = gender === 'Lelaki' ? '01' : '02';
  const schoolNo = regId ? regId.split('-').pop()?.padStart(2, '0') ?? '00' : '00';
  const playerCount = String(studentIndex + 1).padStart(2, '0');
  
  return `${year}${categoryCode}${genderCode}${schoolNo}${playerCount}`;
};

export const sendWhatsAppNotification = (regId: string, data: any, type: 'create' | 'update', adminPhone: string) => {
    if (!adminPhone) return;
    const isUpdate = type === 'update';
    const categoryCounts: Record<string, number> = {
        'L12': 0, 'P12': 0, 'L15': 0, 'P15': 0, 'L18': 0, 'P18': 0
    };
    data.students.forEach((student: any) => {
        const genderCode = student.gender === 'Lelaki' ? 'L' : 'P';
        const ageCode = student.category.includes('12') ? '12' : 
                       student.category.includes('15') ? '15' : '18';
        const key = genderCode + ageCode;
        if (categoryCounts[key] !== undefined) categoryCounts[key]++;
    });
    const categoryBreakdown: string[] = [];
    Object.entries(categoryCounts).forEach(([k, v]) => {
        if (v > 0) categoryBreakdown.push(`${k} - ${v} orang`);
    });
    const categoryText = categoryBreakdown.join(', ');
    const title = isUpdate ? '📢 NOTIFIKASI KEMASKINI PENDAFTARAN' : '📢 NOTIFIKASI PENDAFTARAN BERJAYA';
    const actionText = isUpdate ? 'telah berjaya mengemaskini pendaftaran' : 'telah berjaya mendaftar pasukan sekolah';
    const messageLines = [
        title, '', 'Assalamualaikum & Salam Sejahtera 👋', '',
        `Saya ${actionText} untuk PERTANDINGAN CATUR MSSD PASIR GUDANG ✅`, '',
        `🏫 Nama Sekolah: ${data.schoolName}`,
        `🆔 ID Pendaftaran: ${regId}`,
        `👩‍🏫 Nama Guru (Ketua): ${data.teachers[0].name}`,
        `📞 No. Telefon Guru: ${data.teachers[0].phone}`,
        `👥 Jumlah Pelajar: ${data.students.length} orang (${categoryText})`, '',
        'Terima kasih atas sokongan dan penyertaan anda. 🙏',
        'Sebarang maklumat lanjut akan dimaklumkan melalui WhatsApp rasmi MSSD Catur. 📱', '',
        '♟️ "Satukan Pemain, Gilap Bakat, Ukir Kejayaan" 🏆'
    ];
    const targetPhone = adminPhone.replace(/\D/g, '');
    const message = encodeURIComponent(messageLines.join('\n'));
    window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
};
