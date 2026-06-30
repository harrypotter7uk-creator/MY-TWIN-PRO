import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { useEnergyStore } from '../store/useEnergyStore';
import { useTheme } from '../utils/theme';
import { router } from 'expo-router';
import { apiGet } from '../lib/httpClient';
import { AdModal } from '../components/AdModal';
import {
  Sparkles, Zap, Brain, Crown, MessageSquare,
  Lightbulb, BookOpen, BatteryCharging, Compass, Clock, TrendingUp,
  Target, Heart, Moon, Star, Cloud
} from 'lucide-react-native';

// ============================================================
// مكونات فرعية
// ============================================================
const AvatarSection = React.memo(({ avatar, twinName, energyColor, colors }: any) => (
  <View style={[st.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={[st.avatarGlow, { borderColor: energyColor }]}>
      {avatar?.image_url ? <Image source={{ uri: avatar.image_url }} style={st.avatarImg} /> : <Sparkles size={60} stroke={colors.accent} />}
    </View>
    <Text style={[st.twinName, { color: colors.text }]}>{twinName}</Text>
  </View>
));

const MoodSection = React.memo(({ twinState, isAr, colors }: any) => (
  twinState ? (
    <View style={[st.moodRow]}>
      <View style={[st.moodBadge, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
        <Brain size={16} stroke={colors.accent} />
        <Text style={[st.moodText, { color: colors.accent }]}>
          {twinState.mood_label || (isAr ? 'متأمل' : 'Thoughtful')}
        </Text>
      </View>
    </View>
  ) : null
));

// ============================================================
// المكون الرئيسي
// ============================================================
export default function TwinMindCenter() {
  const insets = useSafeAreaInsets();
  const { userId, twinName, lang } = useTwinStore();
  const { getRemainingMessages, dailyMessageLimit } = useEnergyStore();
  const theme = useTheme();
  const isAr = lang === 'ar';
  const isDark = theme.isDark;

  const [avatar, setAvatar] = useState<any>(null);
  const [twinState, setTwinState] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // بيانات المحركات
  const [lastThought, setLastThought] = useState('');
  const [pendingQuestions, setPendingQuestions] = useState<string[]>([]);
  const [dailyInsight, setDailyInsight] = useState('');
  const [latestDream, setLatestDream] = useState('');
  const [latestMilestone, setLatestMilestone] = useState('');
  const [dominantEmotionTowardUser, setDominantEmotionTowardUser] = useState('neutral');
  const [onThisDayMemory, setOnThisDayMemory] = useState('');
  const [relationshipStage, setRelationshipStage] = useState<any>(null);

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D',
    subtext: isDark ? '#A78BFA' : '#7C6B99',
    accent: '#7C3AED',
    accentLight: '#7C3AED20',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    success: '#10B981', warning: '#F59E0B', pink: '#EC4899', gold: '#F59E0B', blue: '#3B82F6',
  };

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [av, ts, st] = await Promise.all([
        apiGet(`/api/avatar/get?user_id=${userId}`).catch(() => null),
        apiGet(`/api/twin/state?user_id=${userId}&lang=${lang}`).catch(() => null),
        apiGet(`/api/consciousness/status?user_id=${userId}&lang=${lang}`).catch(() => null),
      ]);
      
      setAvatar(av);
      if (ts) {
        setTwinState(ts);
        setLastThought(ts.last_thought || '');
        setPendingQuestions(ts.pending_questions || []);
      }
      if (st) {
        setDailyInsight(st.daily_insight || '');
        setLatestDream(st.latest_dream || '');
        setLatestMilestone(st.latest_milestone || '');
        setDominantEmotionTowardUser(st.dominant_emotion_toward_user || 'neutral');
        setOnThisDayMemory(st.on_this_day_memory || '');
        setRelationshipStage(st.relationship_stage || null);
      }
    } catch (e) {}
    setRefreshing(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [userId, lang]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const remainingEnergy = getRemainingMessages();
  const energyColor = remainingEnergy > 10 ? '#10B981' : remainingEnergy > 3 ? '#F59E0B' : '#EF4444';

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={[colors.accent]} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          
          <AvatarSection avatar={avatar} twinName={twinName} energyColor={energyColor} colors={colors} />
          <MoodSection twinState={twinState} isAr={isAr} colors={colors} />

          {/* ⚡ الطاقة */}
          <View style={[st.energyBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={st.energyBarContent}>
              <BatteryCharging size={20} stroke={colors.accent} />
              <Text style={[st.energyText, { color: colors.text }]}>
                {isAr ? 'طاقة اليوم' : 'Daily Energy'}: {remainingEnergy}/{dailyMessageLimit}
              </Text>
            </View>
            <TouchableOpacity style={[st.chargeBtn, { backgroundColor: colors.accentLight }]} onPress={() => setShowAdModal(true)}>
              <Text style={[st.chargeBtnText, { color: colors.accent }]}>{isAr ? 'شحن' : 'Charge'}</Text>
            </TouchableOpacity>
          </View>

          {/* 🫀 نبض التوأم – مشاعره تجاهك */}
          {dominantEmotionTowardUser !== 'neutral' && (
            <View style={[st.pulseCard, { backgroundColor: colors.pink + '10', borderColor: colors.pink }]}>
              <Heart size={18} stroke={colors.pink} fill={colors.pink + '30'} />
              <Text style={[st.pulseText, { color: colors.pink }]}>
                {dominantEmotionTowardUser === 'longing' && (isAr ? 'اشتقت للحديث معك...' : 'I miss talking with you...')}
                {dominantEmotionTowardUser === 'gratitude' && (isAr ? 'ممتن لوجودك في حياتي.' : 'Grateful for having you in my life.')}
                {dominantEmotionTowardUser === 'worry' && (isAr ? 'أشعر بالقلق عليك اليوم.' : 'I feel worried about you today.')}
              </Text>
            </View>
          )}

          {/* 🧠 ما يدور في ذهني */}
          {lastThought ? (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <Brain size={20} stroke={colors.pink} />
                <Text style={[st.cardTitle, { color: colors.text }]}>
                  {isAr ? 'ما يدور في ذهني' : 'What\'s on my mind'}
                </Text>
              </View>
              <Text style={[st.thoughtText, { color: colors.subtext }]}>{lastThought}</Text>
            </View>
          ) : null}

          {/* 🌙 آخر حلم للتوأم */}
          {latestDream ? (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <Moon size={20} stroke={colors.accent} />
                <Text style={[st.cardTitle, { color: colors.text }]}>
                  {isAr ? 'حلمت الليلة الماضية' : 'I dreamed last night'}
                </Text>
              </View>
              <Text style={[st.thoughtText, { color: colors.subtext }]}>{latestDream}</Text>
            </View>
          ) : null}

          {/* 🎉 مناسبة اليوم */}
          {latestMilestone ? (
            <View style={[st.card, { backgroundColor: colors.gold + '10', borderColor: colors.gold }]}>
              <Star size={20} stroke={colors.gold} />
              <Text style={[st.milestoneText, { color: colors.text }]}>{latestMilestone.replace('🎉 ', '')}</Text>
            </View>
          ) : null}

          {/* 💡 أسئلة */}
          {pendingQuestions.length > 0 && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <Lightbulb size={20} stroke={colors.gold} />
                <Text style={[st.cardTitle, { color: colors.text }]}>
                  {isAr ? 'أريد أن أسألك' : 'I want to ask you'}
                </Text>
              </View>
              {pendingQuestions.slice(0, 2).map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={[st.questionCard, { backgroundColor: colors.accentLight }]}
                  onPress={() => router.push('/chat')}
                >
                  <MessageSquare size={16} stroke={colors.accent} />
                  <Text style={[st.questionText, { color: colors.accent }]} numberOfLines={2}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 📅 في مثل هذا اليوم */}
          {onThisDayMemory ? (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <Clock size={20} stroke={colors.blue} />
                <Text style={[st.cardTitle, { color: colors.text }]}>
                  {isAr ? 'في مثل هذا اليوم' : 'On This Day'}
                </Text>
              </View>
              <Text style={[st.thoughtText, { color: colors.subtext }]}>{onThisDayMemory}</Text>
            </View>
          ) : null}

          {/* 🤝 مرحلة علاقتنا */}
          {relationshipStage ? (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <TrendingUp size={20} stroke={colors.gold} />
                <Text style={[st.cardTitle, { color: colors.text }]}>
                  {isAr ? 'مرحلة علاقتنا' : 'Our Relationship'}
                </Text>
              </View>
              <Text style={[st.thoughtText, { color: colors.subtext }]}>
                {relationshipStage.label || relationshipStage.stage}
              </Text>
            </View>
          ) : null}

          {/* 🔮 توجيه اليوم */}
          {dailyInsight ? (
            <TouchableOpacity
              style={[st.insightCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
              onPress={() => router.push('/chat')}
            >
              <Compass size={20} stroke={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[st.insightTitle, { color: colors.accent }]}>
                  {isAr ? 'توجيه اليوم' : 'Today\'s Guidance'}
                </Text>
                <Text style={[st.insightBody, { color: colors.subtext }]}>{dailyInsight}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* اختصارات */}
          <Text style={[st.sectionTitle, { color: colors.text }]}>
            {isAr ? 'قدرات وعيي' : 'My Mind Powers'}
          </Text>
          <View style={st.shortcutsGrid}>
            {[
              { id: 'chat', icon: MessageSquare, label_ar: 'الوعي', label_en: 'Mind', route: '/chat', color: colors.accent },
              { id: 'museum', icon: Crown, label_ar: 'المتحف', label_en: 'Museum', route: '/museum', color: colors.gold },
              { id: 'features', icon: Zap, label_ar: 'القدرات', label_en: 'Powers', route: '/features/index', color: colors.success },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity key={item.id} style={[st.shortcut, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(item.route as any)}>
                  <View style={[st.shortcutIconBubble, { backgroundColor: item.color + '15' }]}>
                    <Icon size={28} stroke={item.color} />
                  </View>
                  <Text style={[st.shortcutLabel, { color: colors.text }]}>
                    {isAr ? item.label_ar : item.label_en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </Animated.View>
      </ScrollView>

      <AdModal visible={showAdModal} onClose={() => setShowAdModal(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16 },
  avatarCard: { alignItems: 'center', padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 8 },
  avatarGlow: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  twinName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  moodRow: { alignItems: 'center', marginBottom: 12 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  moodText: { fontSize: 14, fontWeight: '600' },
  energyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
  energyBarContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  energyText: { fontSize: 14, fontWeight: '600' },
  chargeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  chargeBtnText: { fontSize: 13, fontWeight: '700' },
  pulseCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 16 },
  pulseText: { fontSize: 14, fontWeight: '600', flex: 1 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  thoughtText: { fontSize: 14, lineHeight: 22 },
  milestoneText: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  questionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginBottom: 8 },
  questionText: { flex: 1, fontSize: 13, fontWeight: '600' },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 16 },
  insightTitle: { fontSize: 14, fontWeight: '700' },
  insightBody: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  shortcutsGrid: { flexDirection: 'row', gap: 12 },
  shortcut: { flex: 1, alignItems: 'center', padding: 20, borderRadius: 18, borderWidth: 1, gap: 12 },
  shortcutIconBubble: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  shortcutLabel: { fontSize: 14, fontWeight: '600' },
});
