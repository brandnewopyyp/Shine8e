import React, { useState, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Calculator, 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  FileText
} from 'lucide-react';

interface HomeworkSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolve: (problemText: string, image?: string, mimeType?: string, subject?: string) => void;
}

export const HomeworkSolverModal: React.FC<HomeworkSolverModalProps> = ({
  isOpen,
  onClose,
  onSolve,
}) => {
  const [problemText, setProblemText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [selectedSubject, setSelectedSubject] = useState('Математик');
  const [gradeLevel, setGradeLevel] = useState('ЕБС (Дунд/Ахлах анги)');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim() && !imagePreview) return;

    onSolve(
      problemText.trim() || `Дараах ${selectedSubject}-ийн бодлогыг зурагнаас уншиж бүрэн алхамчлан бодож өгнө үү.`,
      imagePreview || undefined,
      mimeType,
      selectedSubject
    );
    onClose();
  };

  const subjects = [
    { id: 'Математик', label: '📐 Математик' },
    { id: 'Физик', label: '⚡ Физик' },
    { id: 'Хими', label: '🧪 Хими' },
    { id: 'Биологи', label: '🧬 Биологи' },
    { id: 'Монгол хэл', label: '🇲🇳 Монгол хэл' },
    { id: 'Англи хэл', label: '🇬🇧 Англи хэл' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 sm:p-6 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Бодлого бодогч & Даалгаврын Vision</h2>
            <p className="text-xs text-slate-400">Бодлогын зургийг оруулахад Gemini шууд алхамчлан тайлбарлана</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject choice */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Хичээл сонгох:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSubject(s.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium text-left border transition-all ${
                    selectedSubject === s.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/70'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Drop Zone */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Бодлогын зураг оруулах (Ном, дэвтэр, самбарын зураг):
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                imagePreview
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-700 hover:border-blue-500 bg-slate-950/60 hover:bg-slate-950'
              }`}
            >
              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 rounded-lg object-contain mb-2 shadow-md"
                  />
                  <span className="text-xs text-emerald-400 font-medium">
                    Зураг амжилттай хавсаргагдлаа (Солих бол товшино уу)
                  </span>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 animate-bounce" />
                  <p className="text-xs font-medium text-slate-200">
                    Зургаа энд чирж тавих эсвэл товшиж сонгоно уу
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Гар бичмэл, график, томьёо бүхий бүх зургийг дэмжинэ
                  </p>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Problem text description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Бодлогын нөхцөл (Хэрэв бичвэрээр нэмэх бол):
            </label>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Жишээ: 100 грамм 20%-ийн давсны уусмал дээр 50 гр ус нэмбэл концентраци нь хэд болох вэ?"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!problemText.trim() && !imagePreview}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Шууд алхамчлан бодох</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
