/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatInput } from './components/ChatInput';
import { MessageItem } from './components/MessageItem';
import { SubjectPresets } from './components/SubjectPresets';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { HomeworkSolverModal } from './components/HomeworkSolverModal';
import { CodeSandboxModal } from './components/CodeSandboxModal';
import { TokenPlansModal } from './components/TokenPlansModal';
import { OwnerAdminModal } from './components/OwnerAdminModal';
import { PaymentReceiptModal } from './components/PaymentReceiptModal';
import { OwnerPaymentNotificationBanner } from './components/OwnerPaymentNotificationBanner';
import { ChatSession, GeminiMode, Message, TokenPlan, TokenPlanId, UserProfile } from './types';
import { TOKEN_PLANS } from './constants/plans';
import { extractCodeBlocks } from './utils/formatters';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth, OWNER_EMAIL, isOwnerEmail } from './firebase';
import confetti from 'canvas-confetti';

const STORAGE_KEY_SESSIONS = 'gemini_mind_sessions_v2';
const STORAGE_KEY_PROFILE = 'gemini_mind_profile_v2';
const STORAGE_KEY_THEME = 'gemini_mind_theme_v2';
const STORAGE_KEY_ALL_USERS = 'gemini_mind_all_users_v2';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    return saved !== null ? saved === 'true' : true;
  });

  // Owner & User Profile state (pwebsiter@gmail.com is Owner with Unlimited tokens)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isOwnerEmail(parsed.email)) {
          return {
            ...parsed,
            role: 'owner',
            plan: 'owner',
            tokenBalance: -1,
          };
        }
        return parsed;
      } catch (e) {}
    }
    return {
      id: 'owner_pwebsiter',
      uid: 'owner_pwebsiter_uid',
      name: 'P. Websiter',
      email: OWNER_EMAIL,
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=pwebsiter&backgroundColor=1e293b,0f172a',
      isLoggedIn: true,
      provider: 'google',
      role: 'owner',
      plan: 'owner',
      tokenBalance: -1, // Unlimited tokens for owner
      tokensUsedTotal: 1850,
      streakDays: 7,
      solvedCount: 24,
    };
  });

  // Mock & registered users list for the Owner Admin Console
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ALL_USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'owner_pwebsiter',
        name: 'P. Websiter (Та / Owner)',
        email: OWNER_EMAIL,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=pwebsiter&backgroundColor=1e293b,0f172a',
        isLoggedIn: true,
        provider: 'google',
        role: 'owner',
        plan: 'owner',
        tokenBalance: -1,
        tokensUsedTotal: 1850,
        streakDays: 7,
        solvedCount: 24,
      },
      {
        id: 'usr_batbayar',
        name: 'Батбаяр Э.',
        email: 'batbayar.student@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=batbayar&backgroundColor=1e293b,0f172a',
        isLoggedIn: false,
        provider: 'email',
        role: 'user',
        plan: 'pro',
        tokenBalance: 215000,
        tokensUsedTotal: 35000,
        streakDays: 3,
        solvedCount: 16,
      },
      {
        id: 'usr_nomin',
        name: 'Номин-Эрдэнэ Т.',
        email: 'nomin.t@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=nomin&backgroundColor=1e293b,0f172a',
        isLoggedIn: false,
        provider: 'google',
        role: 'user',
        plan: 'free',
        tokenBalance: 18400,
        tokensUsedTotal: 6600,
        streakDays: 2,
        solvedCount: 8,
      },
      {
        id: 'usr_temuulen',
        name: 'Тэмүүлэн Б.',
        email: 'temuulen.coder@gmail.com',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=temuulen&backgroundColor=1e293b,0f172a',
        isLoggedIn: false,
        provider: 'google',
        role: 'user',
        plan: 'master',
        tokenBalance: 870000,
        tokensUsedTotal: 130000,
        streakDays: 5,
        solvedCount: 42,
      },
    ];
  });

  // Chat sessions state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<GeminiMode>('general');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHomeworkSolverOpen, setIsHomeworkSolverOpen] = useState(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isTokenPlansOpen, setIsTokenPlansOpen] = useState(false);
  const [isOwnerAdminOpen, setIsOwnerAdminOpen] = useState(false);
  const [isPaymentReceiptOpen, setIsPaymentReceiptOpen] = useState(false);
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<TokenPlan | null>(null);
  const [sandboxCode, setSandboxCode] = useState('');
  const [sandboxLang, setSandboxLang] = useState('html');

  // Streaming & abort controller
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userEmail = fbUser.email || OWNER_EMAIL;
        const isOwner = isOwnerEmail(userEmail);
        setUserProfile((prev) => ({
          ...prev,
          id: fbUser.uid,
          uid: fbUser.uid,
          name: fbUser.displayName || (isOwner ? 'P. Websiter (Owner)' : userEmail.split('@')[0]),
          email: userEmail,
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userEmail)}&backgroundColor=1e293b,0f172a`,
          isLoggedIn: true,
          role: isOwner ? 'owner' : prev.role || 'user',
          plan: isOwner ? 'owner' : prev.plan || 'free',
          tokenBalance: isOwner ? -1 : prev.tokenBalance > 0 ? prev.tokenBalance : 25000,
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  // Save user profile
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));
  }, [userProfile]);

  // Save allUsers
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ALL_USERS, JSON.stringify(allUsers));
  }, [allUsers]);

  // Save theme
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessions, activeSessionId, isStreaming]);

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Check if current session contains executable code
  const currentHasCode = activeSession?.messages.some((m) => {
    const blocks = extractCodeBlocks(m.content);
    return blocks.length > 0;
  }) || false;

  // Handle plan upgrade / selection
  const handleSelectPlan = (planId: TokenPlanId) => {
    const tokenAmounts: Record<TokenPlanId, number> = {
      free: 25000,
      pro: 250000,
      master: 1000000,
      owner: -1,
    };

    const newTokens = tokenAmounts[planId];
    setUserProfile((prev) => ({
      ...prev,
      plan: planId,
      tokenBalance: newTokens,
      role: planId === 'owner' ? 'owner' : prev.role,
    }));

    // Update in allUsers list
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userProfile.id
          ? { ...u, plan: planId, tokenBalance: newTokens, role: planId === 'owner' ? 'owner' : u.role }
          : u
      )
    );
  };

  // Redeem Promo code handler
  const handleRedeemPromo = (code: string): boolean => {
    const upper = code.trim().toUpperCase();
    let bonus = 0;
    if (upper === 'GEMINI-MIND' || upper === 'SCHOLAR-2026') {
      bonus = 50000;
    } else if (upper === 'OWNER-VIP' || upper === 'OWNER-VIP-2026') {
      bonus = 250000;
    } else if (upper === 'STUDENT-SPECIAL') {
      bonus = 25000;
    } else {
      return false;
    }

    setUserProfile((prev) => ({
      ...prev,
      tokenBalance: prev.tokenBalance === -1 ? -1 : prev.tokenBalance + bonus,
    }));
    return true;
  };

  // Owner update user plan handler
  const handleUpdateUserPlan = (userId: string, newPlan: TokenPlanId, newTokens: number) => {
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, plan: newPlan, tokenBalance: newTokens, role: newPlan === 'owner' ? 'owner' : u.role }
          : u
      )
    );

    if (userProfile.id === userId) {
      setUserProfile((prev) => ({
        ...prev,
        plan: newPlan,
        tokenBalance: newTokens,
        role: newPlan === 'owner' ? 'owner' : prev.role,
      }));
    }
  };

  // Owner add tokens to user
  const handleAddTokensToUser = (userId: string, amount: number) => {
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, tokenBalance: u.tokenBalance === -1 ? -1 : u.tokenBalance + amount }
          : u
      )
    );

    if (userProfile.id === userId) {
      setUserProfile((prev) => ({
        ...prev,
        tokenBalance: prev.tokenBalance === -1 ? -1 : prev.tokenBalance + amount,
      }));
    }
  };

  // Create a new session
  const handleNewChat = (mode: GeminiMode = 'general', initialSubject?: string) => {
    const newSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: 'Шинэ яриа',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: mode,
      subject: initialSubject,
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setCurrentMode(mode);
  };

  // Delete session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  };

  // Toggle pin session
  const handleTogglePinSession = (id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isPinned: !s.isPinned } : s))
    );
  };

  // Select session
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const session = sessions.find((s) => s.id === id);
    if (session) {
      setCurrentMode(session.mode);
    }
  };

  // Open Sandbox with specific code
  const handleOpenSandboxWithCode = (code: string, language: string = 'html') => {
    setSandboxCode(code);
    setSandboxLang(language);
    setIsSandboxOpen(true);
  };

  // Open Sandbox with the latest code block in session
  const handleOpenLatestSandbox = () => {
    if (!activeSession) return;
    for (let i = activeSession.messages.length - 1; i >= 0; i--) {
      const blocks = extractCodeBlocks(activeSession.messages[i].content);
      if (blocks.length > 0) {
        setSandboxCode(blocks[blocks.length - 1].code);
        setSandboxLang(blocks[blocks.length - 1].language);
        setIsSandboxOpen(true);
        return;
      }
    }
  };

  // Handle Stop streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Send message to Gemini
  const handleSendMessage = async (
    content: string,
    image?: string,
    mimeType?: string,
    options?: { webSearch?: boolean; subject?: string }
  ) => {
    // Check tokens if not owner
    if (userProfile.tokenBalance !== -1 && userProfile.tokenBalance <= 0) {
      setIsTokenPlansOpen(true);
      return;
    }

    let targetSessionId = activeSessionId;
    let targetSession = activeSession;

    // If no session exists yet, create one
    if (!targetSessionId || !targetSession) {
      const title = content.slice(0, 36) || 'Бодлогын зураг';
      const newSession: ChatSession = {
        id: 'session_' + Date.now(),
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: currentMode,
        subject: options?.subject,
        messages: [],
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      targetSessionId = newSession.id;
      targetSession = newSession;
    } else if (targetSession.messages.length === 0) {
      const title = content.slice(0, 36) || 'Бодлогын шийдэл';
      setSessions((prev) =>
        prev.map((s) => (s.id === targetSessionId ? { ...s, title } : s))
      );
    }

    const userMessage: Message = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content,
      timestamp: Date.now(),
      image,
      mimeType,
      mode: currentMode,
      subject: options?.subject,
    };

    const assistantMessageId = 'msg_model_' + (Date.now() + 1);
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now() + 1,
      mode: currentMode,
      isStreaming: true,
    };

    // Update session state with both messages
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            updatedAt: Date.now(),
            messages: [...s.messages, userMessage, assistantMessage],
          };
        }
        return s;
      })
    );

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const conversationHistory = [...(targetSession?.messages || []), userMessage];
      const payload = {
        messages: conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
          image: m.image,
          mimeType: m.mimeType,
        })),
        mode: currentMode,
        subject: options?.subject || targetSession?.subject,
        webSearch: options?.webSearch || currentMode === 'search',
      };

      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let extractedCitations: any[] = [];
      let extractedSearchQueries: string[] = [];
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.text) {
                accumulatedText += data.text;
                setSessions((prev) =>
                  prev.map((s) => {
                    if (s.id === targetSessionId) {
                      return {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantMessageId
                            ? { ...m, content: accumulatedText }
                            : m
                        ),
                      };
                    }
                    return s;
                  })
                );
              }

              if (data.citations) {
                extractedCitations = data.citations;
              }
              if (data.searchQueries) {
                extractedSearchQueries = data.searchQueries;
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (err) {}
          }
        }
      }

      // If stream ended with empty accumulatedText, fallback seamlessly to /api/gemini/chat
      if (!accumulatedText.trim()) {
        try {
          const fallbackRes = await fetch('/api/gemini/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            accumulatedText = fallbackData.text || '';
            extractedCitations = fallbackData.citations || [];
            extractedSearchQueries = fallbackData.searchQueries || [];
          }
        } catch (fbErr) {
          console.warn('Fallback chat attempt failed:', fbErr);
        }
      }

      // Calculate approximate tokens used (1 char approx 0.35 tokens)
      const approxTokens = Math.max(120, Math.round((content.length + accumulatedText.length) * 0.4));

      // Deduct tokens if not Owner
      setUserProfile((prev) => {
        const isOwner = prev.role === 'owner' || prev.email.toLowerCase() === OWNER_EMAIL;
        const newBalance = isOwner ? -1 : Math.max(0, prev.tokenBalance - approxTokens);
        return {
          ...prev,
          tokenBalance: newBalance,
          tokensUsedTotal: prev.tokensUsedTotal + approxTokens,
          solvedCount: currentMode === 'math' || currentMode === 'homework' ? prev.solvedCount + 1 : prev.solvedCount,
        };
      });

      // Finalize message
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: accumulatedText || 'Хариулт бэлтгэхэд түр хугацааны саатал гарлаа. Дахин асууна уу.',
                      citations: extractedCitations,
                      searchQueries: extractedSearchQueries,
                      isStreaming: false,
                      tokensUsed: approxTokens,
                    }
                  : m
              ),
            };
          }
          return s;
        })
      );

      // Confetti celebration for solved math or code artifact
      if (currentMode === 'math' || currentMode === 'builder') {
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.8 },
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream stopped by user');
      } else {
        console.error('Chat error:', error);
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === targetSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content:
                          'Бодлого бодох явцад алдаа гарлаа: ' +
                          (error.message || 'Сүлжээний холболтоо шалгана уу.'),
                        isStreaming: false,
                      }
                    : m
                ),
              };
            }
            return s;
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Real-time Floating Payment Alert for Owner */}
      <OwnerPaymentNotificationBanner currentUser={userProfile} />

      {/* Sidebar with Chat History & Quick Solvers */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onTogglePinSession={handleTogglePinSession}
        onOpenHomeworkSolver={() => setIsHomeworkSolverOpen(true)}
        userProfile={userProfile}
        isOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <Header
          currentMode={currentMode}
          onSelectMode={(mode) => {
            setCurrentMode(mode);
            if (activeSession) {
              setSessions((prev) =>
                prev.map((s) => (s.id === activeSession.id ? { ...s, mode } : s))
              );
            }
          }}
          userProfile={userProfile}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={async () => {
            try {
              await fbSignOut(auth);
            } catch (e) {}
            setUserProfile((prev) => ({
              ...prev,
              isLoggedIn: false,
              name: 'Зочин',
              email: '',
              role: 'user',
              plan: 'free',
              tokenBalance: 25000,
            }));
          }}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          onOpenSandbox={handleOpenLatestSandbox}
          hasActiveCode={currentHasCode}
          onNewChat={() => handleNewChat()}
          onOpenTokenPlans={() => setIsTokenPlansOpen(true)}
          onOpenOwnerAdmin={() => setIsOwnerAdminOpen(true)}
        />

        {/* Scrollable Conversation or Starter Presets */}
        <main className="flex-1 overflow-y-auto">
          {!activeSession || activeSession.messages.length === 0 ? (
            <SubjectPresets
              onSelectPrompt={(prompt, mode, subject) => {
                setCurrentMode(mode);
                handleSendMessage(prompt, undefined, undefined, {
                  subject,
                  webSearch: mode === 'search',
                });
              }}
              onOpenHomeworkSolver={() => setIsHomeworkSolverOpen(true)}
            />
          ) : (
            <div className="pb-6">
              {activeSession.messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  userProfile={userProfile}
                  onOpenSandboxWithCode={handleOpenSandboxWithCode}
                  onSelectSearchQuery={(query) => {
                    handleSendMessage(`Google Search: ${query}`, undefined, undefined, {
                      webSearch: true,
                    });
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Multimodal Chat Input */}
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            onStopStreaming={handleStopStreaming}
            currentMode={currentMode}
            onSelectMode={setCurrentMode}
          />
        </div>
      </div>

      {/* Google & Firebase Authentication Dialog */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLogin={(profile) => {
          setUserProfile(profile);
          setAllUsers((prev) => {
            const exists = prev.some((u) => u.email === profile.email);
            if (!exists) return [profile, ...prev];
            return prev.map((u) => (u.email === profile.email ? profile : u));
          });
        }}
        defaultEmail={OWNER_EMAIL}
      />

      {/* Photo Vision Problem Solver Dialog */}
      <HomeworkSolverModal
        isOpen={isHomeworkSolverOpen}
        onClose={() => setIsHomeworkSolverOpen(false)}
        onSolve={(problemText, image, mimeType, subject) => {
          handleSendMessage(problemText, image, mimeType, {
            subject,
            webSearch: false,
          });
        }}
      />

      {/* Live AI Builder & Sandbox Runner Modal */}
      <CodeSandboxModal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        initialCode={sandboxCode}
        language={sandboxLang}
      />

      {/* Token Plans & Pricing Modal */}
      <TokenPlansModal
        isOpen={isTokenPlansOpen}
        onClose={() => setIsTokenPlansOpen(false)}
        userProfile={userProfile}
        onSelectPlan={handleSelectPlan}
        onRedeemPromo={handleRedeemPromo}
        onInitiatePayment={(plan) => {
          setSelectedPaymentPlan(plan);
          setIsTokenPlansOpen(false);
          setIsPaymentReceiptOpen(true);
        }}
      />

      {/* Bank Payment & Receipt Confirmation Modal */}
      {selectedPaymentPlan && (
        <PaymentReceiptModal
          isOpen={isPaymentReceiptOpen}
          onClose={() => setIsPaymentReceiptOpen(false)}
          selectedPlan={selectedPaymentPlan}
          userProfile={userProfile}
          onPaymentSuccess={(planId, tokensGranted) => {
            handleSelectPlan(planId);
          }}
        />
      )}

      {/* Owner Admin Console Modal (For pwebsiter@gmail.com) */}
      <OwnerAdminModal
        isOpen={isOwnerAdminOpen}
        onClose={() => setIsOwnerAdminOpen(false)}
        currentUser={userProfile}
        allUsers={allUsers}
        onUpdateUserPlan={handleUpdateUserPlan}
        onAddTokensToUser={handleAddTokensToUser}
      />
    </div>
  );
}
