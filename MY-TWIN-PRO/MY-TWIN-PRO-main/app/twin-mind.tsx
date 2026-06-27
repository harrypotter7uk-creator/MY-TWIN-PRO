import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTwinStore } from '../store/useTwinStore';
import { Sparkles } from 'lucide-react-native';

export default function TwinMind() {
  const twinName = useTwinStore(s => s.twinName);
  
  return (
    <View style={styles.container}>
      <Sparkles size={40} stroke="#7C3AED" />
      <Text style={styles.title}>مرحباً، {twinName || 'MyTwin'}</Text>
      <Text style={styles.subtitle}>مركز الوعي يعمل بنجاح</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0014' },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 10, marginTop: 16 },
  subtitle: { fontSize: 16, color: '#A78BFA' },
});
