
import React, { useMemo } from 'react';
import { RegistrationsMap, Registration } from '../../types';
import { Users, School, GraduationCap, UserCheck, MapPin, Phone } from 'lucide-react';

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
    <div className="space-y-6 animate-fadeIn">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📊 Dashboard Utama</h2>
            <p className="text-gray-400 text-sm mt-1 font-medium italic">Statistik pendaftaran terkini dari pangkalan data cloud.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={onRefresh} className="flex-1 md:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                🔄 Segerak Data
            </button>
            <button onClick={onOpenSetup} className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors">
                ⚙️
            </button>
        </div>
       </div>

       {/* Quick Stats Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="ID Pendaftaran" value={Object.keys(registrations).length} icon={<GraduationCap />} color="orange" />
            <StatCard label="Jumlah Pelajar" value={stats.totalStudents} icon={<Users />} color="amber" />
            <StatCard label="Jumlah Sekolah" value={stats.totalSchools} icon={<School />} color="yellow" />
            <StatCard label="Jumlah Guru" value={stats.totalTeachers} icon={<UserCheck />} color="red" />
       </div>

       {/* Detailed Breakdown */}
       <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/5 rounded-full"></div>
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-white/5 rounded-full"></div>
            
            <h3 className="text-xl md:text-2xl font-bold mb-8 flex items-center gap-3">
                <span className="bg-white/20 p-2 rounded-xl">📈</span> Analisis Mengikut Kategori
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Primary Section */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Kategori Rendah</span>
                            <h4 className="text-xl font-bold mt-1">Bawah 12 Tahun</h4>
                        </div>
                        <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                            {stats.counters.primary.schools.size} SK
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white/10 p-4 rounded-xl text-center">
                            <span className="text-3xl font-bold block">{stats.counters.primary.u12m}</span>
                            <span className="text-xs uppercase font-bold opacity-60">Lelaki</span>
                        </div>
                        <div className="bg-white/10 p-4 rounded-xl text-center">
                            <span className="text-3xl font-bold block">{stats.counters.primary.u12f}</span>
                            <span className="text-xs uppercase font-bold opacity-60">Perempuan</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase opacity-60">Agihan Bangsa:</span>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(stats.counters.primary.race).map(([race, count]) => (
                                (count as number) > 0 && (
                                    <div key={race} className="bg-black/20 px-2.5 py-1 rounded-lg text-xs flex gap-2">
                                        <span className="opacity-70">{race}</span>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secondary Section */}
                <div className="space-y-4">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold">Bawah 15 Tahun</h4>
                            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                                {stats.counters.secondary.u15m + stats.counters.secondary.u15f} Pelajar
                            </div>
                        </div>
                        <div className="flex gap-4">
                             <div className="flex-1 bg-white/5 p-3 rounded-xl">
                                <span className="text-lg font-bold">{stats.counters.secondary.u15m}</span> <span className="text-[10px] uppercase font-bold opacity-60">Lelaki</span>
                             </div>
                             <div className="flex-1 bg-white/5 p-3 rounded-xl">
                                <span className="text-lg font-bold">{stats.counters.secondary.u15f}</span> <span className="text-[10px] uppercase font-bold opacity-60">Perempuan</span>
                             </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold">Bawah 18 Tahun</h4>
                            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                                {stats.counters.secondary.u18m + stats.counters.secondary.u18f} Pelajar
                            </div>
                        </div>
                        <div className="flex gap-4">
                             <div className="flex-1 bg-white/5 p-3 rounded-xl">
                                <span className="text-lg font-bold">{stats.counters.secondary.u18m}</span> <span className="text-[10px] uppercase font-bold opacity-60">Lelaki</span>
                             </div>
                             <div className="flex-1 bg-white/5 p-3 rounded-xl">
                                <span className="text-lg font-bold">{stats.counters.secondary.u18f}</span> <span className="text-[10px] uppercase font-bold opacity-60">Perempuan</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
       </div>

       {/* Registered Schools List */}
       <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <h3 className="text-lg font-bold text-gray-800">Senarai Sekolah Berdaftar</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-bold">{Object.keys(registrations).length} Sekolah</span>
            </div>
            <div className="p-2">
                {Object.entries(registrations).length === 0 ? (
                    <div className="text-center text-gray-400 py-16 flex flex-col items-center gap-2">
                        <span className="text-4xl">📭</span>
                        <p className="font-medium">Tiada pendaftaran dikesan dalam pangkalan data.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {Object.entries(registrations).map(([id, reg]) => (
                            <SchoolListItem key={id} id={id} reg={reg as Registration} />
                        ))}
                    </div>
                )}
            </div>
       </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => {
    const colorClasses = {
        orange: "from-orange-500 to-orange-600 shadow-orange-100",
        amber: "from-amber-500 to-amber-600 shadow-amber-100",
        yellow: "from-yellow-500 to-yellow-600 shadow-yellow-100",
        red: "from-red-500 to-red-600 shadow-red-100",
    }[color as string] || "from-gray-500 to-gray-600";

    return (
        <div className={`bg-gradient-to-br ${colorClasses} rounded-2xl p-6 text-white shadow-xl transition-transform hover:-translate-y-1`}>
            <div className="flex justify-between items-start">
                <div className="text-3xl font-extrabold">{value}</div>
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">{icon}</div>
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wider opacity-80">{label}</div>
        </div>
    );
};

const SchoolListItem: React.FC<{ id: string; reg: Registration }> = ({ id, reg }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className="group transition-colors hover:bg-orange-50/30">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 md:p-5 flex justify-between items-center transition-all"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white border-2 border-orange-100 rounded-xl flex items-center justify-center text-lg font-bold text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                        {reg.schoolName.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors uppercase text-sm md:text-base">{reg.schoolName}</h3>
                        <div className="flex gap-3 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">🆔 {id}</span>
                            <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1 uppercase tracking-tighter">👥 {reg.students.length} Pelajar</span>
                        </div>
                    </div>
                </div>
                <div className={`text-orange-300 transform transition-transform ${expanded ? 'rotate-180 text-orange-600' : ''}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            </button>
            {expanded && (
                <div className="p-6 pt-0 animate-fadeIn bg-orange-50/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-2xl border border-orange-50 shadow-sm">
                        <div>
                            <h5 className="font-bold text-xs text-orange-600 mb-3 uppercase flex items-center gap-2">
                                <UserCheck size={14} /> Maklumat Pengurus (Guru)
                            </h5>
                            <div className="space-y-3">
                                {reg.teachers.map((t, i) => (
                                    <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="text-xs font-bold text-gray-800">{t.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium flex gap-3 mt-1">
                                            <span>{t.position}</span>
                                            <span>📞 {t.phone}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h5 className="font-bold text-xs text-blue-600 mb-3 uppercase flex items-center gap-2">
                                <Users size={14} /> Senarai Peserta
                            </h5>
                             <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                {reg.students.map((s, i) => (
                                    <div key={i} className="text-[10px] bg-white border border-gray-100 p-2.5 rounded-xl flex justify-between items-center shadow-sm">
                                        <div>
                                            <span className="font-bold text-gray-700 block uppercase">{s.name}</span>
                                            <span className="text-gray-400 font-mono text-[9px]">{s.playerId}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg font-bold text-[9px] ${s.gender === 'Lelaki' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                            {s.gender === 'Lelaki' ? 'L' : 'P'}{s.category.replace(/[^0-9]/g, '')}
                                        </span>
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
