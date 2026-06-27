import { create } from 'zustand';
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

const generateId = () => 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);

export const useTwinStore = create<TwinStore>()((set, get) => ({
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
      chatHistory: [...s.chatHistory, {
        id: msg.id || generateId(),
        role: msg.role || 'user',
        content: msg.content || '',
        timestamp: msg.timestamp || Date.now(),
        emotion: msg.emotion,
        provider: msg.provider,
        failed: msg.failed,
        image: msg.image,
        thinkingStage: msg.thinkingStage,
      }].slice(-200),
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
          m.id === twinMsgId ? { ...m, content: response.reply, provider: response.provider || 'orchestrator', thinkingStage: 'complete' } : m
        ),
        isThinking: false,
        thinkingStage: 'complete',
      }));
    } catch (error) {
      set((s) => ({
        chatHistory: s.chatHistory.map((m) =>
          m.id === twinMsgId ? { ...m, content: 'عذراً، حدث خطأ في الاتصال 💜', failed: true, thinkingStage: 'complete' } : m
        ),
        isThinking: false,
        thinkingStage: 'complete',
      }));
    }
  },

  setTwinEnergy: (val) => set({ twinEnergy: Math.max(0, Math.min(100, Math.round(val))) }),
  updateBond: (val) => set({ bondLevel: Math.min(100, Math.round(val)) }),
  getEnergyPercent: () => get().twinEnergy,

  getUserStats: async () => { try { const res = await apiGet(`/api/stats/dashboard?user_id=${get().userId}`); set({ userStats: res }); } catch (e) {} },
  getRecommendations: async () => { try { const res = await apiGet(`/api/recommendations/daily?user_id=${get().userId}`); set({ recommendations: res.recommendations?.map((r: any) => r.message) || [] }); } catch (e) {} },
  getMemories: async (limit = 20) => { try { await apiGet(`/api/memories?user_id=${get().userId}&limit=${limit}`); } catch (e) {} },
  getRelationshipInsights: async () => { try { await apiGet(`/api/relationship/insights?user_id=${get().userId}`); } catch (e) {} },
  getWeeklyReport: async () => { try { await apiGet(`/api/reports/weekly?user_id=${get().userId}`); } catch (e) {} },
  getRelationshipHealth: async () => { try { await apiGet(`/api/relationship/health?user_id=${get().userId}`); } catch (e) {} },

  generateBusinessIdea: async (budget, interests, location) => { return await apiPost('/api/business/generate-idea', { user_id: get().userId, budget, interests, location, lang: get().lang }); },
  analyzeMarket: async (query) => { return await apiPost('/api/business/market-research', { user_id: get().userId, query, lang: get().lang }); },
  generateFeasibility: async (idea, budget) => { return await apiPost('/api/business/feasibility', { user_id: get().userId, idea, budget, lang: get().lang }); },
  generateBusinessCanvas: async (idea) => { return await apiPost('/api/business/canvas', { user_id: get().userId, idea, lang: get().lang }); },
  generateMarketingPlan: async (idea, budget) => { return await apiPost('/api/business/marketing-plan', { user_id: get().userId, idea, budget, lang: get().lang }); },

  startStudySession: async (concept) => { const result = await apiPost('/api/study/start', { user_id: get().userId, concept, language: get().lang }); set({ activeStudySession: { concept, explanation: result.explanation, depth: 0, accuracy: 0 } }); return result; },
  getStudyQuestion: async (topic) => { return await apiPost('/api/study/question', { user_id: get().userId, topic, lang: get().lang }); },
  answerStudyQuestion: async (questionId, answer) => { return await apiPost('/api/study/answer', { user_id: get().userId, question_id: questionId, answer, lang: get().lang }); },
  endStudySession: async () => { await apiPost('/api/study/end', { user_id: get().userId }); set({ activeStudySession: null }); },

  startCoachingSession: async (topic) => { return await apiPost('/api/life-coach/start', { user_id: get().userId, topic, lang: get().lang }); },
  getLifeAdvice: async (topic) => { return await apiPost('/api/life-coach/advice', { user_id: get().userId, topic, lang: get().lang }); },
  getNutritionPlan: async (goal) => { return await apiPost('/api/life-coach/nutrition', { user_id: get().userId, goal, lang: get().lang }); },
  getFitnessPlan: async (goal) => { return await apiPost('/api/life-coach/fitness', { user_id: get().userId, goal, lang: get().lang }); },
  createLifePlan: async (details) => { const result = await apiPost('/api/life-coach/plan', { user_id: get().userId, details, lang: get().lang }); set({ activeLifePlan: result }); return result; },

  getDeviceStatus: async () => { return await apiGet(`/api/smart-home/status?user_id=${get().userId}`); },
  sendDeviceCommand: async (device, command) => { return await apiPost('/api/smart-home/command', { user_id: get().userId, device, command }); },
  smartHomeCommand: async (command) => { return await apiPost('/api/smart-home/command', { user_id: get().userId, command }); },

  generateImage: async (prompt, style) => { const res = await apiPost('/api/image-lab/generate', { user_id: get().userId, prompt, style }); return res.image_url || ''; },
  generateContent: async (type, topic) => { return await apiPost('/api/content/generate', { user_id: get().userId, type, topic, lang: get().lang }); },

  createTask: async (title, dueDate, priority) => { const res = await apiPost('/api/tasks/create', { user_id: get().userId, title, due_date: dueDate, priority }); set((s) => ({ tasks: [...s.tasks, res.task || res] })); return res; },
  listTasks: async () => { try { const res = await apiGet(`/api/tasks?user_id=${get().userId}`); set({ tasks: res.tasks || res || [] }); } catch (e) {} },
  completeTask: async (taskId) => { const res = await apiPost('/api/tasks/complete', { user_id: get().userId, task_id: taskId }); set((s) => ({ tasks: s.tasks.map((t: any) => t.id === taskId ? { ...t, status: 'completed' } : t) })); return res; },

  generateCode: async (prompt, language) => { return await apiPost('/api/code-lab/generate', { user_id: get().userId, prompt, language }); },
  debugCode: async (code, language) => { return await apiPost('/api/code-lab/debug', { user_id: get().userId, code, language }); },

  interpretDream: async (dreamText) => { return await apiPost('/api/dreams/interpret', { user_id: get().userId, dream_text: dreamText, lang: get().lang }); },

  clearHistory: () => set({ chatHistory: [], totalMessages: 0 }),
  logout: () => set({ ...initialState }),
  openMenu: () => set({ menuVisible: true }),
  closeMenu: () => set({ menuVisible: false }),
}));
