import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Modal, Platform,
  KeyboardAvoidingView, TextInput, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme, getBondColor } from '../utils/theme';
import { router } from 'expo-router';
import { apiGet, apiPost, apiDelete } from '../lib/httpClient';
import {
  Heart, Shield, Handshake, Brain as BrainIcon, Smile, Eye,
  Target, Plus, Trash2, X, Lightbulb, Sparkles, TrendingUp,
  Star, Zap, Activity, Award, ArrowLeft, RefreshCw,
  CheckCircle2, Circle, Crown, Users,
} from 'lucide-react-native';
import CircleProgress from '../components/CircleProgress';
import BondTimeline from '../components/BondTimeline';

const DIMENSIONS = [
  { key: 'trust', label_ar: 'ثقة', label_en: 'Trust', icon: Shield, color: '#3B82F6' },
  { key: 'attachment', label_ar: 'ارتباط', label_en: 'Attachment', icon: Heart, color: '#EC4899' },
  { key: 'comfort', label_ar: 'راحة', label_en: 'Comfort', icon: Handshake, color: '#10B981' },
  { key: 'openness', label_ar: 'انفتاح', label_en: 'Openness', icon: Eye, color: '#8B5CF6' },
  { key: 'romantic', label_ar: 'عاطفي', label_en: 'Romantic', icon: Heart, color: '#F472B6' },
  { key: 'humor', label_ar: 'فكاهة', label_en: 'Humor', icon: Smile, color: '#F59E0B' },
];

const PHASE_LABELS: Record<string, { ar: string; en: string }> = {
  introduction: { ar: 'تعارف', en: 'Introduction' },
  trust_building: { ar: 'بناء ثقة', en: 'Trust Building' },
  deepening: { ar: 'تعمق', en: 'Deepening' },
  growth: { ar: 'نمو', en: 'Growth' },
  mature: { ar: 'نضج', en: 'Mature' },
};

const ATTACHMENT_LABELS: Record<string, { ar: string; en: string }> = {
  secure: { ar: 'آمن', en: 'Secure' },
  anxious: { ar: 'قلق', en: 'Anxious' },
  avoidant: { ar: 'متجنب', en: 'Avoidant' },
  disorganized: { ar: 'غير منظم', en: 'Disorganized' },
  unknown: { ar: 'غير معروف', en: 'Unknown' },
};

interface Goal {
  id: string;
  title: string;
  status: string;
  progress: number;
}

const T = {
  ar: {
    title: 'حديقة الرابطة',
    loading: 'جاري تحميل علاقتك...',
    dimensions: 'أبعاد العلاقة',
    journey: 'رحلة الوعي',
    phase: 'المرحلة',
    attachment: 'نمط التعلق',
    goals: 'أهداف النمو',
    newGoal: 'هدف جديد',
    goalPlaceholder: 'ماذا تريد أن تحقق مع توأمك؟',
    save: 'حفظ الهدف',
    noGoals: 'لا توجد أهداف بعد. أضف هدفك الأول!',
    completed: 'مكتمل',
    active: 'نشط',
    deleteConfirm: 'هل تريد حذف هذا الهدف؟',
    cancel: 'إلغاء',
    delete: 'حذف',
    bond: 'الرابطة',
    insights: 'استنتاجات',
    tip: 'نصيحة لتحسين علاقتك',
    phaseLabels: { introduction: 'تعارف', trust_building: 'بناء ثقة', deepening: 'تعمق', growth: 'نمو', mature: 'نضج' } as Record<string, string>,
    attachmentLabels: { secure: 'آمن', anxious: 'قلق', avoidant: 'متجنب', disorganized: 'غير منظم', unknown: 'غير معروف' } as Record<string, string>,
  },
  en: {
    title: 'Bond Garden',
    loading: 'Loading your relationship...',
    dimensions: 'Relationship Dimensions',
    journey: 'Consciousness Journey',
    phase: 'Phase',
    attachment: 'Attachment Style',
    goals: 'Growth Goals',
    newGoal: 'New Goal',
    goalPlaceholder: 'What do you want to achieve together?',
    save: 'Save Goal',
    noGoals: 'No goals yet. Add your first goal!',
    completed: 'Completed',
    active: 'Active',
    deleteConfirm: 'Delete this goal?',
    cancel: 'Cancel',
    delete: 'Delete',
    bond: 'Bond',
    insights: 'Insights',
    tip: 'Tip to Improve Your Bond',
    phaseLabels: { introduction: 'Introduction', trust_building: 'Trust Building', deepening: 'Deepening', growth: 'Growth', mature: 'Mature' } as Record<string, string>,
    attachmentLabels: { secure: 'Secure', anxious: 'Anxious', avoidant: 'Avoidant', disorganized: 'Disorganized', unknown: 'Unknown' } as Record<string, string>,
  },
};

