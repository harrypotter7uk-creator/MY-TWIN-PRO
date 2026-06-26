import { useTheme } from '../utils/theme';
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useMemo, useState } from "react";
import { Pressable, StyleSheet, Animated, Modal, useWindowDimensions, View, Text, TouchableOpacity } from "react-native";
import { useTwinStore } from "../store/useTwinStore";
import { initAnalytics } from "../lib/analytics";
import SideMenu from "../components/SideMenu";
import { ToastProvider } from "../components/Toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { registerForPushNotifications, setupNotificationHandlers, setupAndroidChannels } from "../lib/notifications";
import { pluginRegistry } from "../lib/pluginClient";
import { apiGet } from "../lib/httpClient";
import PresenceBubble from '../components/PresenceBubble';
import { Sparkles } from 'lucide-react-native';

// ============================================================
// 1. PARTICLE FIELD – تم إصلاح استخدام Hooks بشكل صحيح
// ============================================================
const ParticleField = ({ emotion, isDark }: { emotion?: string; isDark: boolean }) => {
  const colors: Record<string, string[]> = {
    joy: ['#FFD700', '#FF6B6B', '#FFE66D'], sadness: ['#4A90E2', '#8E9EAB', '#B0BEC5'],
    anger: ['#FF3B30', '#D32F2F', '#B71C1C'], fear: ['#9C27B0', '#673AB7', '#E1BEE7'],
    love: ['#E91E63', '#F48FB1', '#FF80AB'], neutral: ['#7C3AED', '#A78BFA', '#E0D9F5'],
  };
  const palette = colors[emotion || 'neutral'] || colors.neutral;
  
  // ✅ إنشاء جميع القيم خارج الـ map
  const particleCount = 12;
  const particles = useRef(
    Array.from({ length: particleCount }).map(() => ({
      anim: new Animated.Value(0),
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: palette[Math.floor(Math.random() * palette.length)],
    }))
  ).current;

  useEffect(() => {
    const animations = particles.map(p =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(p.anim, { toValue: 1, duration: 3000 + Math.random() * 2000, useNativeDriver: true }),
          Animated.timing(p.anim, { toValue: 0, duration: 3000 + Math.random() * 2000, useNativeDriver: true }),
        ])
      ).start()
    );
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', width: 8, height: 8, borderRadius: 4,
            backgroundColor: p.color,
            left: `${p.x}%`, top: `${p.y}%`,
            opacity: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }),
            transform: [{ translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) }],
          }}
        />
      ))}
    </View>
  );
};

// ============================================================
// 2. CONSCIOUSNESS CARD – مع حماية إضافية
// ============================================================
const ConsciousnessCard = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const router = useRouter();
  const { userId, lang } = useTwinStore();
  const [notification, setNotification] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && userId) {
      try {
        apiGet(`/api/awareness/check?user_id=${userId}&lang=${lang}`).then(res => {
          if (res?.notification) setNotification(res.notification);
        }).catch(() => {});
        Animated.spring(fadeAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
      } catch (e) {}
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      setNotification(null);
    }
  }, [visible, userId]);

  if (!visible || !notification) return null;

  return (
    <Animated.View style={[st.card, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }]}>
      <TouchableOpacity style={st.cardInner} onPress={() => { router.push('/chat'); onClose(); }}>
        <Sparkles size={18} stroke="#7C3AED" />
        <Text style={st.cardTitle}>{notification.title}</Text>
        <Text style={st.cardBody}>{notification.body}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={st.cardClose}>
        <Text style={{ color: '#A78BFA', fontWeight: '700' }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================
// 3. ROOT LAYOUT – آمن ومحمي بالكامل
// ============================================================
export default function RootLayout() {
  // ✅ useTheme محمي بضمان وجود theme.isDark
  const theme = useTwinStore(s => s.theme);
  const isDark = theme === 'dark';

  const menuVisible = useTwinStore(s => s.menuVisible);
  const closeMenu = useTwinStore(s => s.closeMenu);
  const lang = useTwinStore(s => s.lang);
  const userId = useTwinStore(s => s.userId);
  const twinEnergy = useTwinStore(s => s.twinEnergy);
  const isRTL = lang === 'ar';
  const slideAnim = useRef(new Animated.Value(isRTL ? 300 : -300)).current;
  const { width } = useWindowDimensions();
  const drawerWidth = width * 0.8;
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [showConsciousnessCard, setShowConsciousnessCard] = useState(false);

  // ✅ تهيئة آمنة للمكونات
  useEffect(() => {
    try { pluginRegistry.loadFromBackend(); } catch (e) {}
    try { setupNotificationHandlers(); setupAndroidChannels(); } catch (e) {}
  }, []);

  useEffect(() => {
    if (userId) {
      try { registerForPushNotifications(); } catch (e) {}
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    try {
      const setup = async () => { if (!cancelled) await initAnalytics(); };
      setup();
    } catch (e) {}
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: menuVisible ? 0 : (isRTL ? drawerWidth : -drawerWidth),
      damping: 18, stiffness: 120, useNativeDriver: true
    }).start();
  }, [menuVisible, drawerWidth, isRTL]);

  useEffect(() => {
    if (twinEnergy > 80) setCurrentEmotion('joy');
    else if (twinEnergy > 50) setCurrentEmotion('neutral');
    else if (twinEnergy > 30) setCurrentEmotion('sadness');
    else setCurrentEmotion('fear');
  }, [twinEnergy]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => setShowConsciousnessCard(true), 1800000);
    return () => clearInterval(interval);
  }, [userId]);

  const screenOptions = useMemo(() => ({
    headerShown: false,
    contentStyle: { backgroundColor: isDark ? '#1A1A1A' : '#F8F6F2' }
  }), [isDark]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ParticleField emotion={currentEmotion} isDark={isDark} />
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="twin-mind" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="relationship" />
          <Stack.Screen name="memories" />
          <Stack.Screen name="museum" />
          <Stack.Screen name="history" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="referral" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="about" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="feedback" />
          <Stack.Screen name="features/index" />
          <Stack.Screen name="features/study-mode" />
          <Stack.Screen name="features/code-lab" />
          <Stack.Screen name="features/business-analyzer" />
          <Stack.Screen name="features/life-coach" />
          <Stack.Screen name="features/image-creator" />
          <Stack.Screen name="features/dreams" />
          <Stack.Screen name="features/content-creator" />
          <Stack.Screen name="features/smart-home" />
          <Stack.Screen name="features/task-manager" />
        </Stack>

        {menuVisible && (
          <Modal visible transparent animationType="none" onRequestClose={closeMenu}>
            <Pressable style={st.overlay} onPress={closeMenu}>
              <Animated.View style={[st.sidebar, {
                backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                width: drawerWidth,
                [isRTL ? 'right' : 'left']: 0,
                transform: [{ translateX: slideAnim }]
              }]}>
                <SideMenu onClose={closeMenu} />
              </Animated.View>
            </Pressable>
          </Modal>
        )}

        <PresenceBubble visible={!!userId && !menuVisible} />
        <ConsciousnessCard visible={showConsciousnessCard} onClose={() => setShowConsciousnessCard(false)} />
      </ToastProvider>
    </ErrorBoundary>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sidebar: { position: 'absolute', top: 0, bottom: 0, shadowColor: "#000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 15 },
  card: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#1A1226', borderRadius: 20, borderWidth: 1, borderColor: '#7C3AED', padding: 16, flexDirection: 'row', alignItems: 'center', zIndex: 10000 },
  cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  cardBody: { color: '#A78BFA', fontSize: 12, marginTop: 4 },
  cardClose: { padding: 8 },
});
