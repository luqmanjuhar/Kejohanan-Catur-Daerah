
import React, { useMemo } from 'react';
import { RegistrationsMap, Registration } from '../../types';
import { Users, School, GraduationCap, UserCheck } from 'lucide-react';

interface DashboardProps {
  registrations: RegistrationsMap;
  onRefresh: () => void;
  onOpenSetup: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ registrations, onRefresh, onOpenSetup }) => {
  const stats = useMemo(() => {
    let totalStudents = 0;
    let totalTeachers = 0;
    const schools = new Set<string>();
    
    // Counters
    const counters = {
        primary: { 
            schools: new Set<string>(), 
            u12m: 0, u12f: 0,
            race: { 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 } as Record<string, number>
        },
        secondary: { 
            schools: new Set<string>(), 
            u15m: 0, u15f: 0, u18m: 0, u18f: 0,
            raceU15: { 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 } as Record<string, number>,
            raceU18: { 'Melayu': 0, 'Cina': 0, 'India': 0, 'Bumiputera': 0, 'Lain-lain': 0 } as Record<string, number>
        }
    };

    Object.values(registrations).forEach((reg: Registration) => {
        totalTeachers += reg.teachers.length;
        totalStudents += reg.students.length;
        schools.add(reg.schoolName);
        
        let hasU12 = false;
        let hasSec = false;

        reg.students.forEach(s => {
            const isMale = s.gender === 'Lelaki';
            const race = (s.race && counters.primary.race.hasOwnProperty(s.race)) ? s.race : 'Lain-lain';

            if (s.category.includes('12')) {
                hasU12 = true;
                if(isMale) counters.primary.u12m++; else counters.primary.u12f++;
                counters.primary.race[race]++;
            } else if (s.category.includes('15')) {
                hasSec = true;
                if(isMale) counters.secondary.u15m++; else counters.secondary.u15f++;
                counters.secondary.raceU15[race]++;
            } else if (s.category.includes('18')) {
                hasSec = true;
                if(isMale) counters.secondary.u18m++; else counters.secondary.u18f++;
                counters.secondary.raceU18[race]++;
            }
        });

        if (hasU12) counters.primary.schools.add(reg.schoolName);
        if (hasSec) counters.secondary.schools.add(reg.schoolName);
    });

    return { totalStudents, totalTeachers, totalSchools: schools.size, counters };
  }, [registrations]);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center px-2">
        <h2 className="text-xl md:text-2xl font-black text-orange-600 uppercase tracking-tighter">📊 Status Pendaftaran</h2>
        <div className="flex gap-2">
            <button onClick={onOpenSetup} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 text-xs uppercase tracking-wider transition-all">
                Setup
            </button>
            <button onClick={onRefresh} className="px-4 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 text-xs uppercase tracking-wider shadow-lg shadow-orange-100 transition-all active:scale-95">
                Segerak
            </button>
        </div>
       </div>

       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard label="Pendaftaran" value={Object.keys(registrations).length} icon={<GraduationCap />} color="orange" />
            <StatCard label="Pelajar" value={stats.totalStudents} icon={<Users />} color="amber" />
            <StatCard label="Sekolah" value={stats.totalSchools} icon={<School />} color="yellow" />
            <StatCard label="Guru" value={stats.totalTeachers} icon={<UserCheck />} color="red" />
       </div>

       <div className="bg-white rounded-[2rem] p-6 md:p-10 border-2 border-orange-50 shadow-sm">
            <h3 className="text-lg font-black text-gray-800 mb-8 text-center uppercase tracking-widest border-b-2 border-orange-100 pb-4">Analisis Kategori Pasir Gudang</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="text-center">
                    <div className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black mb-6 inline-block shadow-xl shadow-emerald-100 text-xs uppercase tracking-widest">
                        <div className="text-2xl">{stats.counters.primary.schools.size}</div>
                        <div>Sekolah Rendah</div>
                    </div>
                    <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-3xl p-6 mx-auto">
                        <div className="font-black text-emerald-800 mb-4 uppercase text-xs tracking-wider">Bawah 12 Tahun (U12)</div>
                        <div className="grid grid-cols-2 gap-3 text-xs mb-6 font-black">
                            <div className="bg-white border-2 border-blue-100 text-blue-600 px-3 py-3 rounded-2xl shadow-sm">
                                <span className="block text-xl mb-1">{stats.counters.primary.u12m}</span> LELAKI
                            </div>
                            <div className="bg-white border-2 border-pink-100 text-pink-600 px-3 py-3 rounded-2xl shadow-sm">
                                <span className="block text-xl mb-1">{stats.counters.primary.u12f}</span> PEREMPUAN
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <div className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black mb-6 inline-block shadow-xl shadow-indigo-100 text-xs uppercase tracking-widest">
                        <div className="text-2xl">{stats.counters.secondary.schools.size}</div>
                        <div>Sekolah Menengah</div>
                    </div>
                    <div className="space-y-6 mx-auto">
                        <div className="bg-indigo-50/50 border-2 border-indigo-100 rounded-3xl p-6">
                            <div className="font-black text-indigo-800 mb-4 uppercase text-xs tracking-wider">U15 & U18 (Menengah)</div>
                            <div className="grid grid-cols-2 gap-3 text-xs font-black">
                                <div className="bg-white border-2 border-blue-100 text-blue-600 px-3 py-3 rounded-2xl shadow-sm">
                                    <span className="block text-xl mb-1">{stats.counters.secondary.u15m + stats.counters.secondary.u18m}</span> LELAKI
                                </div>
                                <div className="bg-white border-2 border-pink-100 text-pink-600 px-3 py-3 rounded-2xl shadow-sm">
                                    <span className="block text-xl mb-1">{stats.counters.secondary.u15f + stats.counters.secondary.u18f}</span> PEREMPUAN
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
       </div>

       <div className="bg-white rounded-[2rem] border-2 border-orange-50 p-6 md:p-10 shadow-sm">
            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3">
                <div className="bg-orange-600 text-white p-2 rounded-xl"><School size={20}/></div>
                SENARAI SEKOLAH BERDAFTAR
            </h3>
            {Object.entries(registrations).length === 0 ? (
                <div className="text-center text-gray-400 py-12 font-bold italic bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">Tiada rekod pendaftaran ditemui.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(registrations).map(([id, reg]) => (
                        <SchoolListItem key={id} id={id} reg={reg as Registration} />
                    ))}
                </div>
            )}
       </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
    const colorClasses = {
        orange: "from-orange-600 to-orange-700 text-orange-100 shadow-orange-100",
        amber: "from-amber-600 to-amber-700 text-amber-100 shadow-amber-100",
        yellow: "from-yellow-600 to-yellow-700 text-yellow-100 shadow-yellow-100",
        red: "from-red-600 to-red-700 text-red-100 shadow-red-100",
    }[color as string] || "from-gray-600 to-gray-700 text-gray-100 shadow-gray-100";

    return (
        <div className={`bg-gradient-to-br ${colorClasses} rounded-3xl p-5 md:p-7 text-white shadow-xl transform transition-all hover:scale-[1.02]`}>
            <div className="flex justify-between items-start mb-4">
                <div className="text-2xl md:text-3xl font-black">{value}</div>
                <div className="opacity-80 p-2.5 bg-white/20 rounded-2xl backdrop-blur-sm">{icon}</div>
            </div>
            <div className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-90">{label}</div>
        </div>
    );
};

