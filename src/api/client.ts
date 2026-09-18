import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';

import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// API Base URL resolution (priority order):
//
//   1. EXPO_PUBLIC_API_URL env var — set this in .env for production builds
//      e.g.  EXPO_PUBLIC_API_URL=https://api.komunity.co.za/api/v1/
//
//   2. Expo dev server auto-detected LAN IP — works automatically for local
//      development via `npx expo start`. No manual IP changes ever needed.
//
//   3. localhost fallback — for web browser or emulator dev.
// ---------------------------------------------------------------------------

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

function resolveApiBaseUrl(): string {
    // 1. Explicit environment variable always wins (production / staging builds)
    if (ENV_API_URL) {
        return ENV_API_URL.endsWith('/') ? ENV_API_URL : `${ENV_API_URL}/`;
    }

    // 2. Auto-detect Expo dev server host IP (LAN — works for physical devices)
    let hostIp: string | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname) {
        hostIp = window.location.hostname;
    } else if (Constants.expoConfig?.hostUri) {
        hostIp = Constants.expoConfig.hostUri.split(':')[0] || null;
    } else if ((Constants as any).manifest?.debuggerHost) {
        hostIp = (Constants as any).manifest.debuggerHost.split(':')[0] || null;
    } else if ((Constants as any).manifest2?.extra?.expoGo?.debuggerHost) {
        hostIp = (Constants as any).manifest2.extra.expoGo.debuggerHost.split(':')[0] || null;
    }

    if (hostIp) {
        return `http://${hostIp}:8000/api/v1/`;
    }

    // 3. Final fallback — localhost (web browser / Android emulator)
    return 'http://127.0.0.1:8000/api/v1/';
}

const API_BASE_URL = resolveApiBaseUrl();

console.log('[Komunity API] Using base URL:', API_BASE_URL);


const TOKEN_KEY = 'komunity_auth_token';

const client = axios.create({
    baseURL: API_BASE_URL,
    // Do NOT set a default Content-Type here.
    // When FormData is passed, axios must auto-generate
    // 'multipart/form-data; boundary=...' with the correct boundary.
    // Setting 'application/json' here would override that and break file uploads.
});

type AuthExpirationListener = (reason?: string) => void;
let authExpirationListeners: AuthExpirationListener[] = [];

export const onAuthExpired = (listener: AuthExpirationListener) => {
    authExpirationListeners.push(listener);
    return () => {
        authExpirationListeners = authExpirationListeners.filter((l) => l !== listener);
    };
};

export const triggerAuthExpired = (reason: string = 'session_expired') => {
    authExpirationListeners.forEach((listener) => {
        try {
            listener(reason);
        } catch (e) {
            console.error('Error in auth expiration listener:', e);
        }
    });
};

// Interceptor for 401 auto-logout on expired session
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const requestUrl = error.config?.url || '';
            const isAuthEndpoint =
                requestUrl.includes('auth/') ||
                requestUrl.includes('login') ||
                requestUrl.includes('check-phone') ||
                requestUrl.includes('auth-token');

            if (!isAuthEndpoint) {
                console.warn('[Komunity API] 401 Session Expired on endpoint:', requestUrl);
                await clearToken();
                triggerAuthExpired('session_expired');
            }
        }
        return Promise.reject(error);
    }
);

export const setAuthToken = (token: string | null) => {
    if (token) {
        client.defaults.headers.common['Authorization'] = `Token ${token}`;
    } else {
        delete client.defaults.headers.common['Authorization'];
    }
};

/** Save auth token to secure storage */
export const saveToken = async (token: string): Promise<void> => {
    try {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
    } catch (error) {
        console.error('Error saving token to secure storage:', error);
    }
};

/** Load auth token from secure storage and set it on the client */
export const loadToken = async (): Promise<string | null> => {
    try {
        let token: string | null = null;
        if (Platform.OS === 'web') {
            token = localStorage.getItem(TOKEN_KEY);
        } else {
            token = await SecureStore.getItemAsync(TOKEN_KEY);
        }

        if (token) {
            setAuthToken(token);
        }
        return token;
    } catch (error) {
        console.error('Error loading token from secure storage:', error);
        return null;
    }
};

