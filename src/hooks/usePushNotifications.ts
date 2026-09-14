import { useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import client from '../api/client';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo && Platform.OS !== 'web') {
    try {
        Notifications = require('expo-notifications');
        Notifications?.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    } catch (e) {
        console.warn('Push notifications module not available:', e);
    }
}

async function registerForPushNotificationsAsync() {
    if (isExpoGo || Platform.OS === 'web' || !Notifications) {
        console.log('Skipping push notification registration in Expo Go or Web');
        return;
    }

    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }

            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

            if (!projectId) {
                console.log('No projectId found in app config. Skipping token registration.');
                return;
            }

            const pushTokenString = (
                await Notifications.getExpoPushTokenAsync({
                    projectId,
                })
            ).data;
            return pushTokenString;
        } else {
            console.log('Must use physical device for Push Notifications');
        }
    } catch (e: unknown) {
        console.warn('Push notifications: Failed to register push token.', e);
    }
}

export const usePushNotifications = () => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');

    const registerToken = async () => {
        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                setExpoPushToken(token);
                await client.post('device-tokens/register/', {
                    token: token,
                    platform: Platform.OS
                });
                console.log('Push token registered successfully:', token);
            }
        } catch (error) {
            console.error('Error registering push token on backend:', error);
        }
    };

    return { registerToken, expoPushToken };
};


