import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Square, 
  Image as ImageIcon, 
  Globe, 
  Mic, 
  MicOff, 
  X, 
  Sparkles,
  Paperclip,
  Calculator,
  BookOpen,
  Code2
} from 'lucide-react';
import { GeminiMode, SubjectCategory } from '../types';

interface ChatInputProps {
  onSendMessage: (content: string, image?: string, mimeType?: string, options?: { webSearch?: boolean; subject?: string }) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  currentMode: GeminiMode;
  onSelectMode: (mode: GeminiMode) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  currentMode,
  onSelectMode,
}) => {
  const [content, setContent] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [webSearchEnabled, setWebSearchEnabled] = useState(currentMode === 'search');
  const [selectedSubject, setSelectedSubject] = useState<string>('general');
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync webSearch when mode changes
  useEffect(() => {
    if (currentMode === 'search') {
      setWebSearchEnabled(true);
    }
  }, [currentMode]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  // Handle clipboard paste of images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const processImageFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('Зургийн хэмжээ 15MB-аас ихгүй байх ёстой.');
      return;
    }
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleVoiceToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Таны хөтөч дуу хоолойгоор бичих функцийг дэмжихгүй байна. Chrome хөтөч ашиглана уу.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'mn-MN'; // Mongolian speech support with fallback

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!content.trim() && !attachedImage) || isStreaming) return;

    onSendMessage(content.trim(), attachedImage || undefined, mimeType, {
      webSearch: webSearchEnabled,
      subject: selectedSubject !== 'general' ? selectedSubject : undefined,
    });

    setContent('');
    setAttachedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const subjects = [
    { id: 'general', label: 'Ерөнхий' },
    { id: 'math', label: '📐 Математик' },
    { id: 'physics', label: '⚡ Физик' },
    { id: 'chemistry', label: '🧪 Хими' },
    { id: 'mongolian', label: '🇲🇳 Монгол хэл' },
    { id: 'english', label: '🇬🇧 English' },
    { id: 'coding', label: '💻 Кодчилол' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Subject Quick Selector Pills */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">
          Хичээл:
        </span>
        {subjects.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => setSelectedSubject(sub.id)}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap text-xs transition-all ${
              selectedSubject === sub.id
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* Main Input Box */}
      <div className="relative rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl focus-within:border-blue-500/80 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
        {/* Image Attachment Preview */}
        {attachedImage && (
          <div className="p-3 border-b border-slate-800 flex items-center gap-3">
            <div className="relative group w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
              <img
                src={attachedImage}
                alt="Attached homework/diagram"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Бодлогын зураг хавсаргагдлаа</p>
              <p className="text-[11px] text-slate-400">Gemini 3.8 Vision шууд уншиж алхамчлан тайлбарлана</p>
            </div>
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            currentMode === 'math'
              ? 'Математик эсвэл физикийн бодлогоо бичнэ үү (Жишээ: 2x² - 5x + 2 = 0 тэгшитгэлийг бод)...'
              : currentMode === 'homework'
              ? 'Хичээлийн асуулт, эсээний сэдэв, дүрмийн даалгавраа оруулна уу...'
              : currentMode === 'search'
              ? 'Google-ээс шууд хайх баримт, сүүлийн үеийн мэдээ, судалгааны сэдвээ бичнэ үү...'
              : currentMode === 'builder'
              ? 'Ямар интерактив код эсвэл веб апп бүтээмээр байна вэ? (Жишээ: Интерактив тооны машин хийж өг)...'
              : 'Gemini-ээс юу ч асууж болно (Бодлого, бүх хичээл, интернэт хайлт, код)...'
          }
          rows={1}
          className="w-full px-4 pt-3.5 pb-2 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none min-h-[52px] max-h-[180px]"
        />

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800/60 text-xs">
          {/* Left tools: Photo, Voice, Web Search */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Image upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Бодлогын зураг оруулах (PNG/JPG)"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Зураг оруулах</span>
            </button>

            {/* Voice Dictation */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-300 animate-pulse border border-rose-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Дуу хоолойгоор бичих"
            >
              {isRecording ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-blue-400" />}
              <span className="hidden sm:inline">{isRecording ? 'Сонсож байна...' : 'Дуут оруулалт'}</span>
            </button>

            {/* Google Web Search Grounding Toggle */}
            <button
              type="button"
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                webSearchEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Google шууд интернет хайлтын эх сурвалж холбох"
            >
              <Globe className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Google Search</span>
            </button>
          </div>

          {/* Right Action: Send / Stop */}
          <div>
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md transition-all"
                title="Зогсоох"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span className="text-xs">Зогсоох</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!content.trim() && !attachedImage}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-medium shadow-md shadow-blue-600/20 transition-all"
                title="Илгээх (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Илгээх</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
