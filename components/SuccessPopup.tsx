
import React from 'react';
import { CheckCircle, X, Clipboard, ExternalLink } from 'lucide-react';

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  regId: string;
  schoolName: string;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ isOpen, onClose, regId, schoolName }) => {
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(regId);
    alert("ID Pendaftaran disalin!");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full animate-bounce">
              <CheckCircle size={64} className="text-green-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-gray-800 mb-2">Pendaftaran Berjaya!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Sila simpan ID pendaftaran di bawah untuk rujukan dan kemaskini pada masa akan datang.
          </p>

          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 mb-8 relative group">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID Pendaftaran</p>
             <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-black text-green-600 font-mono tracking-tighter">{regId}</span>
                <button onClick={copyToClipboard} className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-green-600 shadow-sm">
                    <Clipboard size={18} />
                </button>
             </div>
             <p className="mt-4 text-xs font-bold text-gray-700 uppercase">{schoolName}</p>
          </div>

          <div className="space-y-3">
            <button 
                onClick={onClose}
                className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black hover:bg-black transition-all shadow-xl shadow-gray-200 uppercase text-xs tracking-widest"
            >
                Tutup & Kembali
            </button>
            <p className="text-[10px] text-gray-400 font-bold italic">
                Satu notifikasi WhatsApp telah dihantar kepada Admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPopup;
