import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'twin';
  content: string;
  timestamp: number;
  emotion?: string;
  provider?: string;
  failed?: boolean;
  image?: string;
  thinkingStage?: string;
}

export type Tier = 'free' | 'plus' | 'premium' | 'pro' | 'yearly';
export type TwinGender = 'female' | 'male';
export type TwinStyle = 'supportive' | 'coach' | 'wise' | 'fun' | 'calm';
export type ReplyStyle = 'short' | 'medium' | 'long';
export type Theme = 'dark' | 'light';
export type Lang = 'ar' | 'en';

export interface TwinStore {
  userId: string;
  twinName: string;
  twinGender: TwinGender;
  twinStyle: TwinStyle;
  twinTraits: string[];
  replyStyle: ReplyStyle;
  tier: Tier;
  theme: Theme;
  lang: Lang;
  calmMode: boolean;
  voiceEnabled: boolean;
  voicePersonality: string;
  chatHistory: ChatMessage[];
  totalMessages: number;
  isThinking: boolean;
  thinkingStage: string;
  streamingText: string;
  twinEnergy: number;
  bondLevel: number;
  relationshipDims: Record<string, number>;
  journeyPhase: string;
  attachmentStyle: string;
  menuVisible: boolean;

  setAuth: (userId: string) => void;
  setTier: (tier: Tier) => void;
  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
  setTwinName: (name: string) => void;
  setTwinGender: (gender: TwinGender) => void;
  setTwinStyle: (style: TwinStyle) => void;
  clearHistory: () => void;
  logout: () => void;
  openMenu: () => void;
  closeMenu: () => void;
}

const initialState = {
  userId: '',
  twinName: 'توأمك',
  twinGender: 'female' as TwinGender,
  twinStyle: 'supportive' as TwinStyle,
  twinTraits: [] as string[],
  replyStyle: 'medium' as ReplyStyle,
  tier: 'free' as Tier,
  theme: 'light' as Theme,
  lang: 'ar' as Lang,
  calmMode: false,
  voiceEnabled: true,
  voicePersonality: 'friend',
  chatHistory: [] as ChatMessage[],
  totalMessages: 0,
  isThinking: false,
  thinkingStage: 'idle',
  streamingText: '',
  twinEnergy: 100,
  bondLevel: 0,
  relationshipDims: {},
  journeyPhase: 'introduction',
  attachmentStyle: 'unknown',
  menuVisible: false,
};

export const useTwinStore = create<TwinStore>()(
  (set, get) => ({
    ...initialState,

    setAuth: (userId) => set({ userId }),
    setTier: (tier) => set({ tier }),
    setLang: (lang) => set({ lang }),
    toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    setTwinName: (name) => set({ twinName: name }),
    setTwinGender: (gender) => set({ twinGender: gender }),
    setTwinStyle: (style) => set({ twinStyle: style }),

    clearHistory: () => set({ chatHistory: [], totalMessages: 0 }),
    logout: () => set({ ...initialState }),
    openMenu: () => set({ menuVisible: true }),
    closeMenu: () => set({ menuVisible: false }),
  })
);
