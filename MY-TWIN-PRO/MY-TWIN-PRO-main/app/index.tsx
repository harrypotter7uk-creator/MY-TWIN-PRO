import { Redirect } from 'expo-router';
import { useTwinStore } from '../store/useTwinStore';

export default function Index() {
  const { userId } = useTwinStore();
  
  if (userId) {
    return <Redirect href="/twin-mind" />;
  }
  
  return <Redirect href="/splash" />;
}