/** Clear auth token from secure storage and client headers */
export const clearToken = async (): Promise<void> => {
    try {
        setAuthToken(null);
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
    } catch (error) {
        console.error('Error clearing token from secure storage:', error);
    }
};

/**
 * Upload FormData (including files) using native fetch instead of axios.
 *
 * WHY: Axios has a known React Native bug — it either serialises FormData as a
 * JSON string or sends file parts as empty bodies when given a `file://` URI.
 * React Native's built-in `fetch` reads local file URIs correctly and sets the
 * multipart boundary automatically when you pass a FormData body without
 * explicitly setting Content-Type.
 *
 * @param method  HTTP method ('PATCH' | 'POST' | 'PUT')
 * @param path    Path relative to API_BASE_URL (e.g. 'profiles/27/')
 * @param formData FormData object (may contain file fields)
 * @returns Parsed JSON response data
 * @throws { response: { data, status } } — same shape as an axios error so
 *         callers can keep the same error-handling code.
 */
export const fetchFormData = async (
    method: 'POST' | 'PATCH' | 'PUT',
    path: string,
    formData: FormData,
): Promise<any> => {
    const url = `${API_BASE_URL}${path}`;
    const authHeader = client.defaults.headers.common['Authorization'] as string | undefined;

    // Standard web fetch supports FormData natively in browsers
    if (Platform.OS === 'web') {
        const headers: Record<string, string> = {};
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        const response = await fetch(url, { method, headers, body: formData });

        let data: any = null;
        const text = await response.text();
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        if (!response.ok) {
            const err: any = new Error(`HTTP ${response.status}`);
            err.response = { status: response.status, data };
            throw err;
        }

        return data;
    }

    // On Native (Android & iOS):
    // React Native 0.86+ / Expo SDK 57 global fetch throws:
    // [Error: Unsupported FormDataPart implementation] when given a FormData object.
    // XMLHttpRequest connects directly to React Native's native NetworkingModule,
    // which natively supports multipart/form-data with strings and file URI parts.
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);

        if (authHeader) {
            xhr.setRequestHeader('Authorization', authHeader);
        }

        xhr.onload = () => {
            let data: any = null;
            try {
                data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            } catch {
                data = xhr.responseText;
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data);
            } else {
                const err: any = new Error(`HTTP ${xhr.status}`);
                err.response = { status: xhr.status, data };
                reject(err);
            }
        };

        xhr.onerror = (e) => {
            const err: any = new Error('Network request failed');
            err.response = { status: xhr.status, data: xhr.responseText || e };
            reject(err);
        };

        xhr.ontimeout = () => {
            const err: any = new Error('Network request timed out');
            err.response = { status: 408, data: 'Timeout' };
            reject(err);
        };

        xhr.send(formData);
    });
};

/**
 * Utility to append an image file to FormData correctly on Web and React Native.
 */
export const appendFileToFormData = async (
    formData: FormData,
    fieldName: string,
    imageUri: string,
    defaultFilename = 'profile.jpg'
): Promise<void> => {
    let filename = imageUri.split('/').pop() || defaultFilename;
    if (!filename.includes('.')) {
        filename += '.jpg';
    }

    const extMatch = /\.(\w+)$/.exec(filename);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    let type = 'image/jpeg';
    if (ext === 'png') type = 'image/png';
    else if (ext === 'heic') type = 'image/heic';
    else if (ext === 'webp') type = 'image/webp';

    if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append(fieldName, blob, filename);
    } else {
        formData.append(fieldName, {
            uri: imageUri,
            name: filename,
            type,
        } as any);
    }
};

/**
 * Get full URL for media items, replacing localhost/127.0.0.1 with current backend host IP
 */
export const getMediaUrl = (path?: string | null): string | undefined => {
    if (!path) return undefined;

    let url = path;

    // If Django serialized absolute URL with localhost/127.0.0.1, replace with current server base URL
    if (url.startsWith('http://127.0.0.1:8000') || url.startsWith('http://localhost:8000')) {
        const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
        url = url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8000/, baseUrl);
    } else if (
        !url.startsWith('http://') &&
        !url.startsWith('https://') &&
        !url.startsWith('file://') &&
        !url.startsWith('data:') &&
        !url.startsWith('blob:')
    ) {
        const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
        url = `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    return url;
};

export default client;
