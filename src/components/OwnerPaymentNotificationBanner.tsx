import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  ShieldAlert, 
  Check, 
  X,
  CreditCard,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../firebase';
import { UserProfile } from '../types';

interface OwnerPaymentNotificationBannerProps {
  currentUser: UserProfile;
}

export const OwnerPaymentNotificationBanner: React.FC<OwnerPaymentNotificationBannerProps> = ({
  currentUser,
}) => {
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const isOwner = currentUser.role === 'owner' || currentUser.email.toLowerCase() === 'pwebsiter@gmail.com';

  useEffect(() => {
    if (!isOwner) return;

    try {
      const q = query(
        collection(db, 'transactions'),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        // Sort newest first
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPendingPayments(items);
      }, (error) => {
        console.warn('Firestore transactions listener warning:', error);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Setup listener error:', e);
    }
  }, [isOwner]);

  if (!isOwner || pendingPayments.length === 0) {
    return null;
  }

  const handleApprove = async (tx: any) => {
    setProcessingId(tx.id);
    try {
      // 1. Update in Firestore
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: 'approved',
        reviewedAt: Date.now(),
        reviewedBy: currentUser.email,
      });

      // 2. Also notify backend to update memory and send green confirmation to Discord
      await fetch('/api/payment/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tx.id,
          action: 'approve',
          reviewer: `Owner (${currentUser.email})`,
        }),
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.1 },
      });
    } catch (err: any) {
      alert('Зөвшөөрөхөд алдаа гарлаа: ' + err.message);
    } finally {
      setProcessingId(null);
      if (selectedReceipt?.id === tx.id) setSelectedReceipt(null);
    }
  };

  const handleDecline = async (tx: any) => {
    setProcessingId(tx.id);
    try {
      // 1. Update in Firestore
      await updateDoc(doc(db, 'transactions', tx.id), {
        status: 'declined',
        reviewedAt: Date.now(),
        reviewedBy: currentUser.email,
      });

      // 2. Notify backend
      await fetch('/api/payment/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tx.id,
          action: 'decline',
          reviewer: `Owner (${currentUser.email})`,
        }),
      });
    } catch (err: any) {
      alert('Татгалзахад алдаа гарлаа: ' + err.message);
    } finally {
      setProcessingId(null);
      if (selectedReceipt?.id === tx.id) setSelectedReceipt(null);
    }
  };

  return (
    <>
      {/* Floating Top Banner for Owner */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in slide-in-from-top-4 duration-300 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {pendingPayments.map((tx) => (
            <div
              key={tx.id}
              className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-amber-950/80 to-slate-900/95 border-2 border-amber-500/80 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 shrink-0">
                    <CreditCard className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-ping" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono">
                      ШИНЭ ТӨЛБӨР #{tx.id}
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      {Number(tx.amount || 25000).toLocaleString()} ₮
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      ({tx.planName || 'Сурагч Standard'})
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    Хэрэглэгч: <strong className="text-white">{tx.userName}</strong> ({tx.userEmail})
                    {tx.note && <span className="text-amber-200/80 ml-2">· {tx.note}</span>}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {tx.receiptImage && (
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(tx)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Зураг үзэх
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleApprove(tx)}
                  disabled={processingId === tx.id}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{processingId === tx.id ? 'Батлаж байна...' : 'Шууд Approve'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDecline(tx)}
                  disabled={processingId === tx.id}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1 disabled:opacity-50 transition-all active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for viewing receipt screenshot if owner clicks "Зураг үзэх" */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-white text-sm">Төлбөрийн Баримтын Зураг</h4>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-[60vh]">
              <img
                src={selectedReceipt.receiptImage}
                alt="Receipt"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(selectedReceipt)}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                ✓ Зөвшөөрөх
              </button>
              <button
                onClick={() => handleDecline(selectedReceipt)}
                className="flex-1 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 font-bold text-xs"
              >
                ✕ Татгалзах
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
