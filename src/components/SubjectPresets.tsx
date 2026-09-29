import React from 'react';
import { 
  Calculator, 
  BookOpen, 
  Search, 
  Code2, 
  Camera, 
  Sparkles, 
  ArrowUpRight,
  Atom,
  Languages,
  PenTool
} from 'lucide-react';
import { GeminiMode } from '../types';

interface SubjectPresetsProps {
  onSelectPrompt: (prompt: string, mode: GeminiMode, subject?: string) => void;
  onOpenHomeworkSolver: () => void;
}

export const SubjectPresets: React.FC<SubjectPresetsProps> = ({
  onSelectPrompt,
  onOpenHomeworkSolver,
}) => {
  const cards = [
    {
      title: 'Бодлого бодогч (STEM)',
      subtitle: 'Математик, Физик, Химийн алхамчилсан бодолт',
      icon: <Calculator className="w-5 h-5 text-emerald-400" />,
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30 hover:border-emerald-500/60',
      badge: 'Алхамчилсан',
      mode: 'math' as GeminiMode,
      subject: 'math',
      prompts: [
        'x² - 7x + 12 = 0 тэгшитгэлийг Виетийн теорем болон дискриминант ашиглан бодож шалга',
        '20 м/с хурдтай хэвтээ шидэгдсэн биеийн 3 секундын дараах өндөр ба туулах зайг ол (g=9.8)',
      ],
    },
    {
      title: 'Бүх Хичээлийн Туслах',
      subtitle: 'Монгол хэл, Англи, Түүх, Биологи, Эсээ',
      icon: <BookOpen className="w-5 h-5 text-violet-400" />,
      color: 'from-violet-500/10 to-purple-500/10 border-violet-500/30 hover:border-violet-500/60',
      badge: 'Даалгавар',
      mode: 'homework' as GeminiMode,
      subject: 'mongolian',
      prompts: [
        'Монгол хэлний дагавар нөхцөлүүдийн эгшиг зохицох ёсыг тодорхой жишээтэй тайлбарла',
        'IELTS Writing Task 2-т зориулсан "Хиймэл оюун ухааны боловсрол дахь нөлөө" сэдэвт эсээний төлөвлөгөө гаргаж өг',
      ],
    },
    {
      title: 'Google Шууд Хайлт & Social',
      subtitle: 'Бодит цагийн интернэт эх сурвалж & баримтууд',
      icon: <Search className="w-5 h-5 text-amber-400" />,
      color: 'from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/60',
      badge: 'Google Grounding',
      mode: 'search' as GeminiMode,
      subject: 'general',
      prompts: [
        '2026 оны дэлхийн сансар судлалын хамгийн том ололт амжилтууд юу байна вэ? Эх сурвалжтай нь харуул',
        'Монгол улсын сүүлийн үеийн эдийн засаг, технологийн гол үзүүлэлтүүд ба чиг хандлага',
      ],
    },
    {
      title: 'AI Builder & Live Sandbox',
      subtitle: 'Интерактив код бичиж амьдаар ажиллуулах',
      icon: <Code2 className="w-5 h-5 text-cyan-400" />,
      color: 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30 hover:border-cyan-500/60',
      badge: 'Амьд Preview',
      mode: 'builder' as GeminiMode,
      subject: 'coding',
      prompts: [
        'Tailwind CSS болон JS ашиглан хөөрхөн интерактив шинжлэх ухааны тооны машин хийж өг',
        'HTML5 Canvas дээр гарагуудын нарыг тойрох хөдөлгөөний симуляцийн код бүтээж өг',
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Welcome Hero Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Gemini 3.8 Flash · Олон төрөлт сэтгэхүй</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
          Юунд туслах вэ?
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Бүх төрлийн бодлого, сургуулийн хичээл, Google-ийн шууд хайлт, код бүтээгчтэй бүрэн чадалтай оюуны хамтрагч.
        </p>

        {/* Quick Vision Solver Callout */}
        <div className="pt-2">
          <button
            onClick={onOpenHomeworkSolver}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-slate-200 text-xs sm:text-sm font-medium transition-all shadow-md group"
          >
            <Camera className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Бодлогын зураг оруулах (Vision Solver)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
          </button>
        </div>
      </div>

      {/* Preset Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${card.color} border transition-all duration-200 shadow-lg flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-900/80 shadow-xs">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base tracking-tight">
                      {card.title}
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700/60">
                  {card.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">{card.subtitle}</p>
            </div>

            {/* Quick prompts */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
              {card.prompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onSelectPrompt(prompt, card.mode, card.subject)}
                  className="w-full text-left p-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{prompt}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 flex-shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
