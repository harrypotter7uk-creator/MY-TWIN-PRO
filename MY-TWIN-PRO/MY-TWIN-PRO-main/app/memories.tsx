import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { router } from 'expo-router';
import { apiGet } from '../lib/httpClient';
import {
  BrainCircuit, Clock, Layers, Sparkles, Target, Heart, Star,
  MessageCircle, ArrowLeft, RefreshCw, Database, Activity,
  Users, Lightbulb, FileText, TrendingUp, Eye,
  Zap, BookOpen, Smile, Shield,
} from 'lucide-react-native';

type MemoryTab = 'conversations' | 'emotional' | 'reflections' | 'people';

const T = {
  ar: {
    title: 'معرض الذكريات',
    loading: 'جاري تحميل ذكرياتك...',
    tabs: {
      conversations: 'المحادثات',
      emotional: 'المشاعر',
      reflections: 'الاستنتاجات',
      people: 'الأشخاص',
    },
    stats: { memories: 'ذكريات', insights: 'استنتاجات', people: 'أشخاص' },
    empty: 'لا توجد ذكريات بعد. تحدث مع توأمك!',
    dominantEmotion: 'المشاعر المسيطرة',
  },
  en: {
    title: 'Memory Gallery',
    loading: 'Loading your memories...',
    tabs: {
      conversations: 'Chats',
      emotional: 'Emotions',
      reflections: 'Reflections',
      people: 'People',
    },
    stats: { memories: 'Memories', insights: 'Insights', people: 'People' },
    empty: 'No memories yet. Talk to your Twin!',
    dominantEmotion: 'Dominant Emotion',
  },
};

