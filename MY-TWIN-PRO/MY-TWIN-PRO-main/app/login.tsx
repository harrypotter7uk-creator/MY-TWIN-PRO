import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function Login() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MyTwin</Text>
      <Text style={styles.subtitle}>Login Screen</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/twin-mind')}>
        <Text style={styles.btnText}>دخول</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0014' },
  title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#A78BFA', marginBottom: 30 },
  btn: { backgroundColor: '#7C3AED', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
});
