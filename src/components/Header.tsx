import React, { useState } from 'react';
import { 
  Sparkles, 
  Search, 
  Calculator, 
  BookOpen, 
  Code2, 
  Sun, 
  Moon, 
  User, 
  LogOut, 
  ExternalLink,
  ChevronDown,
  Layers,
  CheckCircle2,
  Flame,
  Crown,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { GeminiMode, UserProfile } from '../types';

interface HeaderProps {
  currentMode: GeminiMode;
  onSelectMode: (mode: GeminiMode) => void;
  userProfile: UserProfile;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSandbox: () => void;
  hasActiveCode: boolean;
  onNewChat: () => void;
  onOpenTokenPlans: () => void;
  onOpenOwnerAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  userProfile,
  onOpenAuthModal,
  onLogout,
  isDarkMode,
  onToggleTheme,
  onOpenSandbox,
  hasActiveCode,
  onNewChat,
  onOpenTokenPlans,
  onOpenOwnerAdmin,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isOwner = userProfile.role === 'owner' || userProfile.email.toLowerCase() === 'pwebsiter@gmail.com';

  const modes: { id: GeminiMode; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'general', label: 'Gemini AI', icon: <Sparkles className="w-4 h-4 text-blue-400" />, desc: 'Бүх төрлийн харилцан яриа' },
    { id: 'math', label: 'Бодлого бодогч', icon: <Calculator className="w-4 h-4 text-emerald-400" />, desc: 'Математик, Физик, STEM алхамчилсан бодолт' },
    { id: 'homework', label: 'Бүх Хичээл', icon: <BookOpen className="w-4 h-4 text-violet-400" />, desc: 'Монгол хэл, Англи, Түүх, Биологи, Эсээ' },
    { id: 'search', label: 'Шууд Хайлт', icon: <Search className="w-4 h-4 text-amber-400" />, desc: 'Google Search эх сурвалж & баримтууд' },
    { id: 'builder', label: 'AI Builder', icon: <Code2 className="w-4 h-4 text-cyan-400" />, desc: 'Интерактив код & амьд sandbox preview' },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 h-16 border-b transition-colors bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md border-slate-800 text-slate-100">
      {/* Left: Brand & Model Selection */}
      <div className="flex items-center gap-3">
        <button
          onClick={onNewChat}
          className="group flex items-center gap-2.5 text-left focus:outline-none"
          title="Шинэ яриа эхлүүлэх"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-base sm:text-lg">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                Gemini
              </span>
              <span className="text-white">Mind</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                3.8 Flash
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-400">
              Бодлого · Бүх хичээл · Google Grounding · AI Builder
            </p>
          </div>
        </button>
      </div>

      {/* Center: Mode Switcher (Desktop) */}
      <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-800/80 border border-slate-700/60 rounded-xl">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title={m.desc}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Token Balance, Owner Admin, Canvas, Google Auth, Theme */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Token Balance Indicator */}
        <button
          onClick={onOpenTokenPlans}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
            isOwner
              ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/50 text-amber-300 hover:border-amber-400'
              : 'bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:border-blue-500/50'
          }`}
          title="Токен багц харах & цэнэглэх"
        >
          {isOwner ? (
            <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
          )}
          <span>
            {userProfile.tokenBalance === -1 ? 'Owner: ∞' : `${userProfile.tokenBalance.toLocaleString()}`}
          </span>
          <span className="hidden md:inline text-[10px] text-slate-400 uppercase font-mono">
            {isOwner ? 'Токен' : 'Токен'}
          </span>
        </button>

        {/* Owner Admin Console Button (Visible to Owner) */}
        {isOwner && (
          <button
            onClick={onOpenOwnerAdmin}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all"
            title="Owner удирдлагын консол нээх"
          >
            <Crown className="w-3.5 h-3.5 fill-slate-950" />
            <span>Owner Console</span>
          </button>
        )}

        {/* Interactive Code Canvas Runner button */}
        {hasActiveCode && (
          <button
            onClick={onOpenSandbox}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors animate-pulse"
            title="Интерактив кодын sandbox нээх"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Амьд Sandbox</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Гэгээлэг горимд шилжих' : 'Харанхуй горимд шилжих'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Google Authentication Control */}
        <div className="relative">
          {userProfile.isLoggedIn ? (
            <div>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1.5 rounded-xl transition-all ${
                  isOwner
                    ? 'border-2 border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'border border-slate-700/80 hover:bg-slate-800'
                }`}
                title={userProfile.name}
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/40"
                />
                <span className="hidden md:inline text-xs font-medium text-slate-200 max-w-[100px] truncate">
                  {userProfile.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-3 z-50 text-slate-200 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                      <img
                        src={userProfile.avatar}
                        alt={userProfile.name}
                        className="w-10 h-10 rounded-full ring-2 ring-blue-500/50"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-white truncate">
                            {userProfile.name}
                          </p>
                          {isOwner && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {userProfile.email}
                          </p>
                          {userProfile.provider === 'discord' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#5865F2]/25 text-[#7983f5] font-bold border border-[#5865F2]/40">
                              Discord
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="py-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/40 text-slate-300">
                        <span className="text-slate-400">Системийн эрх:</span>
                        <span className="font-bold text-amber-400">
                          {isOwner ? '👑 Үүсгэн байгуулагч (Owner)' : userProfile.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/40 text-slate-300">
                        <span className="text-slate-400">Токен багц:</span>
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenTokenPlans();
                          }}
                          className="font-bold text-blue-400 hover:underline"
                        >
                          {userProfile.tokenBalance === -1 ? 'Owner Pass (∞)' : `${userProfile.tokenBalance.toLocaleString()} токен`}
                        </button>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenOwnerAdmin();
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors font-medium mt-1"
                        >
                          <span className="flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 fill-amber-400" />
                            <span>Owner Console нээх</span>
                          </span>
                          <span className="text-[10px] font-bold uppercase">Нээх</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenTokenPlans();
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/30 transition-colors font-medium"
                      >
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 fill-blue-400" />
                          <span>Токен багцууд харах</span>
                        </span>
                        <span className="text-[10px] font-bold uppercase">Сонгох</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Гарах (Sign out)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-800 hover:bg-slate-100 border border-slate-300 shadow-sm transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Нэвтрэх</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
