import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Users, 
  Zap, 
  Server, 
  ShieldCheck, 
  Plus, 
  Copy, 
  Check, 
  Search, 
  Key,
  Flame,
  Activity,
  UserCheck
} from 'lucide-react';
import { TokenPlanId, UserProfile, UserRole } from '../types';

interface OwnerAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUserPlan: (userId: string, newPlan: TokenPlanId, newTokens: number) => void;
  allUsers: UserProfile[];
  onAddTokensToUser: (userId: string, amount: number) => void;
}

export const OwnerAdminModal: React.FC<OwnerAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUserPlan,
  allUsers,
  onAddTokensToUser,
}) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [discordBotToken, setDiscordBotToken] = useState('');
  const [discordClientId, setDiscordClientId] = useState('1554542116452044811');
  const [discordChannelId, setDiscordChannelId] = useState('');
  const [isBotOnline, setIsBotOnline] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [isSavingBot, setIsSavingBot] = useState(false);

  const fetchTransactions = async () => {
    setIsLoadingTx(true);
    try {
      const res = await fetch('/api/payment/all');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.warn('Failed to load transactions:', e);
    } finally {
      setIsLoadingTx(false);
    }
  };

  const fetchDiscordConfig = async () => {
    try {
      const res = await fetch('/api/discord/config');
      if (res.ok) {
        const data = await res.json();
        setIsBotOnline(data.isBotOnline);
        setBotUsername(data.botUsername);
        if (data.clientId) setDiscordClientId(data.clientId);
        if (data.channelId) setDiscordChannelId(data.channelId);
      }
    } catch (e) {}
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchTransactions();
      fetchDiscordConfig();
    }
  }, [isOpen]);

  const handleSaveDiscordConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBot(true);
    try {
      const res = await fetch('/api/discord/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: discordBotToken.trim() || undefined,
          clientId: discordClientId.trim() || undefined,
          channelId: discordChannelId.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsBotOnline(data.isBotOnline);
        setBotUsername(data.botUsername);
        alert(data.isBotOnline ? `Discord Bot амжилттай холбогдлоо! (@${data.botUsername})` : 'Discord тохиргоо хадгалагдлаа.');
      }
    } catch (e: any) {
      alert('Алдаа: ' + e.message);
    } finally {
      setIsSavingBot(false);
    }
  };

  const handleReviewPayment = async (id: string, action: 'approve' | 'decline') => {
    try {
      const res = await fetch('/api/payment/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          reviewer: 'Owner Admin Console',
        }),
      });
      if (res.ok) {
        fetchTransactions();
      }
    } catch (e) {
      alert('Алдаа: ' + String(e));
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [customPromo, setCustomPromo] = useState({ code: 'OWNER-SCHOLAR-50K', tokens: 50000 });
  const [generatedCodes, setGeneratedCodes] = useState([
    { code: 'GEMINI-MIND', tokens: 50000, usedCount: 14 },
    { code: 'OWNER-VIP-2026', tokens: 250000, usedCount: 5 },
    { code: 'STUDENT-SPECIAL', tokens: 25000, usedCount: 38 },
  ]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPromo.code.trim()) return;
    setGeneratedCodes([
      { code: customPromo.code.trim().toUpperCase(), tokens: customPromo.tokens, usedCount: 0 },
      ...generatedCodes,
    ]);
    setCustomPromo({ code: '', tokens: 50000 });
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-amber-500/50 shadow-2xl shadow-amber-500/10 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gold Shimmer Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Owner удирдлагын консол
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Системийн Эзэмшигч: {currentUser.email}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Хэрэглэгчдийн эрх, токен багц, промо код болон системийн төлөвийг удирдах
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key System Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
                <span>Нийт Хэрэглэгчид</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{allUsers.length}</p>
              <p className="text-[11px] text-emerald-400 font-medium mt-1">● Бүх бүртгэл идэвхтэй</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
                <span>Gemini 3.8 Flash</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">Live</p>
              <p className="text-[11px] text-slate-400 mt-1">Google GenAI Client 2.4.0</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
                <span>Firebase Auth & DB</span>
                <Server className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-base sm:text-lg font-bold text-white truncate">gen-lang-client</p>
              <p className="text-[11px] text-emerald-400 mt-1">● Firestore холбогдсон</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1 text-xs">
                <span>Таны Токен Үлдэгдэл</span>
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-extrabold text-amber-400">∞ Хязгааргүй</p>
              <p className="text-[11px] text-slate-400 mt-1">Бүх эрх нээлттэй</p>
            </div>
          </div>

          {/* User Management Section */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-400" />
                  <span>Хэрэглэгчид ба Токен удирдлага</span>
                </h3>
                <p className="text-xs text-slate-400">Хэрэглэгчдийн багцыг солих, токен нэмэх</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Имэйл эсвэл нэрээр хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 border-b border-slate-800 text-[11px] uppercase font-semibold text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Хэрэглэгч</th>
                    <th className="py-3 px-4">Эрх / Role</th>
                    <th className="py-3 px-4">Идэвхтэй багц</th>
                    <th className="py-3 px-4">Токен үлдэгдэл</th>
                    <th className="py-3 px-4 text-right">Үйлдэл</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <p className="font-semibold text-white">{user.name}</p>
                            <p className="text-[11px] text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {user.role === 'owner' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 w-max">
                            <Crown className="w-3 h-3 fill-amber-400" />
                            <span>OWNER</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium">
                            {user.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={user.plan}
                          onChange={(e) => {
                            const newPlan = e.target.value as TokenPlanId;
                            const defaultTokens = newPlan === 'owner' ? -1 : newPlan === 'master' ? 1000000 : newPlan === 'pro' ? 250000 : 25000;
                            onUpdateUserPlan(user.id, newPlan, defaultTokens);
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="free">Үнэгүй (25K)</option>
                          <option value="pro">Сурагч Pro (250K)</option>
                          <option value="master">Ultra Master (1M)</option>
                          <option value="owner">👑 Owner Pass (∞)</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium">
                        {user.tokenBalance === -1 ? (
                          <span className="text-amber-400 font-bold">∞ Хязгааргүй</span>
                        ) : (
                          <span>{user.tokenBalance.toLocaleString()}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onAddTokensToUser(user.id, 50000)}
                            className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[11px] font-medium transition-colors"
                            title="+50,000 токен олгох"
                          >
                            +50K Токен
                          </button>
                          <button
                            onClick={() => onAddTokensToUser(user.id, 250000)}
                            className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-colors"
                            title="+250,000 токен олгох"
                          >
                            +250K Токен
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transactions & Payment Verification Section */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Төлбөрийн Баримтууд & Баталгаажуулалт (Discord & Bank)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Хэрэглэгчдийн шилжүүлсэн төлбөрийг шууд Approve хийж эрх нээх эсвэл Decline хийж цуцлах
                </p>
              </div>

              <button
                type="button"
                onClick={fetchTransactions}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                {isLoadingTx ? 'Уншиж байна...' : 'Шинэчлэх'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 border-b border-slate-800 text-[11px] uppercase font-semibold text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Гүйлгээний Код</th>
                    <th className="py-3 px-4">Хэрэглэгч</th>
                    <th className="py-3 px-4">Сонгосон Багц</th>
                    <th className="py-3 px-4">Дүн</th>
                    <th className="py-3 px-4">Төлөв</th>
                    <th className="py-3 px-4 text-right">Үйлдэл (Decision)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        Одоогоор шинэ төлбөрийн хүсэлт бүртгэгдээгүй байна.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {tx.id}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{tx.userName}</p>
                          <p className="text-[11px] text-slate-400">{tx.userEmail}</p>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {tx.planName}
                          <span className="block text-[10px] text-blue-400">+{tx.tokensGranted?.toLocaleString()} токен</span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-emerald-400">
                          {Number(tx.amount || 0).toLocaleString()} ₮
                        </td>
                        <td className="py-3 px-4">
                          {tx.status === 'approved' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              ● ЗӨВШӨӨРСӨН
                            </span>
                          ) : tx.status === 'declined' ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              ● ТАТГАЛЗСАН
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                              ⏳ ХҮЛЭЭГДЭЖ БАЙНА
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReviewPayment(tx.id, 'approve')}
                              disabled={tx.status === 'approved'}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold disabled:opacity-30 transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewPayment(tx.id, 'decline')}
                              disabled={tx.status === 'declined'}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-[11px] font-bold disabled:opacity-30 transition-colors"
                            >
                              ✕ Decline
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discord Bot & Interactive In-Discord Approval Settings Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-[#5865F2]/10 to-slate-950 border border-[#5865F2]/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isBotOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>Discord Bot & In-Discord Товчлуурын Тохиргоо</span>
                  {isBotOnline && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ONLINE (@{botUsername})
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Discord дээрээсээ шууд <strong className="text-emerald-400">Approve</strong> дарж баталгаажуулах эсвэл <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">!approve GM-XXXX</code> коммандаар шийдвэрлэх
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/payment/notify-discord', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        userName: 'P. Websiter (Owner Test)',
                        userEmail: currentUser.email,
                        planName: 'Сурагч Standard (Туршилт)',
                        amount: 25000,
                        accountNumber: 'MN510050099106696285',
                        transactionRef: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
                        tokensGranted: 250000,
                        note: 'Owner Admin консолоос туршилтын дохио илгээв',
                      }),
                    });
                    alert('Discord суваг руу туршилтын мэдэгдэл амжилттай илгээгдлээ!');
                  } catch (e) {
                    alert('Алдаа гарлаа: ' + String(e));
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md self-start sm:self-auto"
              >
                <span>Discord руу тест дохио илгээх</span>
              </button>
            </div>

            {/* Bot Token Configuration Form */}
            <form onSubmit={handleSaveDiscordConfig} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold block">
                  Discord Bot Token (discord.com/developers/applications):
                </label>
                <input
                  type="password"
                  value={discordBotToken}
                  onChange={(e) => setDiscordBotToken(e.target.value)}
                  placeholder={isBotOnline ? '•••••••••••••••••••••••• (Холбогдсон)' : 'Bot Token-оо энд хуулж тавина уу'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#5865F2]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSavingBot}
                  className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-[#5865F2] to-indigo-600 hover:from-[#4752c4] hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
                >
                  {isSavingBot ? 'Холбож байна...' : 'Ботыг асаах / Хадгалах'}
                </button>
              </div>
            </form>

            {/* Quick Guide on how to use Discord Bot commands */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <p className="font-bold text-amber-300 flex items-center gap-1">
                <span>💡 Discord-оос сайт руу орохгүйгээр төлбөр батлах аргууд:</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-emerald-400 font-bold block mb-0.5">1. Товчлуураар (Button):</span>
                  <span>Discord суваг дээр ирсэн ногоон <strong>[ЗӨВШӨӨРӨХ]</strong> товч дээр дарахад шууд Discord дотроо баталгаажна.</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-blue-400 font-bold block mb-0.5">2. Чатаар (Chat Command):</span>
                  <span>Сувагтаа <code className="bg-slate-900 text-amber-300 px-1 py-0.5 rounded font-mono">!approve GM-XXXX</code> эсвэл <code className="bg-slate-900 text-rose-300 px-1 py-0.5 rounded font-mono">!decline GM-XXXX</code> гэж бичнэ.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Promo Codes Creator Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Create Code Form */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Шинэ Промо Код Үүсгэх</h4>
              </div>
              <form onSubmit={handleCreatePromo} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Промо код нэр:</label>
                  <input
                    type="text"
                    value={customPromo.code}
                    onChange={(e) => setCustomPromo({ ...customPromo, code: e.target.value })}
                    placeholder="Жишээ: EXAM-READY-100K"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Дагалдах токен хэмжээ:</label>
                  <select
                    value={customPromo.tokens}
                    onChange={(e) => setCustomPromo({ ...customPromo, tokens: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={25000}>25,000 токен (~50 бодлого)</option>
                    <option value={50000}>50,000 токен (~100 бодлого)</option>
                    <option value={100000}>100,000 токен (~200 бодлого)</option>
                    <option value={250000}>250,000 токен (~500 бодлого)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={!customPromo.code.trim()}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Промо код нийтлэх</span>
                </button>
              </form>
            </div>

            {/* Active Promo Codes List */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Идэвхтэй промо кодууд ({generatedCodes.length})</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {generatedCodes.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-amber-300 tracking-wider">{c.code}</p>
                      <p className="text-[11px] text-slate-400">
                        +{c.tokens.toLocaleString()} токен · {c.usedCount} хэрэглэгч ашигласан
                      </p>
                    </div>

                    <button
                      onClick={() => handleCopy(c.code)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Код хуулах"
                    >
                      {copiedCode === c.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
