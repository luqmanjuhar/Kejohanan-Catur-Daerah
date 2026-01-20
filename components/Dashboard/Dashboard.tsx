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
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-orange-600">📊 Dashboard Pendaftaran</h2>
        <div className="flex gap-2">
            <button onClick={onOpenSetup} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                ⚙️ Setup
            </button>
            <button onClick={onRefresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                🔄 Segerak
            </button>
        </div>
       </div>

       {/* Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Jumlah Pendaftaran" value={Object.keys(registrations).length} icon={<GraduationCap />} color="orange" />
            <StatCard label="Jumlah Pelajar" value={stats.totalStudents} icon={<Users />} color="amber" />
            <StatCard label="Jumlah Sekolah" value={stats.totalSchools} icon={<School />} color="yellow" />
            <StatCard label="Jumlah Guru" value={stats.totalTeachers} icon={<UserCheck />} color="red" />
       </div>

       {/* Tree Breakdown */}
       <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-indigo-800 mb-6 text-center">Analisis Pendaftaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Primary */}
                <div className="text-center">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold mb-4 inline-block shadow">
                        <div className="text-2xl font-bold">{stats.counters.primary.schools.size}</div>
                        <div className="text-sm">Sekolah Kebangsaan</div>
                    </div>
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3 mx-auto max-w-sm">
                        <div className="font-semibold text-green-800 mb-2">Bawah 12 Tahun</div>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div className="bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                <span className="font-bold block text-lg">{stats.counters.primary.u12m}</span> Lelaki
                            </div>
                            <div className="bg-pink-200 text-pink-800 px-2 py-1 rounded">
                                <span className="font-bold block text-lg">{stats.counters.primary.u12f}</span> Perempuan
                            </div>
                        </div>
                        
                        {/* Race Breakdown Primary */}
                        <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="text-xs font-semibold text-green-800 mb-1 text-left">Mengikut Bangsa:</div>
                            <div className="grid grid-cols-2 gap-1 text-xs text-left">
                                {Object.entries(stats.counters.primary.race).map(([race, count]) => (
                                    // Fix: Operator '>' cannot be applied to types 'unknown' and 'number'.
                                    (count as number) > 0 && (
                                    <div key={race} className="flex justify-between bg-white/50 px-2 rounded">
                                        <span>{race}:</span> <span className="font-bold">{count}</span>
                                    </div>
                                    )
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secondary */}
                <div className="text-center">
                    <div className="bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold mb-4 inline-block shadow">
                        <div className="text-2xl font-bold">{stats.counters.secondary.schools.size}</div>
                        <div className="text-sm">Sekolah Menengah</div>
                    </div>
                    <div className="space-y-3 mx-auto max-w-sm">
                        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                            <div className="font-semibold text-purple-800 mb-2">Bawah 15 Tahun</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                    <span className="font-bold block text-lg">{stats.counters.secondary.u15m}</span> Lelaki
                                </div>
                                <div className="bg-pink-200 text-pink-800 px-2 py-1 rounded">
                                    <span className="font-bold block text-lg">{stats.counters.secondary.u15f}</span> Perempuan
                                </div>
                            </div>
                            
                            {/* Race Breakdown U15 */}
                            <div className="mt-2 pt-2 border-t border-purple-200">
                                <div className="text-xs font-semibold text-purple-800 mb-1 text-left">Mengikut Bangsa:</div>
                                <div className="grid grid-cols-2 gap-1 text-xs text-left">
                                    {Object.entries(stats.counters.secondary.raceU15).map(([race, count]) => (
                                        // Fix: Operator '>' cannot be applied to types 'unknown' and 'number'.
                                        (count as number) > 0 && (
                                        <div key={race} className="flex justify-between bg-white/50 px-2 rounded">
                                            <span>{race}:</span> <span className="font-bold">{count}</span>
                                        </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3">
                            <div className="font-semibold text-purple-800 mb-2">Bawah 18 Tahun</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                    <span className="font-bold block text-lg">{stats.counters.secondary.u18m}</span> Lelaki
                                </div>
                                <div className="bg-pink-200 text-pink-800 px-2 py-1 rounded">
                                    <span className="font-bold block text-lg">{stats.counters.secondary.u18f}</span> Perempuan
                                </div>
                            </div>
                            
                            {/* Race Breakdown U18 */}
                            <div className="mt-2 pt-2 border-t border-purple-200">
                                <div className="text-xs font-semibold text-purple-800 mb-1 text-left">Mengikut Bangsa:</div>
                                <div className="grid grid-cols-2 gap-1 text-xs text-left">
                                    {Object.entries(stats.counters.secondary.raceU18).map(([race, count]) => (
                                        // Fix: Operator '>' cannot be applied to types 'unknown' and 'number'.
                                        (count as number) > 0 && (
                                        <div key={race} className="flex justify-between bg-white/50 px-2 rounded">
                                            <span>{race}:</span> <span className="font-bold">{count}</span>
                                        </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
       </div>

       {/* School List */}
       <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Senarai Sekolah Berdaftar</h3>
            {Object.entries(registrations).length === 0 ? (
                <div className="text-center text-gray-500 py-8">Tiada pendaftaran lagi.</div>
            ) : (
                <div className="space-y-3">
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
        orange: "from-orange-600 to-orange-700 text-orange-100",
        amber: "from-amber-600 to-amber-700 text-amber-100",
        yellow: "from-yellow-600 to-yellow-700 text-yellow-100",
        red: "from-red-600 to-red-700 text-red-100",
    }[color as string] || "from-gray-600 to-gray-700 text-gray-100";

    return (
        <div className={`bg-gradient-to-br ${colorClasses} rounded-lg p-6 text-white shadow-lg`}>
            <div className="flex justify-between items-start">
                <div className="text-3xl font-bold">{value}</div>
                <div className="opacity-80 p-2 bg-white/10 rounded-full">{icon}</div>
            </div>
            <div className="mt-2 text-sm font-medium opacity-90">{label}</div>
        </div>
    );
};

// Fix: Type '{ key: string; id: string; reg: Registration; }' is not assignable to type '{ id: string; reg: Registration; }'.
const SchoolListItem: React.FC<{ id: string; reg: Registration }> = ({ id, reg }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 hover:bg-gray-100 transition-colors flex justify-between items-center"
            >
                <div>
                    <h3 className="font-bold text-indigo-900">{reg.schoolName}</h3>
                    <p className="text-xs text-gray-500 mt-1">ID: {id} • {reg.students.length} Pelajar</p>
                </div>
                <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {expanded && (
                <div className="p-4 pt-0 border-t border-gray-200 bg-white">
                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                        <div>
                            <h5 className="font-semibold text-sm text-gray-600 mb-2">Guru</h5>
                            {reg.teachers.map((t, i) => (
                                <div key={i} className="text-sm mb-1">{t.name} ({t.position}) - {t.phone}</div>
                            ))}
                        </div>
                        <div>
                            <h5 className="font-semibold text-sm text-gray-600 mb-2">Pelajar</h5>
                             <div className="max-h-32 overflow-y-auto space-y-1">
                                {reg.students.map((s, i) => (
                                    <div key={i} className="text-xs bg-gray-100 p-1 rounded flex justify-between">
                                        <span>{s.name}</span>
                                        <span className="font-mono">{s.gender === 'Lelaki' ? 'L' : 'P'}{s.category.replace(/[^0-9]/g, '')}</span>
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
