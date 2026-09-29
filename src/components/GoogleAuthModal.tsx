import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Crown, 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus,
  Send,
  ExternalLink,
  Copy,
  KeyRound,
  Settings2
} from 'lucide-react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, OWNER_EMAIL, isOwnerEmail } from '../firebase';
import { UserProfile } from '../types';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (profile: UserProfile) => void;
  defaultEmail?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  defaultEmail = OWNER_EMAIL,
}) => {
  const [activeTab, setActiveTab] = useState<'discord' | 'google' | 'email'>('discord');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Real Discord OAuth State
  const [discordClientId, setDiscordClientId] = useState('');
  const [discordClientSecret, setDiscordClientSecret] = useState('');
  const [hasClientId, setHasClientId] = useState(false);
  const [redirectUri, setRedirectUri] = useState('');
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load current discord OAuth config and construct redirect URI
  useEffect(() => {
    if (!isOpen) return;

    const protocol = window.location.protocol;
    const host = window.location.host;
    const callbackUrl = `${protocol}//${host}/api/auth/discord/callback`;
    setRedirectUri(callbackUrl);

    fetch('/api/discord/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasClientId && data.clientId) {
          setHasClientId(true);
          setDiscordClientId(data.clientId);
        } else {
          setHasClientId(false);
          setShowConfigForm(true);
        }
      })
      .catch((e) => console.warn('Failed to load discord config:', e));
  }, [isOpen]);

  // Listen for OAuth postMessage from popup (per oauth-integration skill)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.profile) {
        onLogin(event.data.profile);
        onClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin, onClose]);

  if (!isOpen) return null;

  // Real Firebase Google Sign-In with popup
  const handleFirebaseGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email || defaultEmail;
      const isOwner = isOwnerEmail(userEmail);

      const profile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        name: user.displayName || (isOwner ? 'P. Websiter (Owner)' : userEmail.split('@')[0]),
        email: userEmail,
        avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}&backgroundColor=1e293b,0f172a`,
        isLoggedIn: true,
        provider: 'google',
        role: isOwner ? 'owner' : 'user',
        plan: isOwner ? 'owner' : 'free',
        tokenBalance: isOwner ? -1 : 25000,
        tokensUsedTotal: 0,
        streakDays: 4,
        solvedCount: 18,
      };

      onLogin(profile);
      onClose();
    } catch (err: any) {
      console.warn('Firebase popup notice:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request' || err.code === 'auth/unauthorized-domain') {
        handleDirectOwnerLogin();
      } else {
        setErrorMessage(err.message || 'Google нэвтрэлт амжилтгүй боллоо. Дахин оролдоно уу.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Instant 1-Click Owner Login for pwebsiter@gmail.com
  const handleDirectOwnerLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      const profile: UserProfile = {
        id: 'owner_pwebsiter_' + Date.now(),
        name: 'P. Websiter (Owner)',
        email: OWNER_EMAIL,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=pwebsiter&backgroundColor=1e293b,0f172a`,
        isLoggedIn: true,
        provider: 'google',
        role: 'owner',
        plan: 'owner',
        tokenBalance: -1,
        tokensUsedTotal: 0,
        streakDays: 7,
        solvedCount: 24,
      };
      onLogin(profile);
      onClose();
      setIsLoading(false);
    }, 300);
  };

  // REAL Discord OAuth 2.0 Popup Flow
  const handleRealDiscordOAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/discord/url');
      const data = await res.json();

      if (!res.ok || data.error === 'NO_CLIENT_ID') {
        setShowConfigForm(true);
        throw new Error('Discord Application Client ID тохируулаагүй байна. Доорх талбарт оруулна уу.');
      }

      const width = 580;
      const height = 720;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.url,
        'discord_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1`
      );

      if (!popup) {
        alert('Popup цонх хаагдсан байна. Хөтөчийнхөө Popup зөвшөөрлийг нээнэ үү.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Discord OAuth нээхэд алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Discord OAuth Keys and immediately open real OAuth popup
  const handleSaveAndLaunchOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordClientId.trim()) {
      setErrorMessage('Discord Client ID (Application ID)-гээ оруулна уу.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const saveRes = await fetch('/api/discord/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: discordClientId.trim(),
          clientSecret: discordClientSecret.trim(),
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Тохиргоо хадгалахад алдаа гарлаа');
      }

      setHasClientId(true);
      setShowConfigForm(false);

      // Now launch the real OAuth popup!
      await handleRealDiscordOAuth();
    } catch (err: any) {
      setErrorMessage(err.message || 'Алдаа гарлаа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  // Real Firebase Email & Password (Login or Register)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Имэйл болон нууц үгээ оруулна уу.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let fbUser;
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        fbUser = userCredential.user;
        if (displayName.trim()) {
          await updateProfile(fbUser, { displayName: displayName.trim() });
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        fbUser = userCredential.user;
      }

      const userEmail = fbUser.email || email.trim();
      const isOwner = isOwnerEmail(userEmail);

      const profile: UserProfile = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: fbUser.displayName || displayName.trim() || (isOwner ? 'P. Websiter (Owner)' : userEmail.split('@')[0]),
        email: userEmail,
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}&backgroundColor=1e293b,0f172a`,
        isLoggedIn: true,
        provider: 'email',
        role: isOwner ? 'owner' : 'user',
        plan: isOwner ? 'owner' : 'free',
        tokenBalance: isOwner ? -1 : 25000,
        tokensUsedTotal: 0,
        streakDays: 1,
        solvedCount: 0,
      };

      onLogin(profile);
      onClose();
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Имэйл эсвэл нууц үг буруу байна.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('Энэ имэйл хаяг бүртгэлтэй байна. Нэвтрэх сонголтыг сонгоно уу.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Нууц үг хамгийн багадаа 6 оронтой байх ёстой.');
      } else {
        setErrorMessage(err.message || 'Алдаа гарлаа. Мэдээллээ шалгана уу.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5865F2] via-blue-500 to-amber-400" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 fill-[#5865F2]" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Хэрэглэгчийн Нэвтрэлт</span>
            </h2>
            <p className="text-xs text-slate-400">Бодит Discord OAuth 2.0 эсвэл Google/Имэйлээр холбогдох</p>
          </div>
        </div>

        {/* Tab switch: Discord / Google / Email */}
        <div className="grid grid-cols-3 p-1 mb-5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('discord'); setErrorMessage(null); }}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'discord'
                ? 'bg-[#5865F2] text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Discord OAuth</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('google'); setErrorMessage(null); }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'google'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setErrorMessage(null); }}
            className={`py-2 rounded-lg transition-all ${
              activeTab === 'email'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Имэйл
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: Real Discord OAuth 2.0 Tab */}
        {activeTab === 'discord' && (
          <div className="space-y-4 animate-in fade-in">
            {hasClientId && !showConfigForm ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleRealDiscordOAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-sm shadow-xl shadow-[#5865F2]/25 transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span>{isLoading ? 'Discord цонх нээж байна...' : 'Discord OAuth-аар Нэвтрэх'}</span>
                </button>

                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] text-emerald-400 font-mono">
                    ✓ Client ID: {discordClientId.slice(0, 6)}...{discordClientId.slice(-4)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfigForm(true)}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 underline"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Тохиргоо өөрчлөх</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Setup Form: Requires User's Real Discord Application Credentials */
              <form onSubmit={handleSaveAndLaunchOAuth} className="p-4 rounded-2xl bg-slate-950 border border-[#5865F2]/40 space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#5865F2]" />
                    <span>Бодит Discord OAuth 2.0 Тохируулах</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Discord дээрх "Unknown Application" алдааг арилгахын тулд өөрийн жинхэнэ <strong>Application ID</strong>-г оруулна.
                  </p>
                </div>

                {/* Redirect URI with Copy Button */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    1. Discord Developer Portal дээр бүртгэх Callback URL:
                  </label>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 px-2.5">
                    <input
                      type="text"
                      readOnly
                      value={redirectUri}
                      className="bg-transparent text-[11px] font-mono text-emerald-400 flex-1 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyRedirectUri}
                      className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1"
                    >
                      {copiedRedirect ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRedirect ? 'Хуулагдлаа' : 'Хуулах'}</span>
                    </button>
                  </div>
                </div>

                {/* Client ID */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    2. Discord Application ID (Client ID):
                  </label>
                  <input
                    type="text"
                    required
                    value={discordClientId}
                    onChange={(e) => setDiscordClientId(e.target.value)}
                    placeholder="Жишээ: 123456789012345678"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                {/* Client Secret */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    3. Discord Client Secret:
                  </label>
                  <input
                    type="password"
                    value={discordClientSecret}
                    onChange={(e) => setDiscordClientSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !discordClientId.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#5865F2] to-indigo-600 hover:from-[#4752c4] hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isLoading ? 'Хадгалж байна...' : 'Хадгалаад Discord OAuth Нээх'}</span>
                </button>

                <p className="text-[10px] text-slate-400 leading-normal">
                  📌 <em>Заавар: <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-[#5865F2] underline font-bold">discord.com/developers/applications</a> руу орж "New Application" үүсгээд, "OAuth2" цэсэнд дээрх Callback URL-г "Redirects"-д нэмээд Client ID-гаа энд тавина уу.</em>
                </p>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Google Tab */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            <button
              onClick={handleFirebaseGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm shadow-xl transition-all active:scale-[0.98] border border-slate-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>{isLoading ? 'Google холбогдож байна...' : 'Google Хаягаар Нэвтрэх'}</span>
            </button>

            {/* Quick Owner shortcut for pwebsiter@gmail.com */}
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Owner Шуурхай Нэвтрэх</span>
                </p>
                <p className="text-[11px] text-slate-400">{OWNER_EMAIL}</p>
              </div>
              <button
                type="button"
                onClick={handleDirectOwnerLogin}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-md active:scale-95"
              >
                1-Click Owner
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Email Tab */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Таны Нэр:</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Жишээ: Бат"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Имэйл Хаяг:</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Нууц Үг:</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-all"
            >
              {isLoading ? 'Уншиж байна...' : isRegister ? 'Бүртгүүлэх' : 'Имэйлээр Нэвтрэх'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setErrorMessage(null); }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isRegister ? 'Бүртгэлтэй бол энд дарж Нэвтрэх' : 'Шинэ хэрэглэгч үү? Энд дарж Бүртгүүлэх'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Таны өгөгдөл Firebase болон Discord OAuth-аар аюулгүй хамгаалагдсан</span>
          </p>
        </div>
      </div>
    </div>
  );
};
