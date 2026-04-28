import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import { addLocalInboxNotification, registerForPushNotifications } from '@/services/notifications';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'forgot-password';

    if (!isAuthenticated && !inAuth) {
      router.replace('/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/' as any);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) return <LoadingScreen />;
  return null;
}

function RootLayoutNav() {
  const { colors, theme, themeKey } = useTheme();
  return (
    <>
      <AuthGate />
      <StatusBar style="dark" />
      <Stack
        key={`stack-${themeKey}`}
        screenOptions={{
          headerBackTitle: 'Назад',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: 'Уведомления' }} />
        <Stack.Screen name="news-detail" options={{ title: 'Новость' }} />
        <Stack.Screen name="leads" options={{ title: 'Вопрос руководителю' }} />
        <Stack.Screen name="legal-requests" options={{ title: 'Вопрос юристу' }} />
        <Stack.Screen name="chat-room" options={{ title: 'Чат' }} />
        <Stack.Screen name="partners" options={{ title: 'Партнёры' }} />
        <Stack.Screen name="surveys" options={{ title: 'Опросы' }} />
        <Stack.Screen name="survey-detail" options={{ title: 'Опрос' }} />
        <Stack.Screen name="learning" options={{ title: 'Обучение' }} />
        <Stack.Screen name="learning-module" options={{ title: 'Модуль' }} />
        <Stack.Screen name="lesson-detail" options={{ title: 'Урок' }} />
        <Stack.Screen name="agreements" options={{ title: 'Соглашения' }} />
        <Stack.Screen name="event-detail" options={{ title: 'Мероприятие' }} />
        <Stack.Screen name="leader-panel" options={{ title: 'Панель руководителя' }} />
        <Stack.Screen name="manager-news" options={{ title: 'Управление новостями' }} />
        <Stack.Screen name="manager-events" options={{ title: 'Управление мероприятиями' }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
    void registerForPushNotifications();

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      void addLocalInboxNotification({
        id: notification.request.identifier,
        title: content.title,
        message: content.body,
        type: String(content.data?.type || 'announcement'),
      }).then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }));
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const content = response.notification.request.content;
      void addLocalInboxNotification({
        id: response.notification.request.identifier,
        title: content.title,
        message: content.body,
        type: String(content.data?.type || 'announcement'),
      }).then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }));
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
