import { Stack } from "expo-router";
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0014' }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="splash" />
        <Stack.Screen name="login" />
        <Stack.Screen name="twin-mind" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="museum" />
        <Stack.Screen name="memories" />
        <Stack.Screen name="relationship" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="features/index" />
      </Stack>
    </View>
  );
}
