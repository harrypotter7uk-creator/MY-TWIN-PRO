import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, apiGet } from '../lib/httpClient';

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
  activeStudySession: any;
  activeBusinessProject: any;
  activeLifePlan: any;
  recentDreams: any[];
  tasks: any[];
  userStats: any;
  recommendations: string[];
  proactiveMessage: string;
  menuVisible: boolean;
  points: number;
  badges: string[];

  setAuth: (userId: string) => void;
  setTier: (tier: Tier) => void;
  setLang: (lang: Lang) => void;
  toggleTheme: () => void;
  toggleCalmMode: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setVoicePersonality: (personality: string) => void;
  setTwinName: (name: string) => void;
  setTwinGender: (gender: TwinGender) => void;
  setTwinStyle: (style: TwinStyle) => void;
  setReplyStyle: (style: ReplyStyle) => void;
  setTwinTraits: (traits: string[]) => void;
  addMessage: (msg: Partial<ChatMessage>) => void;
  sendMessage: (message: string) => Promise<void>;
  setThinking: (thinking: boolean) => void;
  setThinkingStage: (stage: string) => void;
  setStreamingText: (text: string) => void;
  setTwinEnergy: (val: number) => void;
  updateBond: (val: number) => void;
  getEnergyPercent: () => number;
  getUserStats: () => Promise<void>;
  getRecommendations: () => Promise<void>;
  getMemories: (limit?: number) => Promise<void>;
  getRelationshipInsights: () => Promise<void>;
  getWeeklyReport: () => Promise<void>;
  getRelationshipHealth: () => Promise<void>;
  generateBusinessIdea: (budget: number, interests: string, location: string) => Promise<any>;
  analyzeMarket: (query: string) => Promise<any>;
  generateFeasibility: (idea: string, budget: number) => Promise<any>;
  generateBusinessCanvas: (idea: string) => Promise<any>;
  generateMarketingPlan: (idea: string, budget: number) => Promise<any>;
  startStudySession: (concept: string) => Promise<any>;
  getStudyQuestion: (topic: string) => Promise<any>;
  answerStudyQuestion: (questionId: string, answer: string) => Promise<any>;
  endStudySession: () => Promise<void>;
  startCoachingSession: (topic: string) => Promise<any>;
  getLifeAdvice: (topic: string) => Promise<any>;
  getNutritionPlan: (goal: string) => Promise<any>;
  getFitnessPlan: (goal: string) => Promise<any>;
  createLifePlan: (details: string) => Promise<any>;
  getDeviceStatus: () => Promise<any>;
  sendDeviceCommand: (device: string, command: string) => Promise<any>;
  smartHomeCommand: (command: string) => Promise<any>;
  generateImage: (prompt: string, style: string) => Promise<string>;
  generateContent: (type: string, topic: string) => Promise<any>;
  createTask: (title: string, dueDate?: string, priority?: string) => Promise<any>;
  listTasks: () => Promise<void>;
  completeTask: (taskId: string) => Promise<any>;
  generateCode: (prompt: string, language: string) => Promise<any>;
  debugCode: (code: string, language: string) => Promise<any>;
  interpretDream: (dreamText: string) => Promise<any>;
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
  activeStudySession: null,
  activeBusinessProject: null,
  activeLifePlan: null,
  recentDreams: [] as any[],
  tasks: [] as any[],
  userStats: null,
  recommendations: [] as string[],
  proactiveMessage: '',
  menuVisible: false,
  points: 0,
  badges: [] as string[],
};

const generateId = () =>
  'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

