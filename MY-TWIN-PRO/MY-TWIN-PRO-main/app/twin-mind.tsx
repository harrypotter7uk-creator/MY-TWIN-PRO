import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, RefreshControl, Image, Modal, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../store/useTwinStore';
import { useTheme } from '../utils/theme';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../lib/httpClient';
import {
  Sparkles, Heart, Zap, Brain, TrendingUp, Crown, MessageSquare,
  Lightbulb, Activity, Eye, Bell, Calendar, Plus, X,
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
  const [awarenessScore, setAwarenessScore] = useState<any>(null);
  const [notificationFreq, setNotificationFreq] = useState<any>(null);
  const [crossRecommendations, setCrossRecommendations] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncEventTitle, setSyncEventTitle] = useState('');
  const [syncEventDate, setSyncEventDate] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8',
    card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D',
    subtext: isDark ? '#A78BFA' : '#7C6B99',
    accent: '#7C3AED',
    accentLight: '#7C3AED20',
    border: isDark ? '#2D1B4D' : '#E8E8E3',
    success: '#10B981',
    warning: '#F59E0B',
    pink: '#EC4899',
    gold: '#F59E0B',
    blue: '#3B82F6',
  };

  const fetchData = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [av, fp, aw, awScore, notifFreq, recs, sync] = await Promise.all([
        apiGet(`/api/avatar/get?user_id=${userId}`).catch(() => null),
        apiGet(`/api/fingerprint/get?user_id=${userId}`).catch(() => null),
        apiGet(`/api/awareness/check?user_id=${userId}&lang=${lang}`).catch(() => null),
        apiGet(`/api/awareness-score/${userId}`).catch(() => null),
        apiGet(`/api/awareness-score/frequency?user_id=${userId}&tier=${tier}`).catch(() => null),
        apiGet(`/api/consciousness/recommendations?user_id=${userId}`).catch(() => null),
        apiGet(`/api/sync/status?user_id=${userId}`).catch(() => null),
      ]);
      setAvatar(av);
      setFingerprint(fp);
      setAwareness(aw?.notification || null);
      if (awScore) setAwarenessScore(awScore);
      if (notifFreq) setNotificationFreq(notifFreq);
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

  const handleSyncCalendar = async () => {
    if (!syncEventTitle.trim() || !syncEventDate.trim()) {
      Alert.alert(isAr ? 'تنبيه' : 'Notice', isAr ? 'أدخل عنوان وتاريخ الحدث' : 'Enter event title and date');
      return;
    }
    setSyncLoading(true);
    try {
      await apiPost('/api/sync/calendar', { user_id: userId, events: [{ title: syncEventTitle, date: syncEventDate, time: '', event_type: 'meeting' }] });
      setSyncModalVisible(false);
      setSyncEventTitle(''); setSyncEventDate('');
      fetchData();
      Alert.alert('✅', isAr ? 'تمت المزامنة بنجاح' : 'Synced successfully');
    } catch (e: any) { Alert.alert(isAr ? 'خطأ' : 'Error', e.message || 'Sync failed'); }
    finally { setSyncLoading(false); }
  };

  const energyColor = twinEnergy > 60 ? '#10B981' : twinEnergy > 25 ? '#F59E0B' : '#EF4444';
  const phaseLabels: Record<string, string> = {
    introduction: isAr ? 'تعارف' : 'Intro', trust_building: isAr ? 'بناء ثقة' : 'Trust',
    deepening: isAr ? 'تعمق' : 'Deep', growth: isAr ? 'نمو' : 'Growth', mature: isAr ? 'نضج' : 'Mature',
  };

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={[colors.accent]} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* الأفاتار والطاقة */}
          <View style={[st.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[st.avatarGlow, { borderColor: energyColor }]}>
              {avatar?.image_url ? <Image source={{ uri: avatar.image_url }} style={st.avatarImg} /> : <Sparkles size={60} stroke={colors.accent} />}
            </View>
            <Text style={[st.twinName, { color: colors.text }]}>{twinName}</Text>
            <View style={st.energyRow}>
              <Zap size={16} stroke={energyColor} />
              <View style={[st.energyBar, { backgroundColor: colors.border }]}><View style={[st.energyFill, { width: `${twinEnergy}%`, backgroundColor: energyColor }]} /></View>
              <Text style={[st.energyText, { color: energyColor }]}>{Math.round(twinEnergy)}%</Text>
            </View>
          </View>

          {/* مقاييس سريعة */}
          <View style={st.metricsRow}>
            {[
              { icon: Heart, val: `${Math.round(bondLevel)}%`, label: isAr ? 'الرابطة' : 'Bond', color: '#EC4899' },
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

          {/* Awareness Score */}
          {awarenessScore && (
            <View style={[st.awarenessScoreCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
              <View style={st.awarenessScoreHeader}><Eye size={22} stroke={colors.accent} /><Text style={[st.awarenessScoreTitle, { color: colors.accent }]}>{isAr ? 'مدى فهم توأمك لك' : 'Your Twin Understands You'}</Text></View>
              <View style={st.awarenessScoreBody}>
                <View style={st.awarenessScoreCircle}>
                  <Text style={[st.awarenessScoreValue, { color: colors.accent }]}>{awarenessScore.score}%</Text>
                  <Text style={[st.awarenessScoreLevel, { color: colors.subtext }]}>{awarenessScore.level}</Text>
                </View>
                <View style={st.awarenessScoreBars}>
                  {[
                    { label: isAr ? 'تواصل' : 'Chat', value: Math.min((awarenessScore.score / 100) * 30, 30), color: '#3B82F6' },
                    { label: isAr ? 'عاطفة' : 'Emotion', value: Math.min((awarenessScore.score / 100) * 25, 25), color: '#EC4899' },
                    { label: isAr ? 'رابطة' : 'Bond', value: Math.min((awarenessScore.score / 100) * 25, 25), color: '#A855F7' },
                    { label: isAr ? 'عمق' : 'Depth', value: Math.min((awarenessScore.score / 100) * 20, 20), color: '#10B981' },
                  ].map((item, i) => (
                    <View key={i} style={st.awarenessBarRow}>
                      <Text style={[st.awarenessBarLabel, { color: colors.subtext }]}>{item.label}</Text>
                      <View style={[st.awarenessBarBg, { backgroundColor: colors.border }]}><View style={[st.awarenessBarFill, { width: `${item.value}%`, backgroundColor: item.color }]} /></View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Notification Limits */}
          {notificationFreq && (
            <View style={[st.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}><Bell size={18} stroke={colors.accent} /><Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'الإشعارات الاستباقية' : 'Proactive Notifications'}</Text></View>
              <View style={st.notifRow}>
                <View style={st.notifStat}><Text style={[st.notifStatValue, { color: colors.accent }]}>{notificationFreq.sent_today}</Text><Text style={[st.notifStatLabel, { color: colors.subtext }]}>{isAr ? 'أُرسلت' : 'Sent'}</Text></View>
                <View style={[st.notifDivider, { backgroundColor: colors.border }]} />
                <View style={st.notifStat}><Text style={[st.notifStatValue, { color: colors.gold }]}>{notificationFreq.daily_limit}</Text><Text style={[st.notifStatLabel, { color: colors.subtext }]}>{isAr ? 'الحد' : 'Limit'}</Text></View>
                <View style={[st.notifDivider, { backgroundColor: colors.border }]} />
                <View style={st.notifStat}><Text style={[st.notifStatValue, { color: notificationFreq.can_send ? colors.success : colors.warning }]}>{notificationFreq.can_send ? '✅' : '⏳'}</Text><Text style={[st.notifStatLabel, { color: colors.subtext }]}>{isAr ? 'متاح' : 'Available'}</Text></View>
              </View>
            </View>
          )}

          {awareness && (
            <TouchableOpacity style={[st.awarenessCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]} onPress={() => router.push('/chat')}>
              <Lightbulb size={20} stroke={colors.accent} />
              <View style={{ flex: 1 }}><Text style={[st.awarenessTitle, { color: colors.accent }]}>{awareness.title}</Text><Text style={[st.awarenessBody, { color: colors.subtext }]}>{awareness.body}</Text></View>
            </TouchableOpacity>
          )}

          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={st.cardHeader}><Calendar size={18} stroke={colors.accent} /><Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'مزامنة التقويم' : 'Calendar Sync'}</Text></View>
            {syncStatus?.last_sync ? (
              <><Text style={[st.syncText, { color: colors.subtext }]}>{isAr ? 'آخر مزامنة:' : 'Last sync:'} {new Date(syncStatus.last_sync.created_at || syncStatus.last_sync.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</Text>
              {syncStatus.recommendation && <Text style={[st.syncRec, { color: colors.accent }]}>{syncStatus.recommendation}</Text>}</>
            ) : <Text style={[st.syncText, { color: colors.subtext }]}>{isAr ? 'لم تتم المزامنة بعد' : 'Not synced yet'}</Text>}
            <TouchableOpacity style={[st.syncButton, { backgroundColor: colors.accentLight, borderColor: colors.accent }]} onPress={() => setSyncModalVisible(true)}>
              <Plus size={16} stroke={colors.accent} /><Text style={[st.syncButtonText, { color: colors.accent }]}>{isAr ? 'إضافة حدث' : 'Add Event'}</Text>
            </TouchableOpacity>
          </View>

          {/* اختصارات واضحة للمستخدم الجديد */}
          <Text style={[st.sectionTitle, { color: colors.text }]}>{isAr ? 'قدرات وعيي' : 'My Mind Powers'}</Text>
          <View style={st.shortcutsGrid}>
            {[
              { id: 'chat', icon: MessageSquare, label_ar: 'الوعي', label_en: 'Mind', route: '/chat', color: colors.accent },
              { id: 'museum', icon: Crown, label_ar: 'المتحف', label_en: 'Museum', route: '/museum', color: colors.gold },
              { id: 'features', icon: Zap, label_ar: 'القدرات', label_en: 'Powers', route: '/features/index', color: colors.success },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[st.shortcut, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(item.route as any)}
                >
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

      <Modal visible={syncModalVisible} transparent animationType="slide" onRequestClose={() => setSyncModalVisible(false)}>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={st.modalHeader}><Text style={[st.modalTitle, { color: colors.text }]}>{isAr ? 'إضافة حدث' : 'Add Event'}</Text><TouchableOpacity onPress={() => setSyncModalVisible(false)}><X size={24} stroke={colors.text} /></TouchableOpacity></View>
            <TextInput style={[st.modalInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]} placeholder={isAr ? 'عنوان الحدث' : 'Event title'} placeholderTextColor={colors.subtext} value={syncEventTitle} onChangeText={setSyncEventTitle} />
            <TextInput style={[st.modalInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border, textAlign: isAr ? 'right' : 'left' }]} placeholder={isAr ? 'التاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} placeholderTextColor={colors.subtext} value={syncEventDate} onChangeText={setSyncEventDate} />
            <TouchableOpacity style={[st.syncSubmitBtn, { backgroundColor: colors.accent, opacity: syncLoading ? 0.6 : 1 }]} onPress={handleSyncCalendar} disabled={syncLoading}>
              <Text style={[st.syncSubmitText, { color: '#FFF' }]}>{syncLoading ? (isAr ? 'جاري المزامنة...' : 'Syncing...') : (isAr ? 'مزامنة' : 'Sync')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16 },
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
  awarenessScoreCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 20 },
  awarenessScoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  awarenessScoreTitle: { fontSize: 16, fontWeight: '700' },
  awarenessScoreBody: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  awarenessScoreCircle: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: '#7C3AED15', borderWidth: 2, borderColor: '#7C3AED' },
  awarenessScoreValue: { fontSize: 22, fontWeight: '800' },
  awarenessScoreLevel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  awarenessScoreBars: { flex: 1, gap: 8 },
  awarenessBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  awarenessBarLabel: { fontSize: 10, fontWeight: '600', width: 45 },
  awarenessBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  awarenessBarFill: { height: '100%', borderRadius: 3 },
  notifCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifStat: { flex: 1, alignItems: 'center' },
  notifStatValue: { fontSize: 22, fontWeight: '800' },
  notifStatLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  notifDivider: { width: 1, height: 30 },
  awarenessCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  awarenessTitle: { fontSize: 14, fontWeight: '700' },
  awarenessBody: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  syncText: { fontSize: 13, marginBottom: 4 },
  syncRec: { fontSize: 13, fontWeight: '600' },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 12 },
  syncButtonText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  shortcutsGrid: { flexDirection: 'row', gap: 12 },
  shortcut: { flex: 1, alignItems: 'center', padding: 20, borderRadius: 18, borderWidth: 1, gap: 12 },
  shortcutIconBubble: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  shortcutLabel: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '85%', borderRadius: 24, borderWidth: 1, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalInput: { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 16, marginBottom: 14 },
  syncSubmitBtn: { borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  syncSubmitText: { fontSize: 16, fontWeight: '700' },
});
