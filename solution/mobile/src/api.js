import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://0.0.0.0:4000';

export const TOKEN_KEY = 'theatre.accessToken';
export const REFRESH_TOKEN_KEY = 'theatre.refreshToken';
export const USER_KEY = 'theatre.user';

async function parseResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function requestOnce(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await parseResponse(response);
  return { response, payload };
}

export async function saveSession(user, session) {
  await SecureStore.setItemAsync(TOKEN_KEY, session.access_token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refresh_token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function restoreStoredSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  const storedUser = await SecureStore.getItemAsync(USER_KEY);

  return {
    token,
    refreshToken,
    user: storedUser ? JSON.parse(storedUser) : null
  };
}

async function refreshAccessToken() {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error('Your session expired. Please login again.');
  }

  const { response, payload } = await requestOnce('/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok || !payload?.session?.access_token) {
    await clearSession();
    throw new Error(payload?.message || 'Your session expired. Please login again.');
  }

  await saveSession(payload.user, payload.session);
  return payload.session.access_token;
}

export async function apiRequest(path, options = {}, token) {
  const { response, payload } = await requestOnce(path, options, token);

  if (response.ok) {
    return payload;
  }

  const shouldRefresh = response.status === 401 && token && path !== '/refresh';

  if (shouldRefresh) {
    const nextToken = await refreshAccessToken();
    const retry = await requestOnce(path, options, nextToken);

    if (retry.response.ok) {
      return retry.payload;
    }

    throw new Error(retry.payload?.message || 'Request failed');
  }

  throw new Error(payload?.message || 'Request failed');
}

export { API_URL };
