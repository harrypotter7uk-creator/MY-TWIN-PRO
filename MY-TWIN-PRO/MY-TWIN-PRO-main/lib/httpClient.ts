import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://my-twin-pro-production-b744.up.railway.app';

// جلب التوكن من التخزين المحلي
async function getToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('mytwin-token');
    return token;
  } catch {
    return null;
  }
}

// دالة الطلب الموحدة
async function request(
  endpoint: string,
  options: RequestInit = {},
  retries = 2
): Promise<any> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401 && attempt < retries) {
          // محاولة تجديد التوكن (يمكن تطويرها لاحقاً)
          continue;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error: any) {
      if (attempt === retries) throw error;
      // انتظار قصير قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

// طلب POST
export async function apiPost(endpoint: string, data: any = {}): Promise<any> {
  return request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// طلب GET
export async function apiGet(endpoint: string): Promise<any> {
  return request(endpoint, {
    method: 'GET',
  });
}

// طلب DELETE
export async function apiDelete(endpoint: string): Promise<any> {
  return request(endpoint, {
    method: 'DELETE',
  });
}

// دالة البث الحي (Streaming) للدردشة
export async function streamChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  lang: string = 'ar',
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, history, lang }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Stream error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      onChunk(chunk);
    }
  }

  return fullText;
}

// تخزين التوكن
export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem('mytwin-token', token);
}

// حذف التوكن
export async function removeToken(): Promise<void> {
  await AsyncStorage.removeItem('mytwin-token');
}
