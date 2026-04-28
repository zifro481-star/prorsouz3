import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { Notification as AppNotification } from '@/types';

const LOCAL_NOTIFICATIONS_KEY = 'local_notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function syncPushTokenWithBackend(token: string): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const authToken = await AsyncStorage.getItem('auth_token');
    if (!authToken) return;

    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `token=${authToken}`,
      'Authorization': `Bearer ${authToken}`,
    };

    const payloads = [
      { token, platform: Platform.OS },
      { pushToken: token, platform: Platform.OS },
      { expoPushToken: token, platform: Platform.OS },
      { token, deviceType: Platform.OS },
      { pushToken: token, deviceType: Platform.OS },
      { expoPushToken: token, deviceType: Platform.OS },
      { token, platform: 'android' },
      { expoPushToken: token, platform: 'android' },
    ];
    const paths = ['/push-token', '/notifications/push-token', '/users/push-token', '/devices/push-token'];

    for (const path of paths) {
      for (const payload of payloads) {
        try {
          const res = await fetch(`https://profsouz.info/api${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });
          if (res.ok) return;
        } catch {}
      }
    }
  } catch {}
}

async function getStoredNotifications(): Promise<AppNotification[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const raw = await AsyncStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setStoredNotifications(items: AppNotification[]): Promise<void> {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(items));
}

export async function addLocalInboxNotification(data: {
  id?: string;
  title?: string | null;
  message?: string | null;
  type?: string;
}): Promise<AppNotification> {
  const items = await getStoredNotifications();
  const id = data.id || `local-notification-${Date.now()}`;
  const item: AppNotification = {
    id,
    title: data.title || 'Уведомление',
    message: data.message || '',
    type: data.type || 'announcement',
    read: false,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...items.filter((n) => n.id !== id)].slice(0, 100);
  await setStoredNotifications(next);
  return item;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Уведомления',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    void syncPushTokenWithBackend(token);

    return token;
  } catch {
    return null;
  }
}

export async function sendLocalNotification(title: string, body: string) {
  await addLocalInboxNotification({ title, message: body, type: 'announcement' });
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: null,
  });
}
