import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Upload, 
  Building2, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  Printer,
  Clock,
  AlertTriangle,
  RotateCcw,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BANK_DETAILS } from '../constants/plans';
import { PaymentStatus, TokenPlan, UserProfile } from '../types';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: TokenPlan;
  userProfile: UserProfile;
  onPaymentSuccess: (planId: any, tokensGranted: number) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  selectedPlan,
  userProfile,
  onPaymentSuccess,
}) => {
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [transactionRef] = useState(() => {
    return `GM-${Math.floor(1000 + Math.random() * 9000)}-${userProfile.email ? userProfile.email.split('@')[0].toUpperCase().slice(0, 6) : 'USER'}`;
  });
  const [senderPhone, setSenderPhone] = useState('');
  const [userNote, setUserNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Status state: 'idle' | 'pending' | 'approved' | 'declined'
  const [status, setStatus] = useState<'idle' | 'pending' | 'approved' | 'declined'>('idle');
  const [pollCount, setPollCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<any>(null);

  const isOwner = userProfile.role === 'owner' || userProfile.email.toLowerCase() === 'pwebsiter@gmail.com';

  // Live real-time Firestore listener + polling for status change while pending
  useEffect(() => {
    if (status !== 'pending') return;

    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(doc(db, 'transactions', transactionRef), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'approved') {
            setStatus('approved');
            onPaymentSuccess(selectedPlan.id, selectedPlan.tokens);
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
            });
          } else if (data.status === 'declined') {
            setStatus('declined');
          }
        }
      });
    } catch (e) {
      console.warn('Firestore onSnapshot error:', e);
    }

    // Polling backup
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${encodeURIComponent(transactionRef)}`);
        if (res.ok) {
          const data = await res.json();
          setPollCount((c) => c + 1);

          if (data.status === 'approved') {
            setStatus('approved');
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            onPaymentSuccess(selectedPlan.id, selectedPlan.tokens);
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
            });
          } else if (data.status === 'declined') {
            setStatus('declined');
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        }
      } catch (e) {
        console.warn('Status poll error:', e);
      }
    }, 2000);

    return () => {
      if (unsubFirestore) unsubFirestore();
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [status, transactionRef, selectedPlan, onPaymentSuccess]);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(transactionRef);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  };

  const handleFileChange = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('Зургийн хэмжээ 15MB-аас бага байх ёстой.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Save to Firestore for real-time sync with Owner
      try {
        await setDoc(doc(db, 'transactions', transactionRef), {
          id: transactionRef,
          userId: userProfile.id,
          userName: userProfile.name,
          userEmail: userProfile.email,
          planName: selectedPlan.nameMn,
          planId: selectedPlan.id,
          amount: selectedPlan.priceMNT,
          accountNumber: BANK_DETAILS.accountNumber,
          tokensGranted: selectedPlan.tokens,
          receiptImage: receiptImage || null,
          note: `Утас: ${senderPhone || 'байхгүй'}. Тэмдэглэл: ${userNote || 'байхгүй'}`,
          status: 'pending',
          createdAt: Date.now(),
        });
      } catch (fsErr) {
        console.warn('Firestore setDoc notice:', fsErr);
      }

      // 2. Notify Discord Webhook
      const response = await fetch('/api/payment/notify-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          userName: userProfile.name,
          userEmail: userProfile.email,
          planName: selectedPlan.nameMn,
          planId: selectedPlan.id,
          amount: selectedPlan.priceMNT,
          accountNumber: BANK_DETAILS.accountNumber,
          transactionRef,
          tokensGranted: selectedPlan.tokens,
          receiptImage: receiptImage?.startsWith('http') ? receiptImage : undefined,
          note: `Утас: ${senderPhone || 'байхгүй'}. Тэмдэглэл: ${userNote || 'байхгүй'}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Төлбөр илгээхэд алдаа гарлаа');
      }

      // Enter pending approval state
      setStatus('pending');
    } catch (err: any) {
      console.error('Payment submit error:', err);
      alert('Алдаа гарлаа: ' + (err.message || 'Сүлжээ шалгана уу'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick action for Owner testing
  const handleOwnerQuickApprove = async () => {
    try {
      await fetch('/api/payment/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transactionRef,
          action: 'approve',
          reviewer: 'Owner Quick Test',
        }),
      });
      setStatus('approved');
      onPaymentSuccess(selectedPlan.id, selectedPlan.tokens);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {}
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Building2 className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Төлбөр & Баталгаажуулалт
              </h3>
              <p className="text-xs text-slate-400">
                Багц: <strong className="text-emerald-400">{selectedPlan.nameMn}</strong> ({selectedPlan.priceFormatted})
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STATE 1: Idle (Form to transfer and upload receipt) */}
          {status === 'idle' && (
            <>
              {/* Bank Details */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Шилжүүлэх Дансны Мэдээлэл</span>
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedPlan.priceFormatted}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Account Number */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block">Хүлээн авах данс:</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                        {BANK_DETAILS.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                      >
                        {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAccount ? 'Хууллаа' : 'Хуулах'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Bank & Name */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block">Хүлээн авагчийн нэр & Банк:</span>
                    <p className="font-semibold text-white truncate">{BANK_DETAILS.accountName}</p>
                    <p className="text-[11px] text-slate-400">{BANK_DETAILS.bankName}</p>
                  </div>
                </div>

                {/* Memo */}
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/40 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-amber-300 block">
                      Гүйлгээний утга (Заавал бичнэ):
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {transactionRef}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMemo}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMemo ? 'Хууллаа' : 'Утга хуулах'}</span>
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitReceipt} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-200 block mb-1.5">
                    Гүйлгээний баримт (Screenshot / Зураг оруулах):
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                      receiptImage
                        ? 'border-emerald-500 bg-emerald-950/20'
                        : 'border-slate-700 hover:border-emerald-500 bg-slate-950/60 hover:bg-slate-950'
                    }`}
                  >
                    {receiptImage ? (
                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={receiptImage}
                          alt="Receipt Preview"
                          className="h-20 rounded-lg object-contain border border-slate-700 shadow-md"
                        />
                        <div className="text-left text-xs">
                          <p className="font-bold text-emerald-400">Баримтын зураг хавсаргагдлаа</p>
                          <p className="text-[11px] text-slate-400">Өөр зураг оруулах бол товшино уу</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 space-y-1">
                        <Upload className="w-6 h-6 mx-auto text-slate-400 animate-bounce" />
                        <p className="text-xs font-medium text-slate-300">
                          Шилжүүлгийн баримтын сэтгэцийн зургийг энд оруулна уу
                        </p>
                        <p className="text-[10px] text-slate-500">PNG, JPG зураг хавсаргана</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Шилжүүлэгчийн утасны дугаар:
                    </label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="9911..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Тэмдэглэл:
                    </label>
                    <input
                      type="text"
                      value={userNote}
                      onChange={(e) => setUserNote(e.target.value)}
                      placeholder="Жишээ: Хаан банкнаас шилжүүлэв"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmitting ? 'Илгээж байна...' : 'Баримт илгээж, Баталгаажуулалт хүлээх'}
                    </span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STATE 2: Pending Approval (Waiting for Owner on Discord) */}
          {status === 'pending' && (
            <div className="py-8 px-4 text-center space-y-5 animate-in fade-in duration-200">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
                  <Clock className="w-9 h-9 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-extrabold text-white">
                  Баталгаажуулалт Хүлээгдэж Байна...
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Таны төлбөрийн баримтыг систем хүлээн авлаа. 
                  Администратор (Owner) <strong>Discord сувгаар</strong> шалгаад <strong>APPROVE</strong> хийсний дараа таны эрх шууд нээгдэнэ.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Гүйлгээний код:</span>
                  <span className="font-mono font-bold text-amber-400">{transactionRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Сонгосон багц:</span>
                  <span className="font-semibold text-white">{selectedPlan.nameMn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Төлөх дүн:</span>
                  <span className="font-bold text-emerald-400">{selectedPlan.priceFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Төлөв:</span>
                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Discord шалгалт хийгдэж байна</span>
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Цонхыг хаасан ч таны баталгаажуулалт цуцлагдахгүй, Discord-оос зөвшөөрөгдөхөд автоматаар идэвхжинэ.
              </p>

              {/* Owner shortcut button for instant testing */}
              {isOwner && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOwnerQuickApprove}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 mx-auto"
                  >
                    <Crown className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Owner Туршилт: Шууд Approve хийх</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE 3: Approved (Success & Plan Activated) */}
          {status === 'approved' && (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Төлбөр Амжилттай Зөвшөөрөгдлөө!</h3>
                <p className="text-xs text-emerald-400 font-medium">
                  Администратор Discord-оор баталгаажуулсан тул таны дансанд <strong>+{selectedPlan.tokens.toLocaleString()} токен</strong> орж, <strong className="text-white">{selectedPlan.nameMn}</strong> багц шууд идэвхжлээ.
                </p>
              </div>

              {/* Invoice Card */}
              <div className="p-6 rounded-2xl bg-white text-slate-900 shadow-2xl font-sans space-y-4 print:p-0">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                  <div>
                    <h4 className="font-extrabold text-base tracking-tight text-slate-950">GEMINI MIND RECEIPT</h4>
                    <p className="text-[11px] text-slate-500">Баталгаажсан цахим төлбөрийн баримт</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-slate-700">№ {transactionRef}</p>
                    <p className="text-[11px] text-emerald-600 font-bold">● APPROVED</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Захиалагч:</span>
                    <p className="font-bold text-slate-900">{userProfile.name}</p>
                    <p className="text-slate-600">{userProfile.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Хүлээн авсан данс:</span>
                    <p className="font-mono font-bold text-slate-900">{BANK_DETAILS.accountNumber}</p>
                    <p className="text-slate-600">{BANK_DETAILS.bankName}</p>
                  </div>
                </div>

                <div className="border-t border-b border-slate-200 py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{selectedPlan.nameMn}</p>
                    <p className="text-[11px] text-slate-500">+{selectedPlan.tokens.toLocaleString()} Токен</p>
                  </div>
                  <span className="text-base font-extrabold text-emerald-600">
                    {selectedPlan.priceFormatted}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Printer className="w-4 h-4" />
                  <span>Баримт хэвлэх</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Бодлого бодож эхлэх</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: Declined (Rejected by Owner on Discord) */}
          {status === 'declined' && (
            <div className="py-8 px-4 text-center space-y-5 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400 shadow-xl shadow-rose-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-extrabold text-white">
                  Төлбөр Татгалзагдлаа (Declined)
                </h3>
                <p className="text-xs text-rose-300 leading-relaxed">
                  Таны төлбөрийн баримтыг шалгахад шилжүүлэг баталгаажсангүй эсвэл гүйлгээний утга, дүн тохирсонгүй тул цуцлагдлаа.
                </p>
                <p className="text-xs text-slate-400">
                  Дансны дугаар болон гүйлгээний утгаа дахин шалгаж, шинээр баримтаа оруулна уу.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Дахин шилжүүлэг баримт оруулах</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
