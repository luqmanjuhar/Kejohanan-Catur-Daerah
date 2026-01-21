
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, ExternalLink, RefreshCw, Trash2, Settings } from 'lucide-react';
import { loadAllDistricts, saveDistrict } from '../../services/api';
import { DistrictConfig } from '../../types';

const SuperAdminDashboard: React.FC = () => {
  const [districts, setDistricts] = useState<DistrictConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<DistrictConfig | null>(null);

  const fetchDistricts = async () => {
    setLoading(true);
    try {
      const data = await loadAllDistricts();
      setDistricts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDistricts(); }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const config: DistrictConfig = {
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      spreadsheetId: formData.get('spreadsheetId') as string,
      adminPhone: formData.get('adminPhone') as string,
      venue: formData.get('venue') as string,
      status: 'ACTIVE'
    };
    await saveDistrict(config);
    setShowModal(false);
    fetchDistricts();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-purple-100">
        <div>
          <h2 className="text-2xl font-bold text-purple-800 flex items-center gap-2">
            <ShieldCheck className="text-purple-600" /> Superadmin Console
          </h2>
          <p className="text-gray-500 text-sm">Uruskan semua subdomain dan pangkalan data daerah.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={fetchDistricts} className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { setEditItem(null); setShowModal(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">
                <Plus size={20} /> Tambah Daerah
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {districts.map(d => (
          <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
            <div className="p-5 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-800 text-lg uppercase">{d.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {d.status}
                    </span>
                </div>
                <p className="text-xs text-purple-600 font-mono mt-1">{d.id}.pendaftarancatur.com</p>
            </div>
            <div className="p-5 space-y-3">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-400 uppercase font-semibold">Pelajar Terdaftar</span>
                    <span className="font-bold text-gray-700">{d.totalStudents || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-gray-400 uppercase font-semibold">Ketua Guru</span>
                    <span className="font-bold text-gray-700">01{d.adminPhone?.slice(-9)}</span>
                </div>
                <div className="pt-3 flex gap-2">
                    <a href={`https://${d.id}.pendaftarancatur.com`} target="_blank" className="flex-1 text-center py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                        <ExternalLink size={14} /> Lawat Site
                    </a>
                    <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                        <Settings size={18} />
                    </button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scaleIn overflow-hidden">
                <div className="p-6 bg-purple-600 text-white">
                    <h3 className="text-xl font-bold">Daftar Daerah Baru</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Subdomain (e.g. muar)</label>
                        <input name="id" required className="w-full p-2 border rounded-lg bg-gray-50" placeholder="muar" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nama Daerah</label>
                        <input name="name" required className="w-full p-2 border rounded-lg bg-gray-50" placeholder="MSSD MUAR" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Spreadsheet ID</label>
                        <input name="spreadsheetId" required className="w-full p-2 border rounded-lg bg-gray-50 font-mono text-sm" placeholder="Paste ID here..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp Admin</label>
                        <input name="adminPhone" required className="w-full p-2 border rounded-lg bg-gray-50" placeholder="601..." />
                    </div>
                </div>
                <div className="p-6 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:text-gray-700">Batal</button>
                    <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold shadow-lg shadow-purple-200 hover:bg-purple-700">Simpan</button>
                </div>
            </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
