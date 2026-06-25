import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme, getBondColor, getEnergyColor } from '../utils/theme';
import { router } from 'expo-router';
import { apiGet } from '../lib/httpClient';
import {
  Sparkles, Heart, Zap, Brain, TrendingUp, Crown, MessageSquare,
  Lightbulb, Activity, Clock,
} from 'lucide-react-native';

export default function TwinMindCenter() {
  const insets = useSafeAreaInsets();
  const { userId, twinName, tier, bondLevel, twinEnergy, journeyPhase, lang } = useTwinStore();
  const theme = useTheme();
  const isAr = lang === 'ar';
  const isDark = theme.isDark;

  const [avatar, setAvatar] = useState<any>(null);
  const [fingerprint, setFingerprint] = useState<any>(null);
  const [awareness, setAwareness] = useState<any>(null);
  const [crossRecommendations, setCrossRecommendations] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#7C6B99',
    accent: '#7C3AED', accentLight: '#7C3AED20', border: isDark ? '#2D1B4D' : '#E8E8E3',
    success: '#10B981', warning: '#F59E0B', pink: '#EC4899', gold: '#F59E0B', blue: '#3B82F6',
  };

  const fetchData = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [av, fp, aw, recs, sync] = await Promise.all([
        apiGet(`/api/avatar/get?user_id=${userId}`),
        apiGet(`/api/fingerprint/get?user_id=${userId}`),
        apiGet(`/api/awareness/check?user_id=${userId}&lang=${lang}`),
        apiGet(`/api/consciousness/recommendations?user_id=${userId}`),
        apiGet(`/api/sync/status?user_id=${userId}`),
      ]);
      setAvatar(av);
      setFingerprint(fp);
      setAwareness(aw?.notification || null);
      if (recs?.recommendations) setCrossRecommendations(recs.recommendations);
      if (sync?.last_sync) setSyncStatus(sync);
    } catch (e) {}
    setRefreshing(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const bondColor = getBondColor(bondLevel, { bondLow: '#60A5FA', bondMedium: '#A855F7', bondHigh: '#EC4899' } as any);
  const energyColor = getEnergyColor(twinEnergy, { energyLow: '#EF4444', energyMedium: '#F59E0B', energyHigh: '#10B981' } as any);
  const phaseLabels: Record<string, string> = {
    introduction: isAr ? 'تعارف' : 'Intro', trust_building: isAr ? 'بناء ثقة' : 'Trust',
    deepening: isAr ? 'تعمق' : 'Deep', growth: isAr ? 'نمو' : 'Growth', mature: isAr ? 'نضج' : 'Mature',
  };

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={[colors.accent]} />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* الأفاتار والطاقة */}
          <View style={[st.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[st.avatarGlow, { borderColor: energyColor }]}>
              {avatar?.image_url ? <Image source={{ uri: avatar.image_url }} style={st.avatarImg} /> : <Sparkles size={60} stroke={colors.accent} />}
            </View>
            <Text style={[st.twinName, { color: colors.text }]}>{twinName}</Text>
            <View style={st.energyRow}>
              <Zap size={16} stroke={energyColor} />
              <View style={[st.energyBar, { backgroundColor: colors.border }]}>
                <View style={[st.energyFill, { width: `${twinEnergy}%`, backgroundColor: energyColor }]} />
              </View>
              <Text style={[st.energyText, { color: energyColor }]}>{Math.round(twinEnergy)}%</Text>
            </View>
          </View>

          {/* مقاييس سريعة */}
          <View style={st.metricsRow}>
            {[
              { icon: Heart, val: `${Math.round(bondLevel)}%`, label: isAr ? 'الرابطة' : 'Bond', color: bondColor },
              { icon: TrendingUp, val: phaseLabels[journeyPhase] || journeyPhase, label: isAr ? 'المرحلة' : 'Phase', color: colors.success },
              { icon: Brain, val: fingerprint?.traits?.length || 0, label: isAr ? 'سمات' : 'Traits', color: colors.blue },
              { icon: Crown, val: tier, label: isAr ? 'الباقة' : 'Tier', color: colors.gold },
            ].map((m, i) => (
              <View key={i} style={[st.metricItem, { borderColor: colors.border }]}>
                <m.icon size={24} stroke={m.color} />
                <Text style={[st.metricVal, { color: m.color }]}>{m.val}</Text>
                <Text style={[st.metricLabel, { color: colors.subtext }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          {/* توصية الوعي الاستباقي */}
          {awareness && (
            <TouchableOpacity style={[st.awarenessCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]} onPress={() => router.push('/chat')}>
              <Lightbulb size={20} stroke={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[st.awarenessTitle, { color: colors.accent }]}>{awareness.title}</Text>
                <Text style={[st.awarenessBody, { color: colors.subtext }]}>{awareness.body}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* بصمة رقمية */}
          {fingerprint?.fingerprint_hash && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'بصمتك الرقمية' : 'Your Digital Fingerprint'}</Text>
              <Text style={[st.fingerprintHash, { color: colors.subtext }]}>{fingerprint.fingerprint_hash}</Text>
              {fingerprint.summary?.personality && <Text style={[st.personality, { color: colors.text }]}>{fingerprint.summary.personality}</Text>}
            </View>
          )}

          {/* وعيي العاطفي */}
          {fingerprint?.summary?.emotional_state && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}><Activity size={18} stroke={colors.accent} /><Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'وعيي العاطفي' : 'My Emotional Mind'}</Text></View>
              <Text style={[st.emotionSummary, { color: colors.subtext }]}>{fingerprint.summary.emotional_state}</Text>
              {fingerprint.summary?.one_liner && <Text style={[st.oneLiner, { color: colors.accent }]}>{fingerprint.summary.one_liner}</Text>}
            </View>
          )}

          {/* توصيات عبر الميزات */}
          {crossRecommendations.length > 0 && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}><Zap size={18} stroke={colors.gold} /><Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'توصيات وعيي' : 'My Mind Recommendations'}</Text></View>
              {crossRecommendations.map((rec: any, i: number) => (
                <TouchableOpacity key={i} style={[st.recRow, { borderColor: colors.border }]} onPress={() => router.push(rec.route as any)}>
                  <View style={[st.recDot, { backgroundColor: colors.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[st.recTitle, { color: colors.accent }]}>{rec.title}</Text>
                    <Text style={[st.recBody, { color: colors.subtext }]}>{rec.body}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* مزامنة التقويم */}
          {syncStatus?.last_sync && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}><Clock size={18} stroke={colors.accent} /><Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'مزامنة التقويم' : 'Calendar Sync'}</Text></View>
              <Text style={[st.syncText, { color: colors.subtext }]}>{isAr ? 'آخر مزامنة:' : 'Last sync:'} {new Date(syncStatus.last_sync.created_at || syncStatus.last_sync.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</Text>
              {syncStatus.recommendation && <Text style={[st.syncRec, { color: colors.accent }]}>{syncStatus.recommendation}</Text>}
            </View>
          )}

          {/* اختصارات */}
          <Text style={[st.sectionTitle, { color: colors.text }]}>{isAr ? 'قدرات وعيي' : 'My Mind Powers'}</Text>
          <View style={st.shortcutsGrid}>
            {[
              { id: 'chat', icon: MessageSquare, label_ar: 'الوعي', label_en: 'Mind', route: '/chat', color: colors.accent },
              { id: 'museum', icon: Crown, label_ar: 'المتحف', label_en: 'Museum', route: '/museum', color: colors.gold },
              { id: 'features', icon: Zap, label_ar: 'القدرات', label_en: 'Powers', route: '/features/index', color: colors.success },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity key={item.id} style={[st.shortcut, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(item.route as any)}>
                  <Icon size={28} stroke={item.color} />
                  <Text style={[st.shortcutLabel, { color: colors.text }]}>{isAr ? item.label_ar : item.label_en}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 50 },
  avatarCard: { alignItems: 'center', padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 20 },
  avatarGlow: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  twinName: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '80%' },
  energyBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  energyFill: { height: '100%', borderRadius: 4 },
  energyText: { fontSize: 14, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metricItem: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 4 },
  metricVal: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 10, fontWeight: '600' },
  awarenessCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  awarenessTitle: { fontSize: 14, fontWeight: '700' },
  awarenessBody: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  fingerprintHash: { fontSize: 12, fontFamily: 'monospace', marginBottom: 8 },
  personality: { fontSize: 14, fontWeight: '600' },
  emotionSummary: { fontSize: 13, lineHeight: 20 },
  oneLiner: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recTitle: { fontSize: 14, fontWeight: '700' },
  recBody: { fontSize: 12, marginTop: 2 },
  syncText: { fontSize: 13, marginBottom: 4 },
  syncRec: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  shortcutsGrid: { flexDirection: 'row', gap: 12 },
  shortcut: { flex: 1, alignItems: 'center', padding: 20, borderRadius: 18, borderWidth: 1, gap: 8 },
  shortcutLabel: { fontSize: 14, fontWeight: '600' },
});
