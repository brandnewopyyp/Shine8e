import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX, 
  Play, 
  ExternalLink, 
  Search, 
  CheckCircle2, 
  Layers, 
  Code,
  BookOpen,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Message, UserProfile } from '../types';
import { extractCodeBlocks, isExecutableCode, speakText } from '../utils/formatters';

interface MessageItemProps {
  message: Message;
  userProfile: UserProfile;
  onOpenSandboxWithCode: (code: string, language?: string) => void;
  onSelectSearchQuery?: (query: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  userProfile,
  onOpenSandboxWithCode,
  onSelectSearchQuery,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stopSpeechFn, setStopSpeechFn] = useState<(() => void) | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeech = () => {
    if (isSpeaking && stopSpeechFn) {
      stopSpeechFn();
      setIsSpeaking(false);
      setStopSpeechFn(null);
    } else {
      const cancelFn = speakText(message.content, () => {
        setIsSpeaking(false);
        setStopSpeechFn(null);
      });
      setIsSpeaking(true);
      setStopSpeechFn(() => cancelFn);
    }
  };

  const triggerCelebrate = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'],
    });
  };

  // Render text with code blocks and styled math/steps
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-3 leading-relaxed text-sm sm:text-base text-slate-200">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
            const language = match?.[1] || 'code';
            const code = match?.[2] || '';
            const canRun = isExecutableCode(language, code);

            return (
              <CodeBlockViewer
                key={index}
                code={code}
                language={language}
                canRun={canRun}
                onRun={() => onOpenSandboxWithCode(code, language)}
              />
            );
          }

          // Format standard markdown lines
          return (
            <div key={index} className="space-y-2 whitespace-pre-wrap">
              {part.split('\n\n').map((paragraph, pIdx) => {
                // If it's a step or final answer line, give it a distinctive card treatment
                const isFinalAnswer = paragraph.includes('Эцсийн хариу') || paragraph.includes('Final Answer') || paragraph.includes('✅');
                const isGivenTarget = paragraph.includes('Өгөгдсөн нь') || paragraph.includes('Олох нь') || paragraph.includes('Ашиглах томьёо');

                if (isFinalAnswer) {
                  return (
                    <div 
                      key={pIdx}
                      className="p-3.5 my-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 shadow-sm flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{formatInlineMarkdown(paragraph)}</div>
                    </div>
                  );
                }

                if (isGivenTarget) {
                  return (
                    <div
                      key={pIdx}
                      className="p-3 my-2 rounded-xl bg-slate-800/60 border border-slate-700/80 text-slate-300 font-mono text-xs sm:text-sm"
                    >
                      {formatInlineMarkdown(paragraph)}
                    </div>
                  );
                }

                return (
                  <p key={pIdx}>
                    {formatInlineMarkdown(paragraph)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`py-4 sm:py-6 px-4 ${isUser ? 'bg-slate-900/40' : 'bg-slate-900/90'} border-b border-slate-800/60 transition-colors`}>
      <div className="max-w-4xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            userProfile.isLoggedIn ? (
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                className="w-8 h-8 rounded-full ring-2 ring-blue-500/40 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold text-xs">
                Та
              </div>
            )
          ) : (
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 shadow-md shadow-indigo-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">
                {isUser ? (userProfile.isLoggedIn ? userProfile.name : 'Та') : 'Gemini Mind'}
              </span>
              <span className="text-[11px] text-slate-400">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.mode && !isUser && (
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {message.mode}
                </span>
              )}
            </div>

            {/* Quick Actions (Copy, TTS) */}
            {!isUser && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isSpeaking ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={isSpeaking ? 'Дууг зогсоох' : 'Дуугаар сонсох'}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Хариултыг хуулах"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Attached Image (e.g. Homework Photo) */}
          {message.image && (
            <div className="max-w-md rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-md">
              <img
                src={message.image}
                alt="Uploaded homework/diagram"
                className="w-full max-h-72 object-contain bg-black/40"
              />
            </div>
          )}

          {/* Text Message Content */}
          {renderMessageContent(message.content)}

          {/* Google Grounding Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-amber-300">
                <Search className="w-3.5 h-3.5 text-amber-400" />
                <span>Google Search шууд эх сурвалжууд:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.citations.map((citation, cIdx) => (
                  <a
                    key={cIdx}
                    href={citation.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 transition-all group"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 group-hover:scale-105 transition-transform">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-amber-300 transition-colors line-clamp-1">
                        {citation.title || 'Вэб хуудас'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {citation.uri}
                      </p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Related search queries */}
              {message.searchQueries && message.searchQueries.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-400">Хайлтын түлхүүр:</span>
                  {message.searchQueries.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => onSelectSearchQuery?.(q)}
                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Subcomponent for Code Block rendering
interface CodeBlockViewerProps {
  code: string;
  language: string;
  canRun: boolean;
  onRun: () => void;
}

const CodeBlockViewer: React.FC<CodeBlockViewerProps> = ({
  code,
  language,
  canRun,
  onRun,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-700/90 bg-slate-950 shadow-xl font-mono text-xs sm:text-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
        <div className="flex items-center gap-2">
          <Code className="w-3.5 h-3.5 text-blue-400" />
          <span className="uppercase text-[11px] font-semibold text-slate-300 tracking-wider">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canRun && (
            <button
              onClick={onRun}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition-colors text-xs font-semibold"
            >
              <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
              <span>Ажиллуулах</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Кодыг хуулах"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">Хууллаа</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[11px]">Хуулах</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed max-h-[420px]">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Helper to format inline markdown like bold, code, bullets
function formatInlineMarkdown(text: string): React.ReactNode {
  // Simple token parser for **bold**, `code`, etc.
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-bold text-white">
        {match[1]}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}
