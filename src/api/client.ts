import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';

import Constants from 'expo-constants';

const LOCAL_API_URL = 'http://127.0.0.1:8000/api/v1/';

// Dynamically get the Expo host IP for LAN connections
let hostIp = '192.168.88.201'; // default fallback
if (Constants.expoConfig?.hostUri) {
    const ip = Constants.expoConfig.hostUri.split(':')[0];
    if (ip) {
        hostIp = ip;
    }
}

const LAN_API_URL = `http://${hostIp}:8000/api/v1/`;
// Replace this with your new Railway production URL once deployed (e.g., https://komunity-production.up.railway.app/api/v1/)
const PROD_API_URL = 'https://<your-railway-app>.up.railway.app/api/v1/';

// Force Railway connection instead of local server
const API_BASE_URL = PROD_API_URL;

console.log('[Komunity API] Using base URL:', API_BASE_URL);

const TOKEN_KEY = 'komunity_auth_token';

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
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

export default client;
