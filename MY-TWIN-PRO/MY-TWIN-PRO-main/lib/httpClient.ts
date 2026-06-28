import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const BASE_URL = 'https://my-twin-pro-production-b744.up.railway.app';

async function getToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem('mytwin-token'); } catch { return null; }
}

async function request(endpoint: string, options: RequestInit = {}, retries = 2): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
      if (!response.ok) {
        if (response.status === 401 && attempt < retries) continue;
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) return await response.json();
      return await response.text();
    } catch (error: any) {
      if (attempt === retries) {
        if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
          Alert.alert('انقطع الاتصال', 'يبدو أن الاتصال بالإنترنت ضعيف أو مقطوع. سيحاول التطبيق إعادة الاتصال.');
        }
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

export async function apiPost(endpoint: string, data: any = {}): Promise<any> { return request(endpoint, { method: 'POST', body: JSON.stringify(data) }); }
export async function apiGet(endpoint: string): Promise<any> { return request(endpoint, { method: 'GET' }); }
export async function apiDelete(endpoint: string): Promise<any> { return request(endpoint, { method: 'DELETE' }); }
export async function setToken(token: string): Promise<void> { await AsyncStorage.setItem('mytwin-token', token); }
export async function removeToken(): Promise<void> { await AsyncStorage.removeItem('mytwin-token'); }
