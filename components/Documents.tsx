
import React from 'react';
import { FileText, Users, Scale } from 'lucide-react';
import { EventConfig } from '../types';

interface DocumentsProps {
  config: EventConfig;
}

const Documents: React.FC<DocumentsProps> = ({ config }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-orange-600 mb-6">📄 Dokumen Tambahan</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DocCard 
            icon={<FileText size={40} />}
            title="Surat Jemputan"
            desc="Surat rasmi jemputan untuk kejohanan catur MSSD"
            link={config.documents.invitation}
            color="blue"
        />
        <DocCard 
            icon={<Users size={40} />}
            title="Surat Mesyuarat"
            desc="Notis mesyuarat untuk pengurus dan guru pengiring"
            link={config.documents.meeting}
            color="green"
        />
        <DocCard 
            icon={<Scale size={40} />}
            title="Lantikan Arbiter"
            desc="Surat lantikan rasmi untuk arbiter kejohanan"
            link={config.documents.arbiter}
            color="purple"
        />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">ℹ️ Maklumat Tambahan</h3>
        <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2"><span className="text-orange-500">•</span> Semua dokumen dalam format PDF.</li>
            <li className="flex items-center gap-2"><span className="text-orange-500">•</span> Sila pastikan akses internet stabil.</li>
            <li className="flex items-center gap-2"><span className="text-orange-500">•</span> Hubungi urusetia jika pautan rosak.</li>
        </ul>
      </div>
    </div>
  );
};

const DocCard = ({ icon, title, desc, link, color }: any) => {
    const bg = color === 'blue' ? 'bg-blue-50 border-blue-200' : color === 'green' ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200';
    const text = color === 'blue' ? 'text-blue-800' : color === 'green' ? 'text-green-800' : 'text-purple-800';
    const btn = color === 'blue' ? 'bg-blue-600' : color === 'green' ? 'bg-green-600' : 'bg-purple-600';
    const isLink = link && link !== '#' && link !== '';

    return (
        <div className={`${bg} border rounded-lg p-6 text-center transition-transform hover:-translate-y-1`}>
            <div className={`flex justify-center mb-4 ${text}`}>{icon}</div>
            <h3 className={`text-lg font-bold mb-2 ${text}`}>{title}</h3>
            <p className="text-gray-600 text-sm mb-4">{desc}</p>
            {isLink ? (
                <a href={link} target="_blank" rel="noreferrer" className={`inline-block px-4 py-2 text-white rounded text-sm ${btn} hover:opacity-90`}>
                    📥 Muat Turun
                </a>
            ) : (
                <button disabled className="px-4 py-2 text-white rounded text-sm bg-gray-400 cursor-not-allowed">
                    Tiada Pautan
                </button>
            )}
        </div>
    );
};

export default Documents;
