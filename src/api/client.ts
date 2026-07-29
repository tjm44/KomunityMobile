import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';

import Constants from 'expo-constants';

const LOCAL_API_URL = 'http://127.0.0.1:8000/api/v1/';

// Dynamically get the Expo host IP for LAN connections
let hostIp = '192.168.88.158'; // default fallback for this machine

if (Constants.manifest?.debuggerHost) {
    const ip = Constants.manifest.debuggerHost.split(':')[0];
    if (ip) {
        hostIp = ip;
    }
} else if (Constants.expoConfig?.hostUri) {
    const ip = Constants.expoConfig.hostUri.split(':')[0];
    if (ip) {
        hostIp = ip;
    }
}

const LAN_API_URL = `http://${hostIp}:8000/api/v1/`;
// Replace this with your new Railway production URL once deployed (e.g., https://komunity-production.up.railway.app/api/v1/)
const PROD_API_URL = 'https://<your-railway-app>.up.railway.app/api/v1/';

// Use LAN API URL for local development to connect to the Django backend
const API_BASE_URL = LAN_API_URL;

console.log('[Komunity API] Using base URL:', API_BASE_URL);

const TOKEN_KEY = 'komunity_auth_token';

const client = axios.create({
    baseURL: API_BASE_URL,
    // Do NOT set a default Content-Type here.
    // When FormData is passed, axios must auto-generate
    // 'multipart/form-data; boundary=...' with the correct boundary.
    // Setting 'application/json' here would override that and break file uploads.
});

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

    // Grab the auth token that was set via setAuthToken()
    const authHeader = client.defaults.headers.common['Authorization'] as string | undefined;

    const headers: Record<string, string> = {};
    if (authHeader) {
        headers['Authorization'] = authHeader;
    }
    // DO NOT set Content-Type here — fetch will set it automatically with the
    // correct boundary when the body is a FormData instance.

    const response = await fetch(url, { method, headers, body: formData });

    let data: any = null;
    const text = await response.text();
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        // Match the shape of an axios error so callers don't need changes
        const err: any = new Error(`HTTP ${response.status}`);
        err.response = { status: response.status, data };
        throw err;
    }

    return data;
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
