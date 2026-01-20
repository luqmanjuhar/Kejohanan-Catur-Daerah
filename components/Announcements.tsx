import React, { useState } from 'react';
import { EventConfig, ScheduleDay as ScheduleDayType } from '../types';

interface AnnouncementsProps {
  config: EventConfig;
}

const Announcements: React.FC<AnnouncementsProps> = ({ config }) => {
  const [activeSchedule, setActiveSchedule] = useState<string | null>(null);

  const toggle = (id: string) => setActiveSchedule(activeSchedule === id ? null : id);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-orange-600 mb-6">📢 Pengumuman Kejohanan</h2>
      
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-6 shadow-md">
         <h3 className="text-xl font-bold mb-2">📅 Jadual Pertandingan</h3>
         <div className="text-center">
            <h4 className="text-lg font-semibold uppercase">{config.eventName}</h4>
            <p className="text-blue-100">Tempat: {config.eventVenue}</p>
         </div>
      </div>

      {/* Primary Schedule */}
      <div className="mb-4 bg-green-50 border border-green-200 rounded-lg overflow-hidden">
        <button 
            onClick={() => toggle('primary')}
            className="w-full p-4 flex justify-between items-center bg-green-100 hover:bg-green-200 text-green-800 font-bold transition-colors"
        >
            <span>🏫 SEKOLAH RENDAH (L/P 12)</span>
            <span>{activeSchedule === 'primary' ? '▲' : '▼'}</span>
        </button>
        {activeSchedule === 'primary' && (
            <div className="p-4 grid lg:grid-cols-2 gap-6">
                {config.schedules.primary.length > 0 ? (
                    config.schedules.primary.map((day, idx) => (
                        <ScheduleDay 
                            key={idx}
                            date={day.date}
                            color="green"
                            events={day.items}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-500 italic col-span-2 py-4">Jadual belum dikemaskini.</p>
                )}
            </div>
        )}
      </div>

      {/* Secondary Schedule */}
       <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
        <button 
            onClick={() => toggle('secondary')}
            className="w-full p-4 flex justify-between items-center bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold transition-colors"
        >
            <span>🎓 SEKOLAH MENENGAH (L/P 15/18)</span>
            <span>{activeSchedule === 'secondary' ? '▲' : '▼'}</span>
        </button>
        {activeSchedule === 'secondary' && (
            <div className="p-4 grid lg:grid-cols-2 gap-6">
                 {config.schedules.secondary.length > 0 ? (
                    config.schedules.secondary.map((day, idx) => (
                        <ScheduleDay 
                            key={idx}
                            date={day.date}
                            color="purple"
                            events={day.items}
                        />
                    ))
                ) : (
                    <p className="text-center text-gray-500 italic col-span-2 py-4">Jadual belum dikemaskini.</p>
                )}
            </div>
        )}
      </div>

      {/* Links Grid */}
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <ResourceCard 
            title="📋 Peraturan Pertandingan" 
            desc="Sila rujuk peraturan lengkap pertandingan." 
            link={config.links.rules} 
            btnText="📖 Muat Turun Peraturan"
            color="yellow"
        />
        <ResourceCard 
            title="🏆 Keputusan Catur" 
            desc="Lihat keputusan terkini dan kedudukan." 
            link={config.links.results} 
            btnText="🏅 Lihat Keputusan"
            color="green"
        />
        <ResourceCard 
            title="🖼️ Gambar & Media" 
            desc="Koleksi gambar dan media berkaitan." 
            link={config.links.photos} 
            btnText="📸 Lihat Gambar"
            color="red"
        />
      </div>
    </div>
  );
};

// Fix: Property 'key' does not exist on type '{ date: string; events: any[]; color: "green" | "purple"; }'.
const ScheduleDay: React.FC<{ date: string; events: any[]; color: 'green' | 'purple' }> = ({ date, events, color }) => {
    const headerClass = color === 'green' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800';
    
    return (
        <div className="bg-white rounded border shadow-sm">
            <div className={`p-2 font-bold text-center ${headerClass} rounded-t`}>{date}</div>
            <div className="divide-y divide-gray-100">
                {events.map((e: any, i: number) => {
                     // Simple heuristic for highlighting based on keywords
                     const lowerAct = e.activity.toLowerCase();
                     const isHighlight = lowerAct.includes('pusingan');
                     const isSpecial = lowerAct.includes('penutup') || lowerAct.includes('majlis');
                     const isNeutral = lowerAct.includes('rehat') || lowerAct.includes('makan');

                     return (
                        <div key={i} className={`p-3 flex text-sm ${isHighlight ? 'bg-yellow-50' : isSpecial ? 'bg-red-50' : isNeutral ? 'bg-gray-50' : ''}`}>
                            <span className="w-1/3 font-medium text-gray-600">{e.time}</span>
                            <span className={`w-2/3 ${isHighlight ? 'font-semibold text-orange-700' : isSpecial ? 'font-bold text-red-700' : 'text-gray-800'}`}>
                                {e.activity}
                            </span>
                        </div>
                     );
                })}
            </div>
        </div>
    );
};

const ResourceCard = ({ title, desc, link, btnText, color }: any) => {
    const colors = {
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-600',
        green: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-600',
        red: 'bg-red-50 border-red-200 text-red-800 hover:bg-red-600'
    };
    // Simplified color logic for button
    const btnClass = color === 'yellow' ? 'bg-yellow-600' : color === 'green' ? 'bg-green-600' : 'bg-red-600';
    const isLink = link && link !== '#' && link !== '';

    return (
        <div className={`border rounded-lg p-6 text-center ${(colors as any)[color].split(' hover')[0]}`}>
            <h3 className="text-lg font-bold mb-3">{title}</h3>
            <p className="text-gray-700 text-sm mb-4">{desc}</p>
            {isLink ? (
                <a href={link} target="_blank" rel="noreferrer" className={`inline-block px-4 py-2 text-white rounded-lg transition-colors ${btnClass} hover:opacity-90`}>
                    {btnText}
                </a>
            ) : (
                <button disabled className="px-4 py-2 text-white rounded-lg bg-gray-400 cursor-not-allowed">
                    Belum Tersedia
                </button>
            )}
        </div>
    );
};

export default Announcements;