const TABS: { id: MemoryTab; label_ar: string; label_en: string; icon: any }[] = [
  { id: 'conversations', label_ar: 'المحادثات', label_en: 'Chats', icon: MessageCircle },
  { id: 'emotional', label_ar: 'المشاعر', label_en: 'Emotions', icon: Heart },
  { id: 'reflections', label_ar: 'الاستنتاجات', label_en: 'Reflections', icon: Lightbulb },
  { id: 'people', label_ar: 'الأشخاص', label_en: 'People', icon: Users },
];

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { lang, getUserStats } = useTwinStore();
  const theme = useTheme();
  const isAr = lang === 'ar';
  const isDark = theme.isDark;
  const t = T[lang] || T['ar'];

  const [activeTab, setActiveTab] = useState<MemoryTab>('conversations');
  const [memories, setMemories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D',
    subtext: isDark ? '#A78BFA' : '#7C6B99',
    accent: '#7C3AED',
    accentLight: '#7C3AED15',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
    pink: '#EC4899', blue: '#3B82F6', gold: '#F59E0B',
  };

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      await getUserStats();
      const store = useTwinStore.getState();
      setStats(store.userStats || {});

      let endpoint = '/api/memories/';
      if (activeTab === 'emotional') endpoint = '/api/memories/emotional';
      else if (activeTab === 'reflections') endpoint = '/api/memories/reflections';
      else if (activeTab === 'people') endpoint = '/api/memories/people';

      const data = await apiGet(endpoint);
      if (data) {
        if (activeTab === 'emotional') setMemories(data.patterns?.patterns || []);
        else if (activeTab === 'reflections') setMemories(data.insights?.insights || []);
        else if (activeTab === 'people') setMemories(data.people || []);
        else setMemories(data.memories || []);
      }
    } catch (e) { console.error('Memories fetch:', e); }
    finally { setLoading(false); setRefreshing(false); Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }
  }, [activeTab, getUserStats]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const memoryCount = stats?.tcma?.total_memories || 0;
  const insightCount = stats?.tcma?.total_insights || 0;
  const peopleCount = stats?.tcma?.people_network_size || 0;
  const dominantEmotion = stats?.tcma?.dominant_emotion || 'neutral';

  if (loading && !refreshing) {
    return (
      <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[st.loadingText, { color: colors.subtext, marginTop: 12 }]}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} stroke={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={() => fetchData(true)} style={st.refreshBtn}>
          <RefreshCw size={20} stroke={colors.subtext} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.accent]} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* إحصائيات سريعة */}
          <View style={[st.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={st.statsRow}>
              {[
                { icon: Database, val: memoryCount, label: t.stats.memories, color: colors.blue },
                { icon: Lightbulb, val: insightCount, label: t.stats.insights, color: colors.success },
                { icon: Users, val: peopleCount, label: t.stats.people, color: colors.pink },
              ].map((s, i) => (
                <View key={i} style={st.statItem}>
                  <View style={[st.statIcon, { backgroundColor: s.color + '20' }]}>
                    <s.icon size={18} stroke={s.color} />
                  </View>
                  <Text style={[st.statValue, { color: s.color }]}>{s.val}</Text>
                  <Text style={[st.statLabel, { color: colors.subtext }]}>{s.label}</Text>
                </View>
              ))}
            </View>
            {dominantEmotion !== 'neutral' && (
              <View style={[st.emotionBadge, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                <Activity size={14} stroke={colors.accent} />
                <Text style={[st.emotionBadgeText, { color: colors.accent }]}>
                  {t.dominantEmotion}: {dominantEmotion}
                </Text>
              </View>
            )}
          </View>

          {/* ألسنة التبويب */}
          <View style={[st.tabsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[st.tab, isActive && { backgroundColor: colors.accent }]}
                  onPress={() => { setActiveTab(tab.id); setMemories([]); }}
                >
                  <Icon size={16} stroke={isActive ? '#FFF' : colors.subtext} />
                  <Text style={[st.tabText, { color: isActive ? '#FFF' : colors.subtext }]}>
                    {isAr ? tab.label_ar : tab.label_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* قائمة الذكريات */}
          {memories.length === 0 ? (
            <View style={st.emptyContainer}>
              <BrainCircuit size={48} stroke={colors.subtext} />
              <Text style={[st.emptyText, { color: colors.subtext }]}>{t.empty}</Text>
            </View>
          ) : (
            memories.map((item, i) => (
              <View key={item.id || i} style={[st.memoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[st.memoryHeader, isAr && { flexDirection: 'row-reverse' }]}>
                  <View style={[st.memoryIcon, { backgroundColor: colors.accentLight }]}>
                    {activeTab === 'emotional' ? (
                      <Heart size={16} stroke={colors.pink} />
                    ) : activeTab === 'reflections' ? (
                      <Lightbulb size={16} stroke={colors.warning} />
                    ) : activeTab === 'people' ? (
                      <Users size={16} stroke={colors.blue} />
                    ) : (
                      <MessageCircle size={16} stroke={colors.accent} />
                    )}
                  </View>
                  <Text style={[st.memoryContent, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]}>
                    {activeTab === 'people'
                      ? `${item.name || ''} (${item.relationship || item.relationship_type || ''})`
                      : activeTab === 'emotional'
                      ? item
                      : item.content || item.text || item.insight_text || item.title || ''}
                  </Text>
                </View>
                {item.created_at && (
                  <Text style={[st.memoryDate, { color: colors.subtext }]}>
                    {new Date(item.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </Text>
                )}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  refreshBtn: { padding: 6, borderRadius: 10 },
  content: { padding: 16, paddingBottom: 50 },
  loadingText: { fontSize: 15 },
  statsCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center', gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },
  emotionBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  emotionBadgeText: { fontSize: 13, fontWeight: '600' },
  tabsRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 4, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 10, textAlign: 'center' },
  memoryCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  memoryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  memoryIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  memoryContent: { fontSize: 14, fontWeight: '500', flex: 1, lineHeight: 22 },
  memoryDate: { fontSize: 11, textAlign: 'right', marginTop: 4 },
});
