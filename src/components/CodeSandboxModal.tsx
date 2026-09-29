import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  RotateCw, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Code2, 
  Eye 
} from 'lucide-react';
import { wrapCodeForSandbox } from '../utils/formatters';

interface CodeSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode: string;
  language?: string;
}

export const CodeSandboxModal: React.FC<CodeSandboxModalProps> = ({
  isOpen,
  onClose,
  initialCode,
  language = 'html',
}) => {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'split'>('split');
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const ext = language === 'html' ? 'html' : language === 'svg' ? 'svg' : 'js';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-artifact.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getViewportWidth = () => {
    if (viewport === 'mobile') return 'max-w-[375px]';
    if (viewport === 'tablet') return 'max-w-[768px]';
    return 'w-full';
  };

  const wrappedSrcDoc = wrapCodeForSandbox(code, language);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-7xl h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Gemini Canvas & AI Sandbox</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                    {language}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Интерактив кодын бодит цагийн ажиллагаа</p>
              </div>
            </div>
          </div>

          {/* Center: Viewport & View Mode Controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {/* View Mode Tabs */}
            <button
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                activeTab === 'split' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Хувааж харах
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                activeTab === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Зөвхөн Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                activeTab === 'code' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Зөвхөн Код
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-1" />

            {/* Responsive Viewport switches */}
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'desktop' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'tablet' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewport === 'mobile' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Дахин ажиллуулах"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Код хуулах"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Файлаар татах"
            >
              <Download className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Code Editor (if split or code tab) */}
          {(activeTab === 'split' || activeTab === 'code') && (
            <div className={`flex flex-col bg-slate-950 border-r border-slate-800 ${
              activeTab === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}>
              <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>Эх код (Түр засварлах боломжтой)</span>
                <span className="font-mono text-slate-500">{code.split('\n').length} мөр</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 w-full p-4 font-mono text-xs sm:text-sm bg-transparent text-slate-200 resize-none focus:outline-none leading-relaxed selection:bg-blue-600/40"
                spellCheck={false}
              />
            </div>
          )}

          {/* Right: Live Preview Iframe (if split or preview tab) */}
          {(activeTab === 'split' || activeTab === 'preview') && (
            <div className={`flex flex-col bg-slate-900/60 items-center justify-center p-2 sm:p-4 overflow-auto ${
              activeTab === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}>
              <div className={`h-full ${getViewportWidth()} transition-all duration-300 rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-white flex flex-col`}>
                <iframe
                  key={refreshKey}
                  ref={iframeRef}
                  srcDoc={wrappedSrcDoc}
                  title="Gemini Code Sandbox"
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full border-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
