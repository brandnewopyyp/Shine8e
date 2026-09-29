import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Zap, 
  Crown, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Gift, 
  CreditCard,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TOKEN_PLANS } from '../constants/plans';
import { TokenPlan, TokenPlanId, UserProfile } from '../types';

interface TokenPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSelectPlan: (planId: TokenPlanId, addedTokens?: number) => void;
  onRedeemPromo: (code: string) => boolean;
  onInitiatePayment?: (plan: TokenPlan) => void;
}

export const TokenPlansModal: React.FC<TokenPlansModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSelectPlan,
  onRedeemPromo,
  onInitiatePayment,
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  if (!isOpen) return null;

  const isOwner = userProfile.role === 'owner' || userProfile.email.toLowerCase() === 'pwebsiter@gmail.com';

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    const success = onRedeemPromo(promoCode.trim().toUpperCase());
    if (success) {
      setPromoStatus({ success: true, message: 'Промо код амжилттай идэвхжиж, токен нэмэгдлээ!' });
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });
      setPromoCode('');
    } else {
      setPromoStatus({ success: false, message: 'Хүчингүй эсвэл хугацаа нь дууссан промо код байна.' });
    }
  };

  const handleChoosePlan = (plan: TokenPlan) => {
    if (plan.priceMNT > 0 && onInitiatePayment) {
      onInitiatePayment(plan);
    } else {
      onSelectPlan(plan.id);
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    }
  };

  const currentPlan = TOKEN_PLANS.find((p) => p.id === userProfile.plan) || TOKEN_PLANS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Токен багцууд & Төлөвлөгөө
                </h2>
                {isOwner && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-400" />
                    <span>OWNER</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Бодлого бодох, код бүтээх, шууд интернет хайлтын токены эрх
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current Balance Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                Таны одоогийн үлдэгдэл
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">
                  {userProfile.tokenBalance === -1 ? '∞ Хязгааргүй' : `${userProfile.tokenBalance.toLocaleString()} токен`}
                </span>
                <span className="text-xs text-slate-400">
                  (Идэвхтэй багц: <strong className="text-slate-200">{currentPlan.nameMn}</strong>)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Нийт ашигласан: {userProfile.tokensUsedTotal.toLocaleString()} токен · Бодсон бодлого: {userProfile.solvedCount}
              </p>
            </div>

            {/* Owner banner if owner */}
            {isOwner ? (
              <div className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-bold text-amber-200">Та системийн Owner (Эзэмшигч) байна</p>
                  <p className="text-[11px] text-amber-400/80">Танд хязгааргүй токен ба бүрэн эрх олгогдсон.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Шууд идэвхжих боломжтой</span>
                </span>
              </div>
            )}
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOKEN_PLANS.map((plan) => {
              const isCurrent = userProfile.plan === plan.id;
              const isOwnerPlan = plan.id === 'owner';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 ${
                    isCurrent
                      ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-xl'
                      : plan.popular
                      ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-500/50 hover:border-indigo-400 shadow-lg'
                      : isOwnerPlan
                      ? 'bg-gradient-to-b from-amber-950/30 to-slate-900 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[10px] tracking-wider uppercase shadow-md">
                      Хамгийн их сонгодог
                    </div>
                  )}

                  {isOwnerPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
                      <Crown className="w-3 h-3 fill-slate-950" />
                      <span>Owner тусгай</span>
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base text-white">{plan.nameMn}</h3>
                      {isCurrent && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Идэвхтэй
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mb-4 min-h-[32px]">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-4 pb-4 border-b border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{plan.priceFormatted}</span>
                        {plan.priceMNT > 0 && <span className="text-xs text-slate-400">/{plan.period}</span>}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-blue-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-blue-400" />
                        <span>{plan.tokens === -1 ? 'Хязгааргүй токен' : `${plan.tokens.toLocaleString()} токен`}</span>
                      </div>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2 mb-6 text-xs text-slate-300">
                      {plan.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Button */}
                  <div>
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 font-semibold text-xs border border-slate-700 cursor-default"
                      >
                        Одоо ашиглаж байна
                      </button>
                    ) : isOwnerPlan ? (
                      <button
                        onClick={() => handleChoosePlan(plan)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Crown className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Owner эрхээр шилжих</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleChoosePlan(plan)}
                        className={`w-full py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                          plan.popular
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                      >
                        <span>{plan.priceMNT > 0 ? `Худалдан авах (${plan.priceFormatted})` : 'Сонгох'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Promo Code Redemption Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Промо код эсвэл бэлгийн эрх байна уу?</h4>
                <p className="text-xs text-slate-400">
                  Тусгай сургууль, олимпиад, эсвэл шагналын кодоо оруулж үнэгүй токен аваарай (Жишээ: <code>GEMINI-MIND</code>, <code>SCHOLAR-2026</code>)
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeem} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Промо кодоо бичих..."
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 uppercase tracking-wider font-mono w-full md:w-48"
              />
              <button
                type="submit"
                disabled={!promoCode.trim()}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap transition-colors"
              >
                Идэвхжүүлэх
              </button>
            </form>
          </div>

          {promoStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              promoStatus.success ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
            }`}>
              {promoStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
              <span>{promoStatus.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
