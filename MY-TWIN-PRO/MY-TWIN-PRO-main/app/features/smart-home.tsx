import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTwinStore } from '../../store/useTwinStore';
import { useTheme } from '../../utils/theme';
import { router } from 'expo-router';
import { apiPost, apiGet } from '../../lib/httpClient';
import {
  ArrowLeft, Home, Lightbulb, Zap, Cloud, Thermometer,
  Sparkles, RefreshCw, Power,
} from 'lucide-react-native';

const T = {
  ar: {
    title: 'المنزل الذكي', status: 'حالة المنزل', devices: 'الأجهزة',
    light: 'الإضاءة', temperature: 'الحرارة', noDevices: 'لا توجد أجهزة متصلة',
    refresh: 'تحديث', loading: 'جاري التحميل...', commandSent: 'تم إرسال الأمر',
  },
  en: {
    title: 'Smart Home', status: 'Home Status', devices: 'Devices',
    light: 'Light', temperature: 'Temperature', noDevices: 'No devices connected',
    refresh: 'Refresh', loading: 'Loading...', commandSent: 'Command sent',
  },
};

const COMMANDS = [
  { ar: 'شغل النور', en: 'Turn on light', icon: Lightbulb, color: '#F59E0B' },
  { ar: 'اطفئ النور', en: 'Turn off light', icon: Power, color: '#6B7280' },
  { ar: 'شغل المكيف', en: 'Turn on AC', icon: Thermometer, color: '#3B82F6' },
  { ar: 'اطفئ المكيف', en: 'Turn off AC', icon: Cloud, color: '#9CA3AF' },
];

export default function SmartHome() {
  const insets = useSafeAreaInsets();
  const { lang, userId } = useTwinStore();
  const isAr = lang === 'ar';
  const isDark = useTheme().isDark;
  const t = T[lang] || T['ar'];

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const colors = {
    bg: isDark ? '#0A0014' : '#FAFAF8', card: isDark ? '#1A1226' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#2D2D2D', subtext: isDark ? '#A78BFA' : '#6B7280',
    accent: '#06B6D4', accentLight: '#06B6D420', border: isDark ? '#2D1B4D' : '#E8E8E3',
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try { const res = await apiGet(`/api/smart-home/status?user_id=${userId}`); setStatus(res); }
    catch (e) { setStatus(null); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchStatus(); }, []);

  const sendCommand = async (command: string) => {
    try {
      await apiPost('/api/smart-home/command', { user_id: userId, command, lang });
      Alert.alert('✅', t.commandSent);
      fetchStatus();
    } catch (e) {}
  };

  if (loading) {
    return (
      <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[st.root, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={24} stroke={colors.text} /></TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>{t.title}</Text>
        <TouchableOpacity onPress={fetchStatus}><RefreshCw size={20} stroke={colors.subtext} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.content}>
        <View style={[st.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[st.iconWrap, { backgroundColor: colors.accentLight }]}><Home size={40} stroke={colors.accent} /></View>
          <Text style={[st.statusTitle, { color: colors.text }]}>{t.status}</Text>
          {status?.devices && status.devices.length > 0 ? (
            status.devices.map((d: any, i: number) => (
              <View key={i} style={[st.deviceRow, { borderColor: colors.border }]}>
                <Zap size={20} stroke={colors.accent} />
                <Text style={[st.deviceName, { color: colors.text }]}>{d.name}</Text>
                <Text style={[st.deviceState, { color: colors.subtext }]}>{d.state}</Text>
              </View>
            ))
          ) : <Text style={[st.noDevices, { color: colors.subtext }]}>{t.noDevices}</Text>}
        </View>

        <Text style={[st.sectionTitle, { color: colors.text }]}>{isAr ? 'أوامر سريعة' : 'Quick Commands'}</Text>
        <View style={st.commandsGrid}>
          {COMMANDS.map((cmd, i) => { const Icon = cmd.icon; return (
            <TouchableOpacity key={i} style={[st.commandCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => sendCommand(isAr ? cmd.ar : cmd.en)}>
              <View style={[st.commandIcon, { backgroundColor: cmd.color + '20' }]}><Icon size={28} stroke={cmd.color} /></View>
              <Text style={[st.commandText, { color: colors.text }]}>{isAr ? cmd.ar : cmd.en}</Text>
            </TouchableOpacity>
          );})}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '700' }, content: { padding: 20, paddingBottom: 50 },
  statusCard: { borderRadius: 24, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 24 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statusTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, width: '100%' },
  deviceName: { flex: 1, fontSize: 15, fontWeight: '600' }, deviceState: { fontSize: 13 },
  noDevices: { fontSize: 14, fontStyle: 'italic' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  commandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  commandCard: { width: '46%', padding: 20, borderRadius: 18, borderWidth: 1, alignItems: 'center', gap: 10 },
  commandIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  commandText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
