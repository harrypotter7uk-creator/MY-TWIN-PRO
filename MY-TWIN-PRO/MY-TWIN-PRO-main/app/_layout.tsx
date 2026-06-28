import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet, Animated, View, Pressable,
  Modal, useWindowDimensions, Text, TouchableOpacity,
} from "react-native";
import { useTwinStore } from "../store/useTwinStore";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { apiGet } from "../lib/httpClient";
import { Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// ─────────────────────────────────────────────────────────────
// PARTICLE FIELD
// ─────────────────────────────────────────────────────────────
const EMOTION_COLORS: Record<string, string[]> = {
  joy:     ['#FFD700', '#FF6B6B', '#FFE66D'],
  sadness: ['#4A90E2', '#8E9EAB', '#B0BEC5'],
  anger:   ['#FF3B30', '#D32F2F', '#B71C1C'],
  fear:    ['#9C27B0', '#673AB7', '#E1BEE7'],
  love:    ['#E91E63', '#F48FB1', '#FF80AB'],
  neutral: ['#7C3AED', '#A78BFA', '#E0D9F5'],
};

const ParticleField = React.memo(({ emotion }: { emotion: string }) => {
  const [active, setActive] = useState(false);
  const palette = EMOTION_COLORS[emotion] ?? EMOTION_COLORS.neutral;

  // ✅ إنشاء الجسيمات مرة واحدة فقط
  const particles = useRef(
    Array.from({ length: 6 }).map(() => ({
      anim:     new Animated.Value(0),
      x:        Math.random() * 100,
      y:        Math.random() * 100,
      colorIdx: Math.floor(Math.random() * 3),
      duration: 3000 + Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    const t = setTimeout(() => setActive(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!active) return;
    const loops = particles.map(p => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: true }),
          Animated.timing(p.anim, { toValue: 0, duration: p.duration, useNativeDriver: true }),
        ])
      );
      loop.start();
      return loop;
    });
    return () => loops.forEach(l => l.stop());
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 8, height: 8, borderRadius: 4,
            // ✅ نستخدم palette الحالية وقت الـ render
            backgroundColor: palette[p.colorIdx % palette.length],
            left: `${p.x}%`,
            top:  `${p.y}%`,
            opacity:   p.anim.interpolate({ inputRange: [0,1], outputRange: [0.1, 0.35] }),
            transform: [{ translateY: p.anim.interpolate({ inputRange: [0,1], outputRange: [-15, 15] }) }],
          }}
        />
      ))}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// CONSCIOUSNESS CARD
// ─────────────────────────────────────────────────────────────
interface NotificationData {
  title: string;
  body:  string;
  type?: string;
}

