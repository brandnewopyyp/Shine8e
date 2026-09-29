import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Trash2, 
  Pin, 
  PinOff, 
  Calculator, 
  BookOpen, 
  Code2, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Camera,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { ChatSession, GeminiMode, UserProfile } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: (mode?: GeminiMode) => void;
  onDeleteSession: (id: string) => void;
  onTogglePinSession: (id: string) => void;
  onOpenHomeworkSolver: () => void;
  userProfile: UserProfile;
  isOpen: boolean;
  onToggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onTogglePinSession,
  onOpenHomeworkSolver,
  userProfile,
  isOpen,
  onToggleSidebar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = filterMode === 'all' || s.mode === filterMode;
    return matchesSearch && matchesMode;
  });

  const pinnedSessions = filteredSessions.filter((s) => s.isPinned);
  const recentSessions = filteredSessions.filter((s) => !s.isPinned);

  const getModeIcon = (mode: GeminiMode) => {
    switch (mode) {
      case 'math':
        return <Calculator className="w-3.5 h-3.5 text-emerald-400" />;
      case 'homework':
        return <BookOpen className="w-3.5 h-3.5 text-violet-400" />;
      case 'search':
        return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case 'builder':
        return <Code2 className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onToggleSidebar}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 flex flex-col h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isOpen ? 'w-72 sm:w-80 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        {/* Top Action Bar */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2">
          {isOpen ? (
            <button
              onClick={() => onNewChat()}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Шинэ яриа эхлүүлэх</span>
            </button>
          ) : (
            <button
              onClick={() => onNewChat()}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all"
              title="Шинэ яриа"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          {/* Sidebar collapse button for desktop/tablet */}
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isOpen ? 'Хураах' : 'Дэлгэх'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {isOpen && (
          <>
            {/* Quick Action: Photo Homework Solver */}
            <div className="p-3 border-b border-slate-800">
              <button
                onClick={onOpenHomeworkSolver}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-emerald-200 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold">Бодлогын зураг оруулах</p>
                    <p className="text-[10px] text-slate-400">Шууд алхамчлан бодох</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                  Vision
                </span>
              </button>
            </div>

            {/* Search and Category Filter */}
            <div className="p-3 space-y-2 border-b border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ярианы түүхээс хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Functional Interactive Mode Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    filterMode === 'all'
                      ? 'bg-slate-700 text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Бүгд
                </button>
                <button
                  onClick={() => setFilterMode('math')}
                  className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    filterMode === 'math'
                      ? 'bg-emerald-950 text-emerald-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Бодлого
                </button>
                <button
                  onClick={() => setFilterMode('homework')}
                  className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    filterMode === 'homework'
                      ? 'bg-violet-950 text-violet-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Хичээл
                </button>
                <button
                  onClick={() => setFilterMode('builder')}
                  className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    filterMode === 'builder'
                      ? 'bg-cyan-950 text-cyan-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Код
                </button>
              </div>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {/* Pinned Section */}
              {pinnedSessions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <Pin className="w-3 h-3 text-amber-400" />
                    <span>Онцолсон ярианууд</span>
                  </div>
                  <div className="space-y-1">
                    {pinnedSessions.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        getModeIcon={getModeIcon}
                        onSelect={() => onSelectSession(session.id)}
                        onDelete={() => onDeleteSession(session.id)}
                        onTogglePin={() => onTogglePinSession(session.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              <div>
                <div className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Сүүлийн харилцан яриа
                </div>
                {recentSessions.length === 0 && pinnedSessions.length === 0 ? (
                  <div className="text-center py-6 px-3 text-slate-400 text-xs">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p>Түүх одоогоор хоосон байна.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Бодлого эсвэл даалгавар бичиж эхлүүлээрэй.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentSessions.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        getModeIcon={getModeIcon}
                        onSelect={() => onSelectSession(session.id)}
                        onDelete={() => onDeleteSession(session.id)}
                        onTogglePin={() => onTogglePinSession(session.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Profile & Status */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Gemini 3.8 Live</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {sessions.length} яриа хадгалагдсан
                </span>
              </div>
            </div>
          </>
        )}

        {/* Collapsed View (Icons only) */}
        {!isOpen && (
          <div className="flex-1 flex flex-col items-center py-4 space-y-4">
            <button
              onClick={onOpenHomeworkSolver}
              className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              title="Бодлогын зураг оруулах"
            >
              <Camera className="w-4 h-4" />
            </button>
            <div className="w-8 h-[1px] bg-slate-800" />
            {sessions.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`p-2.5 rounded-xl transition-colors ${
                  s.id === activeSessionId
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={s.title}
              >
                {getModeIcon(s.mode)}
              </button>
            ))}
          </div>
        )}
      </aside>
    </>
  );
};

// Sub-component for individual session row
interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  getModeIcon: (mode: GeminiMode) => React.ReactNode;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  getModeIcon,
  onSelect,
  onDelete,
  onTogglePin,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-all ${
        isActive
          ? 'bg-blue-600/20 border border-blue-500/40 text-white font-medium'
          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
        <span className="flex-shrink-0">{getModeIcon(session.mode)}</span>
        <span className="truncate">{session.title || 'Шинэ яриа'}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-700/50"
          title={session.isPinned ? 'Бэхэлгээг арилгах' : 'Дээр бэхлэх'}
        >
          {session.isPinned ? <PinOff className="w-3 h-3 text-amber-400" /> : <Pin className="w-3 h-3" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/50"
          title="Устгах"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