export const useTwinStore = create<TwinStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (userId) => set({ userId }),
      setTier: (tier) => set({ tier }),
      setLang: (lang) => set({ lang }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      toggleCalmMode: () => set((s) => ({ calmMode: !s.calmMode })),
      setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
      setVoicePersonality: (personality) => set({ voicePersonality: personality }),

      setTwinName: (name) => set({ twinName: name }),
      setTwinGender: (gender) => set({ twinGender: gender }),
      setTwinStyle: (style) => set({ twinStyle: style }),
      setReplyStyle: (style) => set({ replyStyle: style }),
      setTwinTraits: (traits) => set({ twinTraits: traits }),

      setThinking: (thinking) => set({ isThinking: thinking }),
      setThinkingStage: (stage) => set({ thinkingStage: stage }),
      setStreamingText: (text) => set({ streamingText: text }),

      addMessage: (msg) =>
        set((s) => ({
          chatHistory: [
            ...s.chatHistory,
            {
              id: msg.id || generateId(),
              role: msg.role || 'user',
              content: msg.content || '',
              timestamp: msg.timestamp || Date.now(),
              emotion: msg.emotion,
              provider: msg.provider,
              failed: msg.failed,
              image: msg.image,
              thinkingStage: msg.thinkingStage,
            },
          ].slice(-200),
          totalMessages: s.totalMessages + 1,
          twinEnergy: Math.max(0, s.twinEnergy - 2),
          bondLevel: Math.min(s.bondLevel + (Math.random() * 0.3 + 0.1), 100),
        })),

      sendMessage: async (message: string) => {
        const state = get();
        set({ isThinking: true, thinkingStage: 'thinking' });
        state.addMessage({ role: 'user', content: message });
        const twinMsgId = generateId();
        state.addMessage({ id: twinMsgId, role: 'twin', content: '', thinkingStage: 'thinking' });
        try {
          const response = await apiPost('/api/chat', {
            message,
            history: state.chatHistory.slice(-10).map((m) => ({ role: m.role, content: m.content })),
            lang: state.lang,
          });
          set((s) => ({
            chatHistory: s.chatHistory.map((m) =>
              m.id === twinMsgId
                ? { ...m, content: response.reply, provider: response.provider || 'orchestrator', thinkingStage: 'complete' }
                : m
            ),
            isThinking: false,
            thinkingStage: 'complete',
          }));
        } catch (error) {
          set((s) => ({
            chatHistory: s.chatHistory.map((m) =>
              m.id === twinMsgId
                ? { ...m, content: 'عذراً، حدث خطأ في الاتصال 💜', failed: true, thinkingStage: 'complete' }
                : m
            ),
            isThinking: false,
            thinkingStage: 'complete',
          }));
        }
      },

      setTwinEnergy: (val) => set({ twinEnergy: Math.max(0, Math.min(100, Math.round(val))) }),
      updateBond: (val) => set({ bondLevel: Math.min(100, Math.round(val)) }),
      getEnergyPercent: () => {
        const { twinEnergy } = get();
        return twinEnergy;
      },

      getUserStats: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          const res = await apiGet(`/api/stats/dashboard?user_id=${userId}`);
          set({ userStats: res });
        } catch (e) {
          console.error('getUserStats failed:', e);
        }
      },

      getRecommendations: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          const res = await apiGet(`/api/recommendations/daily?user_id=${userId}`);
          set({ recommendations: res.recommendations?.map((r: any) => r.message) || [] });
        } catch (e) {
          console.error('getRecommendations failed:', e);
        }
      },

      getMemories: async (limit = 20) => {
        const { userId } = get();
        if (!userId) return;
        try {
          await apiGet(`/api/memories?user_id=${userId}&limit=${limit}`);
        } catch (e) {
          console.error('getMemories failed:', e);
        }
      },

      getRelationshipInsights: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          await apiGet(`/api/relationship/insights?user_id=${userId}`);
        } catch (e) {
          console.error('getRelationshipInsights failed:', e);
        }
      },

      getWeeklyReport: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          await apiGet(`/api/reports/weekly?user_id=${userId}`);
        } catch (e) {
          console.error('getWeeklyReport failed:', e);
        }
      },

      getRelationshipHealth: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          await apiGet(`/api/relationship/health?user_id=${userId}`);
        } catch (e) {
          console.error('getRelationshipHealth failed:', e);
        }
      },

      generateBusinessIdea: async (budget, interests, location) => {
        const { userId, lang } = get();
        return await apiPost('/api/business/generate-idea', { user_id: userId, budget, interests, location, lang });
      },
      analyzeMarket: async (query) => {
        const { userId, lang } = get();
        return await apiPost('/api/business/market-research', { user_id: userId, query, lang });
      },
      generateFeasibility: async (idea, budget) => {
        const { userId, lang } = get();
        return await apiPost('/api/business/feasibility', { user_id: userId, idea, budget, lang });
      },
      generateBusinessCanvas: async (idea) => {
        const { userId, lang } = get();
        return await apiPost('/api/business/canvas', { user_id: userId, idea, lang });
      },
      generateMarketingPlan: async (idea, budget) => {
        const { userId, lang } = get();
        return await apiPost('/api/business/marketing-plan', { user_id: userId, idea, budget, lang });
      },

      startStudySession: async (concept) => {
        const { userId, lang } = get();
        const result = await apiPost('/api/study/start', { user_id: userId, concept, language: lang });
        set({ activeStudySession: { concept, explanation: result.explanation, depth: 0, accuracy: 0 } });
        return result;
      },
      getStudyQuestion: async (topic) => {
        const { userId, lang } = get();
        return await apiPost('/api/study/question', { user_id: userId, topic, lang });
      },
      answerStudyQuestion: async (questionId, answer) => {
        const { userId, lang } = get();
        return await apiPost('/api/study/answer', { user_id: userId, question_id: questionId, answer, lang });
      },
      endStudySession: async () => {
        const { userId } = get();
        await apiPost('/api/study/end', { user_id: userId });
        set({ activeStudySession: null });
      },

      startCoachingSession: async (topic) => {
        const { userId, lang } = get();
        return await apiPost('/api/life-coach/start', { user_id: userId, topic, lang });
      },
      getLifeAdvice: async (topic) => {
        const { userId, lang } = get();
        return await apiPost('/api/life-coach/advice', { user_id: userId, topic, lang });
      },
      getNutritionPlan: async (goal) => {
        const { userId, lang } = get();
        return await apiPost('/api/life-coach/nutrition', { user_id: userId, goal, lang });
      },
      getFitnessPlan: async (goal) => {
        const { userId, lang } = get();
        return await apiPost('/api/life-coach/fitness', { user_id: userId, goal, lang });
      },
      createLifePlan: async (details) => {
        const { userId, lang } = get();
        const result = await apiPost('/api/life-coach/plan', { user_id: userId, details, lang });
        set({ activeLifePlan: result });
        return result;
      },

      getDeviceStatus: async () => {
        const { userId } = get();
        return await apiGet(`/api/smart-home/status?user_id=${userId}`);
      },
      sendDeviceCommand: async (device, command) => {
        const { userId } = get();
        return await apiPost('/api/smart-home/command', { user_id: userId, device, command });
      },
      smartHomeCommand: async (command) => {
        const { userId } = get();
        return await apiPost('/api/smart-home/command', { user_id: userId, command });
      },

      generateImage: async (prompt, style) => {
        const { userId } = get();
        const res = await apiPost('/api/image-lab/generate', { user_id: userId, prompt, style });
        return res.image_url || '';
      },

      generateContent: async (type, topic) => {
        const { userId, lang } = get();
        return await apiPost('/api/content/generate', { user_id: userId, type, topic, lang });
      },

      createTask: async (title, dueDate, priority) => {
        const { userId } = get();
        const res = await apiPost('/api/tasks/create', { user_id: userId, title, due_date: dueDate, priority });
        set((s) => ({ tasks: [...s.tasks, res.task || res] }));
        return res;
      },
      listTasks: async () => {
        const { userId } = get();
        if (!userId) return;
        try {
          const res = await apiGet(`/api/tasks?user_id=${userId}`);
          set({ tasks: res.tasks || res || [] });
        } catch (e) {
          console.error('listTasks failed:', e);
        }
      },
      completeTask: async (taskId) => {
        const { userId } = get();
        const res = await apiPost('/api/tasks/complete', { user_id: userId, task_id: taskId });
        set((s) => ({
          tasks: s.tasks.map((t: any) =>
            t.id === taskId ? { ...t, status: 'completed' } : t
          ),
        }));
        return res;
      },

      generateCode: async (prompt, language) => {
        const { userId } = get();
        return await apiPost('/api/code-lab/generate', { user_id: userId, prompt, language });
      },
      debugCode: async (code, language) => {
        const { userId } = get();
        return await apiPost('/api/code-lab/debug', { user_id: userId, code, language });
      },

      interpretDream: async (dreamText) => {
        const { userId, lang } = get();
        return await apiPost('/api/dreams/interpret', { user_id: userId, dream_text: dreamText, lang });
      },

      clearHistory: () => set({ chatHistory: [], totalMessages: 0 }),
      logout: () => set({ ...initialState, chatHistory: [], totalMessages: 0 }),
      openMenu: () => set({ menuVisible: true }),
      closeMenu: () => set({ menuVisible: false }),
    }),
    {
      name: 'mytwin-store',
      version: 10,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        twinName: state.twinName,
        twinGender: state.twinGender,
        twinStyle: state.twinStyle,
        twinTraits: state.twinTraits,
        tier: state.tier,
        theme: state.theme,
        lang: state.lang,
        calmMode: state.calmMode,
        bondLevel: state.bondLevel,
        journeyPhase: state.journeyPhase,
        attachmentStyle: state.attachmentStyle,
        voiceEnabled: state.voiceEnabled,
        voicePersonality: state.voicePersonality,
        points: state.points,
        badges: state.badges,
      }),
    }
  )
);