const SchoolListItem: React.FC<{ id: string; reg: Registration }> = ({ id, reg }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className="bg-white rounded-3xl border-2 border-gray-50 overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-5 flex justify-between items-center active:bg-gray-50 touch-none"
            >
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-black text-gray-800 text-sm md:text-base truncate uppercase">{reg.schoolName}</h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter">ID: {id}</span>
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter">{reg.students.length} PELAJAR</span>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gray-50 group-hover:bg-orange-600 group-hover:text-white ${expanded ? 'rotate-180 bg-orange-600 text-white' : ''}`}>
                    <span className="text-[10px]">▼</span>
                </div>
            </button>
            {expanded && (
                <div className="px-5 pb-6 animate-fadeIn">
                    <div className="grid grid-cols-1 gap-6 pt-4 border-t border-gray-50">
                        <div>
                            <h5 className="font-black text-[10px] text-orange-600 mb-3 uppercase tracking-[0.2em] opacity-70">GURU PEMBIMBING</h5>
                            <div className="space-y-2">
                                {reg.teachers.map((t, i) => (
                                    <div key={i} className="text-xs font-bold text-gray-700 flex items-center gap-2 bg-orange-50/50 p-2.5 rounded-xl border border-orange-100">
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                                        {t.name} <span className="text-[9px] opacity-50 ml-auto">({t.position})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
