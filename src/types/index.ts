export type Role = 'user' | 'model';

export type GeminiMode = 'general' | 'math' | 'homework' | 'search' | 'builder';

export type SubjectCategory = 
  | 'all'
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'history'
  | 'mongolian'
  | 'english'
  | 'coding';

export interface GroundingCitation {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  image?: string;
  mimeType?: string;
  citations?: GroundingCitation[];
  searchQueries?: string[];
  isStreaming?: boolean;
  mode?: GeminiMode;
  subject?: string;
  tokensUsed?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: GeminiMode;
  subject?: string;
  messages: Message[];
  isPinned?: boolean;
  userId?: string;
}

export type UserRole = 'owner' | 'admin' | 'user';

export type TokenPlanId = 'free' | 'pro' | 'master' | 'owner';

export interface TokenPlan {
  id: TokenPlanId;
  name: string;
  nameMn: string;
  tokens: number; // e.g. 25000, 250000, 1000000, or -1 for Infinity
  priceMNT: number;
  priceFormatted: string;
  period: string;
  badge?: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  email: string;
  avatar: string;
  isLoggedIn: boolean;
  provider: 'google' | 'firebase' | 'email' | 'discord';
  role: UserRole;
  plan: TokenPlanId;
  tokenBalance: number; // -1 represents Infinity (Owner)
  tokensUsedTotal: number;
  streakDays: number;
  solvedCount: number;
  createdAt?: number;
  discordId?: string;
  discordUsername?: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'declined';

export interface PaymentTransaction {
  id: string; // e.g. "GM-4912-PWEBSITER"
  userId: string;
  userName: string;
  userEmail: string;
  planId: TokenPlanId;
  planName: string;
  amount: number;
  tokensGranted: number;
  status: PaymentStatus;
  receiptImage?: string;
  note?: string;
  accountNumber: string;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}