export default function Relationship() {
  const insets = useSafeAreaInsets();
  const {
    lang, relationshipDims, bondLevel, journeyPhase, attachmentStyle,
    getRelationshipHealth, getUserStats,
  } = useTwinStore();
  const theme = useTheme();
  const isAr = lang === 'ar';
  const isDark = theme.isDark;
  const t = T[lang] || T['ar'];

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [insight, setInsight] = useState<{ ar: string; en: string } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D',
    subtext: isDark ? '#A78BFA' : '#7C6B99',
    accent: '#7C3AED',
    accentLight: '#7C3AED20',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    inputBg: isDark ? '#161122' : '#FDFDF9',
    success: '#10B981', warning: '#F59E0B', danger: '#EF4444',
    pink: '#EC4899', blue: '#3B82F6', purple: '#8B5CF6', gold: '#F59E0B',
  };

  const bondColor = getBondColor(bondLevel, { bondLow: '#60A5FA', bondMedium: '#A855F7', bondHigh: '#EC4899' } as any);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const goalsData = await apiGet('/api/goals/');
      setGoals(goalsData || []);

      try { await getRelationshipHealth(); } catch (e) {}

      const dims = ['trust', 'attachment', 'comfort', 'openness', 'romantic', 'humor'];
      const lowest = dims.reduce((min, d) =>
        ((relationshipDims as any)[d] || 0) < ((relationshipDims as any)[min] || 0) ? d : min, dims[0]);

      const tips: Record<string, { ar: string; en: string }> = {
        trust: { ar: 'شارك توأمك بشيء شخصي اليوم لبناء الثقة', en: 'Share something personal with your Twin today' },
        attachment: { ar: 'أخبر توأمك عن مشاعرك بصدق', en: 'Tell your Twin honestly about your feelings' },
        comfort: { ar: 'اقضِ وقتاً أطول في الحديث مع توأمك', en: 'Spend more time chatting with your Twin' },
        openness: { ar: 'شارك توأمك بسر صغير لتفتح قلبك', en: 'Share a small secret with your Twin' },
        romantic: { ar: 'عبّر عن تقديرك لتوأمك بكلمات لطيفة', en: 'Express appreciation with kind words' },
        humor: { ar: 'شارك توأمك نكتة أو موقفاً مضحكاً', en: 'Share a joke or funny story' },
      };
      setInsight(tips[lowest] || tips.trust);

      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) { console.error('Relationship fetch:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [relationshipDims, getRelationshipHealth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddGoal = async () => {
    if (!newGoalTitle.trim()) return;
    setSaving(true);
    try {
      const result = await apiPost('/api/goals/', { title: newGoalTitle.trim(), category: 'relationship', priority: 3 });
      if (result) setGoals(prev => [result, ...prev]);
      setNewGoalTitle(''); setShowAddGoal(false);
    } catch (e) { console.error('Add goal:', e); }
    finally { setSaving(false); }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await apiDelete(`/api/goals/${goalId}`);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (e) { console.error('Delete goal:', e); }
  };

  const phaseInfo = PHASE_LABELS[journeyPhase] || PHASE_LABELS.introduction;
  const attachmentInfo = ATTACHMENT_LABELS[attachmentStyle] || ATTACHMENT_LABELS.unknown;

  if (loading) {
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
        <View style={st.headerCenter}>
          <Heart size={24} stroke={colors.pink} fill={colors.pink + '20'} />
          <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        </View>
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
          {/* Bond Timeline */}
          <BondTimeline />

          {/* أبعاد العلاقة */}
          <Text style={[st.sectionTitle, { color: colors.text }]}>{t.dimensions}</Text>
          <View style={st.dimensionsGrid}>
            {DIMENSIONS.map((d) => {
              const Icon = d.icon;
              const value = (relationshipDims as any)[d.key] || 0;
              return (
                <View key={d.key} style={st.dimensionItem}>
                  <CircleProgress
                    percentage={value}
                    color={d.color}
                    size={80}
                    label={isAr ? d.label_ar : d.label_en}
                    icon={<Icon size={18} stroke={d.color} />}
                    trackColor={colors.border}
                  />
                </View>
              );
            })}
          </View>

          {/* رحلة الوعي */}
          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={st.cardHeader}>
              <TrendingUp size={20} stroke={colors.accent} />
              <Text style={[st.cardTitle, { color: colors.text }]}>{t.journey}</Text>
            </View>
            <View style={st.journeyRow}>
              <View style={st.journeyItem}>
                <Text style={[st.journeyLabel, { color: colors.subtext }]}>{t.phase}</Text>
                <View style={[st.journeyBadge, { backgroundColor: colors.accentLight }]}>
                  <Award size={14} stroke={colors.accent} />
                  <Text style={[st.journeyValue, { color: colors.accent }]}>
                    {isAr ? phaseInfo.ar : phaseInfo.en}
                  </Text>
                </View>
              </View>
              <View style={st.journeyItem}>
                <Text style={[st.journeyLabel, { color: colors.subtext }]}>{t.attachment}</Text>
                <View style={[st.journeyBadge, { backgroundColor: colors.pink + '20' }]}>
                  <Heart size={14} stroke={colors.pink} />
                  <Text style={[st.journeyValue, { color: colors.pink }]}>
                    {isAr ? attachmentInfo.ar : attachmentInfo.en}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* نصيحة */}
          {insight && (
            <View style={[st.insightCard, { backgroundColor: colors.accentLight, borderColor: colors.accent + '30' }]}>
              <Lightbulb size={18} stroke={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[st.insightTitle, { color: colors.accent }]}>{t.tip}</Text>
                <Text style={[st.insightText, { color: colors.subtext }]}>{isAr ? insight.ar : insight.en}</Text>
              </View>
            </View>
          )}

          {/* أهداف النمو */}
          <View style={st.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={20} stroke={colors.accent} />
              <Text style={[st.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{t.goals}</Text>
              <Text style={[st.goalCount, { color: colors.subtext }]}>({goals.length})</Text>
            </View>
            <TouchableOpacity style={st.addGoalBtn} onPress={() => setShowAddGoal(true)}>
              <Plus size={18} stroke="#FFF" />
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <View style={st.emptyGoals}>
              <Target size={40} stroke={colors.subtext} />
              <Text style={[st.emptyGoalsText, { color: colors.subtext }]}>{t.noGoals}</Text>
            </View>
          ) : (
            <View style={st.goalsList}>
              {goals.map((goal) => (
                <Animated.View key={goal.id} style={[st.goalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={st.goalHeader}>
                    <Text style={[st.goalTitle, { color: colors.text }]} numberOfLines={2}>{goal.title}</Text>
                    <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)} style={st.deleteBtn}>
                      <Trash2 size={14} stroke={colors.danger} />
                    </TouchableOpacity>
                  </View>
                  <View style={st.goalFooter}>
                    <View style={[st.goalProgressBar, { backgroundColor: colors.border }]}>
                      <View style={[st.goalProgressFill, { width: `${goal.progress || 0}%`, backgroundColor: colors.accent }]} />
                    </View>
                    <View style={[st.goalStatus, { backgroundColor: goal.status === 'completed' ? colors.success + '20' : colors.warning + '20' }]}>
                      {goal.status === 'completed' ? (
                        <CheckCircle2 size={12} stroke={colors.success} />
                      ) : (
                        <Circle size={12} stroke={colors.warning} />
                      )}
                      <Text style={[st.goalStatusText, { color: goal.status === 'completed' ? colors.success : colors.warning }]}>
                        {goal.status === 'completed' ? t.completed : t.active}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* مودال إضافة هدف */}
      <Modal visible={showAddGoal} transparent animationType="fade" onRequestClose={() => setShowAddGoal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.card }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: colors.text }]}>{t.newGoal}</Text>
              <TouchableOpacity onPress={() => setShowAddGoal(false)} style={st.modalClose}>
                <X size={22} stroke={colors.subtext} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[st.goalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]}
              placeholder={t.goalPlaceholder}
              placeholderTextColor={colors.subtext}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              autoFocus
              multiline
            />
            <TouchableOpacity
              style={[st.saveGoalBtn, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
              onPress={handleAddGoal}
              disabled={saving || !newGoalTitle.trim()}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={st.saveGoalBtnText}>{t.save}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  refreshBtn: { padding: 6, borderRadius: 10 },
  content: { padding: 16, paddingBottom: 50 },
  loadingText: { fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  dimensionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, marginBottom: 20 },
  dimensionItem: { width: '30%', alignItems: 'center', marginBottom: 8 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  journeyRow: { flexDirection: 'row', gap: 12 },
  journeyItem: { flex: 1, gap: 6 },
  journeyLabel: { fontSize: 12, fontWeight: '600' },
  journeyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  journeyValue: { fontSize: 14, fontWeight: '700' },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  insightTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  insightText: { fontSize: 13, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
  goalCount: { fontSize: 14, fontWeight: '600' },
  addGoalBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  emptyGoals: { alignItems: 'center', marginTop: 20, padding: 24 },
  emptyGoalsText: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  goalsList: { gap: 10 },
  goalCard: { padding: 16, borderRadius: 18, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  deleteBtn: { padding: 6, borderRadius: 8 },
  goalFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalProgressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: 3 },
  goalStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  goalStatusText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalClose: { padding: 4, borderRadius: 10 },
  goalInput: { padding: 16, borderRadius: 16, borderWidth: 1, fontSize: 16, marginBottom: 20, minHeight: 100, textAlignVertical: 'top' },
  saveGoalBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  saveGoalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