const ConsciousnessCard = React.memo(({
  visible, onClose,
}: { visible: boolean; onClose: () => void }) => {
  const router    = useRouter();
  const userId    = useTwinStore(s => s.userId);
  const lang      = useTwinStore(s => s.lang);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [notification, setNotification] = useState<NotificationData | null>(null);

  useEffect(() => {
    if (!visible || !userId) return;

    let cancelled = false;

    // ✅ timeout 6 ثوانٍ لمنع التعليق
    const controller = { aborted: false };
    const timeout = setTimeout(() => { controller.aborted = true; }, 6000);

    apiGet(`/api/awareness/check?user_id=${userId}&lang=${lang}`)
      .then((res: any) => {
        clearTimeout(timeout);
        if (cancelled || controller.aborted) return;

        // ✅ تحقق دقيق من البيانات قبل العرض
        const n = res?.notification;
        if (
          n &&
          typeof n === 'object' &&
          typeof n.title === 'string' && n.title.trim() &&
          typeof n.body  === 'string' && n.body.trim()
        ) {
          setNotification({ title: n.title.trim(), body: n.body.trim(), type: n.type });
        }
      })
      .catch(() => { clearTimeout(timeout); });

    Animated.spring(fadeAnim, {
      toValue: 1, friction: 8, useNativeDriver: true,
    }).start();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [visible, userId, lang]);

  useEffect(() => {
    if (!visible) {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start(() => setNotification(null));
    }
  }, [visible]);

  // ✅ لا نعرض شيئاً إذا لم تكن البيانات جاهزة
  if (!visible || !notification) return null;

  return (
    <Animated.View style={[
      st.card,
      {
        opacity:   fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0,1], outputRange: [50, 0],
          }),
        }],
      },
    ]}>
      <TouchableOpacity
        style={st.cardInner}
        activeOpacity={0.8}
        onPress={() => { router.push('/chat'); onClose(); }}
      >
        <Sparkles size={18} stroke="#7C3AED" />
        <View style={{ flex: 1 }}>
          <Text style={st.cardTitle} numberOfLines={1}>{notification.title}</Text>
          <Text style={st.cardBody}  numberOfLines={2}>{notification.body}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} style={st.cardClose} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
        <Text style={{ color: '#A78BFA', fontWeight: '700', fontSize: 16 }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────
// ROOT LAYOUT
// ─────────────────────────────────────────────────────────────
export default function RootLayout() {
  const theme      = useTwinStore(s => s.theme);
  const twinEnergy = useTwinStore(s => s.twinEnergy);
  const menuVisible = useTwinStore(s => s.menuVisible);
  const closeMenu   = useTwinStore(s => s.closeMenu);
  const lang        = useTwinStore(s => s.lang);
  const userId      = useTwinStore(s => s.userId);

  const isDark = theme === 'dark';
  const isRTL  = lang === 'ar';

  const { width }    = useWindowDimensions();
  const drawerWidth  = width * 0.8;

  // ✅ slideAnim لا تعتمد على isRTL في التهيئة - تُحدَّث في useEffect
  const slideAnim = useRef(new Animated.Value(-300)).current;

  const [currentEmotion,        setCurrentEmotion]        = useState('neutral');
  const [showConsciousnessCard, setShowConsciousnessCard] = useState(false);
  const [SideMenuComp,          setSideMenuComp]          = useState<React.ComponentType<any> | null>(null);
  const [PresenceBubbleComp,    setPresenceBubbleComp]    = useState<React.ComponentType<any> | null>(null);

  // ✅ تحميل المكونات الثقيلة مرة واحدة بعد mount
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const m1 = require('../components/SideMenu');
        if (m1?.default) setSideMenuComp(() => m1.default);
      } catch (e) { console.warn('[Layout] SideMenu load failed:', e); }

      try {
        const m2 = require('../components/PresenceBubble');
        if (m2?.default) setPresenceBubbleComp(() => m2.default);
      } catch (e) { console.warn('[Layout] PresenceBubble load failed:', e); }
    }, 500);
    return () => clearTimeout(t);
  }, []);

  // ✅ تحديث المشاعر
  useEffect(() => {
    if      (twinEnergy > 80) setCurrentEmotion('joy');
    else if (twinEnergy > 50) setCurrentEmotion('neutral');
    else if (twinEnergy > 30) setCurrentEmotion('sadness');
    else                      setCurrentEmotion('fear');
  }, [twinEnergy]);

  // ✅ animation القائمة - تعتمد على drawerWidth و isRTL معاً
  useEffect(() => {
    const targetOpen   = 0;
    const targetClosed = isRTL ? drawerWidth : -drawerWidth;
    Animated.spring(slideAnim, {
      toValue:   menuVisible ? targetOpen : targetClosed,
      damping:   18,
      stiffness: 120,
      useNativeDriver: true,
    }).start();
  }, [menuVisible, drawerWidth, isRTL]);

  // ✅ تهيئة slideAnim عند تغيير isRTL بدون animation
  useEffect(() => {
    if (!menuVisible) {
      slideAnim.setValue(isRTL ? drawerWidth : -drawerWidth);
    }
  }, [isRTL]);

  // ✅ interval مع cleanup صحيح يراقب userId
  useEffect(() => {
    if (!userId) return;
    // أول تحقق بعد 5 دقائق من الدخول
    const firstCheck = setTimeout(() => setShowConsciousnessCard(true), 5 * 60 * 1000);
    // ثم كل 30 دقيقة
    const interval   = setInterval(() => setShowConsciousnessCard(true), 30 * 60 * 1000);
    return () => {
      clearTimeout(firstCheck);
      clearInterval(interval);
      setShowConsciousnessCard(false); // ✅ إخفاء البطاقة عند تسجيل الخروج
    };
  }, [userId]);

  const handleCloseCard = useCallback(() => setShowConsciousnessCard(false), []);
  const handleCloseMenu = useCallback(() => closeMenu?.(), [closeMenu]);

  return (
    <ErrorBoundary>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ParticleField emotion={currentEmotion} />

      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index"                        />
        <Stack.Screen name="splash"                       />
        <Stack.Screen name="twin-mind"                    />
        <Stack.Screen name="chat"                         />
        <Stack.Screen name="login"                        />
        <Stack.Screen name="onboarding"                   />
        <Stack.Screen name="museum"                       />
        <Stack.Screen name="memories"                     />
        <Stack.Screen name="relationship"                 />
        <Stack.Screen name="profile"                      />
        <Stack.Screen name="settings"                     />
        <Stack.Screen name="subscription"                 />
        <Stack.Screen name="referral"                     />
        <Stack.Screen name="features/index"               />
        <Stack.Screen name="features/study-mode"          />
        <Stack.Screen name="features/code-lab"            />
        <Stack.Screen name="features/business-analyzer"   />
        <Stack.Screen name="features/life-coach"          />
        <Stack.Screen name="features/image-creator"       />
        <Stack.Screen name="features/dreams"              />
        <Stack.Screen name="features/content-creator"     />
        <Stack.Screen name="features/smart-home"          />
        <Stack.Screen name="features/task-manager"        />
      </Stack>

      {/* القائمة الجانبية */}
      {menuVisible && SideMenuComp && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={handleCloseMenu}
          statusBarTranslucent
        >
          <Pressable style={st.overlay} onPress={handleCloseMenu}>
            <Animated.View style={[
              st.sidebar,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                width: drawerWidth,
                [isRTL ? 'right' : 'left']: 0,
                transform: [{ translateX: slideAnim }],
              },
            ]}>
              {/* ✅ نمنع إغلاق القائمة عند الضغط داخلها */}
              <Pressable onPress={e => e.stopPropagation()}>
                <SideMenuComp onClose={handleCloseMenu} />
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}

      {/* فقاعة الوجود */}
      {PresenceBubbleComp && userId && !menuVisible && (
        <PresenceBubbleComp visible />
      )}

      {/* بطاقة الوعي الاستباقي */}
      <ConsciousnessCard
        visible={showConsciousnessCard}
        onClose={handleCloseCard}
      />
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    position: 'absolute', top: 0, bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 15,
  },
  card: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    backgroundColor: '#1A1226',
    borderRadius: 20, borderWidth: 1, borderColor: '#7C3AED',
    padding: 16,
    flexDirection: 'row', alignItems: 'center',
    zIndex: 10000,
    elevation: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  cardInner: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', gap: 12,
  },
  cardTitle: {
    color: '#FFFFFF', fontWeight: '700', fontSize: 14,
  },
  cardBody: {
    color: '#A78BFA', fontSize: 12, marginTop: 3, lineHeight: 18,
  },
  cardClose: { padding: 8 },
});
