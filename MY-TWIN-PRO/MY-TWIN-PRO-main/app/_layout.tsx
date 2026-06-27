import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Animated, View } from "react-native";
import { useTwinStore } from "../store/useTwinStore";
import { ErrorBoundary } from "../components/ErrorBoundary";

// ── Particle بعدد أقل وتأخير في البدء لحماية JS thread ──────
const ParticleField = ({ emotion, isDark }: { emotion: string; isDark: boolean }) => {
  const [active, setActive] = useState(false);

  const COLORS: Record<string, string[]> = {
    joy:     ['#FFD700', '#FF6B6B', '#FFE66D'],
    sadness: ['#4A90E2', '#8E9EAB', '#B0BEC5'],
    anger:   ['#FF3B30', '#D32F2F', '#B71C1C'],
    fear:    ['#9C27B0', '#673AB7', '#E1BEE7'],
    love:    ['#E91E63', '#F48FB1', '#FF80AB'],
    neutral: ['#7C3AED', '#A78BFA', '#E0D9F5'],
  };

  const palette = COLORS[emotion] ?? COLORS.neutral;

  // 6 جسيمات فقط بدل 12 لتخفيف الحمل
  const particles = useRef(
    Array.from({ length: 6 }).map(() => ({
      anim: new Animated.Value(0),
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: palette[Math.floor(Math.random() * palette.length)],
      duration: 3000 + Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    // تأخير 2 ثانية قبل بدء الجسيمات
    const startDelay = setTimeout(() => setActive(true), 2000);
    return () => clearTimeout(startDelay);
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
            backgroundColor: p.color,
            left: `${p.x}%`,
            top:  `${p.y}%`,
            opacity: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.35] }),
            transform: [{
              translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-15, 15] }),
            }],
          }}
        />
      ))}
    </View>
  );
};

// ── Layout الرئيسي ────────────────────────────────────────────
export default function RootLayout() {
  const theme      = useTwinStore(s => s.theme);
  const twinEnergy = useTwinStore(s => s.twinEnergy);
  const isDark     = theme === 'dark';

  const emotion = (() => {
    if (twinEnergy > 80) return 'joy';
    if (twinEnergy > 50) return 'neutral';
    if (twinEnergy > 30) return 'sadness';
    return 'fear';
  })();

  return (
    <ErrorBoundary>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ParticleField emotion={emotion} isDark={isDark} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index"        />
        <Stack.Screen name="splash"       />
        <Stack.Screen name="twin-mind"    />
        <Stack.Screen name="chat"         />
        <Stack.Screen name="login"        />
        <Stack.Screen name="onboarding"   />
        <Stack.Screen name="museum"       />
        <Stack.Screen name="memories"     />
        <Stack.Screen name="relationship" />
        <Stack.Screen name="profile"      />
        <Stack.Screen name="settings"     />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="referral"     />
        <Stack.Screen name="features/index"              />
        <Stack.Screen name="features/study-mode"         />
        <Stack.Screen name="features/code-lab"           />
        <Stack.Screen name="features/business-analyzer"  />
        <Stack.Screen name="features/life-coach"         />
        <Stack.Screen name="features/image-creator"      />
        <Stack.Screen name="features/dreams"             />
        <Stack.Screen name="features/content-creator"    />
        <Stack.Screen name="features/smart-home"         />
        <Stack.Screen name="features/task-manager"       />
      </Stack>
    </ErrorBoundary>
  );
}
