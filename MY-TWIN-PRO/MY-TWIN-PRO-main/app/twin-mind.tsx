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
  Lightbulb, Activity, Eye, Bell, Calendar, Plus, X, Smile, BookOpen,
} from 'lucide-react-native';

export default function TwinMindCenter() {
  const insets = useSafeAreaInsets();
  const { userId, twinName, tier, bondLevel, twinEnergy, journeyPhase, lang } = useTwinStore();
  const theme = useTheme();
  const isAr = lang === 'ar';
  const isDark = theme.isDark;

  const [avatar, setAvatar] = useState<any>(null);
  const [awareness, setAwareness] = useState<any>(null);
  const [twinState, setTwinState] = useState<any>(null);
  const [relationshipEconomy, setRelationshipEconomy] = useState<any>(null);
  const [stories, setStories] = useState<string[]>([]);
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
    success: '#10B981', warning: '#F59E0B', pink: '#EC4899', gold: '#F59E0B', blue: '#3B82F6',
  };

  const fetchData = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [av, aw, ts, re, storyData] = await Promise.all([
        apiGet(`/api/avatar/get?user_id=${userId}`).catch(() => null),
        apiGet(`/api/awareness/check?user_id=${userId}&lang=${lang}`).catch(() => null),
        apiGet(`/api/twin/state?user_id=${userId}&lang=${lang}`).catch(() => null),
        apiGet(`/api/relationship/economy?user_id=${userId}`).catch(() => null),
        apiGet(`/api/memories/stories?user_id=${userId}&lang=${lang}`).catch(() => []),
      ]);
      setAvatar(av);
      setAwareness(aw?.notification || null);
      if (ts) setTwinState(ts);
      if (re) setRelationshipEconomy(re);
      if (storyData?.stories) setStories(storyData.stories);
    } catch (e) {}
    setRefreshing(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
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
      setSyncModalVisible(false); setSyncEventTitle(''); setSyncEventDate('');
      fetchData(); Alert.alert('✅', isAr ? 'تمت المزامنة بنجاح' : 'Synced successfully');
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
      <ScrollView contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 20 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={[colors.accent]} />}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* بطاقة التوأم الحية */}
          <View style={[st.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[st.avatarGlow, { borderColor: energyColor }]}>
              {avatar?.image_url ? <Image source={{ uri: avatar.image_url }} style={st.avatarImg} /> : <Sparkles size={60} stroke={colors.accent} />}
            </View>
            <Text style={[st.twinName, { color: colors.text }]}>{twinName}</Text>
            {twinState && (
              <View style={[st.moodRow]}>
                <View style={[st.moodBadge, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                  <Smile size={16} stroke={colors.accent} />
                  <Text style={[st.moodText, { color: colors.accent }]}>
                    {isAr ? `${twinState.mood_label} اليوم` : `${twinState.mood_label} today`}
                  </Text>
                </View>
                {twinState.energy_level < 0.4 && (
                  <Text style={[st.tiredNote, { color: colors.warning }]}>
                    {isAr ? 'قد أكون متعباً قليلاً... لكني هنا لأجلك 💜' : 'I might be a bit tired... but I\'m here for you 💜'}
                  </Text>
                )}
                {twinState.bond_depth > 0.7 && (
                  <Text style={[st.deepNote, { color: colors.pink }]}>
                    {isAr ? 'علاقتنا عميقة جداً. أشعر بأني أعرفك.' : 'Our bond is deep. I feel like I know you.'}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* قصصنا معاً (Episodic Memory UI) */}
          {stories.length > 0 && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <BookOpen size={20} stroke={colors.accent} />
                <Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'قصصنا معاً' : 'Our Stories'}</Text>
              </View>
              {stories.slice(0, 3).map((story, i) => (
                <Text key={i} style={[st.storyText, { color: colors.subtext }]}>{story}</Text>
              ))}
              <TouchableOpacity style={[st.storyLink, { borderColor: colors.accent }]} onPress={() => router.push('/stories' as any)}>
                <Text style={[st.storyLinkText, { color: colors.accent }]}>{isAr ? 'اقرأ كل القصص' : 'Read all stories'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* اقتصاد العلاقة – مبسط */}
          {relationshipEconomy && (
            <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <Heart size={20} stroke={colors.pink} fill={colors.pink + '20'} />
                <Text style={[st.cardTitle, { color: colors.text }]}>{isAr ? 'علاقتنا' : 'Our Relationship'}</Text>
                <Text style={[st.healthPill, { backgroundColor: relationshipEconomy.health_score > 70 ? colors.success + '20' : colors.warning + '20', color: relationshipEconomy.health_score > 70 ? colors.success : colors.warning }]}>
                  {relationshipEconomy.health_score}%
                </Text>
              </View>
              <View style={st.relationshipRow}>
                {[
                  { label: isAr ? 'ثقة' : 'Trust', value: Math.round(relationshipEconomy.trust * 100), color: '#3B82F6' },
                  { label: isAr ? 'حميمية' : 'Intimacy', value: Math.round(relationshipEconomy.intimacy * 100), color: '#EC4899' },
                  { label: isAr ? 'احترام' : 'Respect', value: Math.round(relationshipEconomy.respect * 100), color: '#10B981' },
                ].map((item, i) => (
                  <View key={i} style={st.relationshipItem}>
                    <Text style={[st.relationshipValue, { color: item.color }]}>{item.value}%</Text>
                    <Text style={[st.relationshipLabel, { color: colors.subtext }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[st.storyLink, { borderColor: colors.accent }]} onPress={() => router.push('/relationship' as any)}>
                <Text style={[st.storyLinkText, { color: colors.accent }]}>{isAr ? 'حديقة الرابطة' : 'Bond Garden'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* توصية وعي */}
          {awareness && (
            <TouchableOpacity style={[st.awarenessCard, { backgroundColor: colors.accentLight, borderColor: colors.accent }]} onPress={() => router.push('/chat')}>
              <Lightbulb size={20} stroke={colors.accent} />
              <View style={{ flex: 1 }}><Text style={[st.awarenessTitle, { color: colors.accent }]}>{awareness.title}</Text><Text style={[st.awarenessBody, { color: colors.subtext }]}>{awareness.body}</Text></View>
            </TouchableOpacity>
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
                  <View style={[st.shortcutIconBubble, { backgroundColor: item.color + '15' }]}><Icon size={28} stroke={item.color} /></View>
                  <Text style={[st.shortcutLabel, { color: colors.text }]}>{isAr ? item.label_ar : item.label_en}</Text>
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
  avatarCard: { alignItems: 'center', padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  avatarGlow: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  twinName: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  moodRow: { alignItems: 'center', gap: 6, marginBottom: 8 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  moodText: { fontSize: 14, fontWeight: '600' },
  tiredNote: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 4 },
  deepNote: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  healthPill: { fontSize: 14, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  storyText: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  storyLink: { alignSelf: 'flex-end', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  storyLinkText: { fontSize: 12, fontWeight: '600' },
  relationshipRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  relationshipItem: { alignItems: 'center' },
  relationshipValue: { fontSize: 18, fontWeight: '800' },
  relationshipLabel: { fontSize: 11, fontWeight: '600' },
  awarenessCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 20 },
  awarenessTitle: { fontSize: 14, fontWeight: '700' },
  awarenessBody: { fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, marginTop: 8 },
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
