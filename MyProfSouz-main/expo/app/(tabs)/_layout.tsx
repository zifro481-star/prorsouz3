import { Tabs } from 'expo-router';
import { Home, MessageSquare, Bot, Users, User } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';

function AIChatIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={[styles.aiButton, focused && styles.aiButtonActive]}>
      <Bot color={focused ? Colors.white : color} size={18} />
    </View>
  );
}

function ChatIcon({ color }: { color: string }) {
  const directChatsQuery = useQuery({
    queryKey: ['direct-chats'],
    queryFn: async () => {
      try {
        const data = await api.getDirectChats();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const data = await api.getConversations();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const unreadCount = useMemo(() => {
    let count = 0;
    if (Array.isArray(directChatsQuery.data)) {
      count += directChatsQuery.data.reduce((sum: number, c: any) => sum + (Number(c.unreadCount) || 0), 0);
    }
    if (Array.isArray(conversationsQuery.data)) {
      count += conversationsQuery.data.reduce((sum: number, c: any) => sum + (Number(c.unreadCount) || 0), 0);
    }
    return count;
  }, [directChatsQuery.data, conversationsQuery.data]);

  return (
    <View>
      <MessageSquare color={color} size={22} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.cardBorder,
          borderTopWidth: 1,
            ...(Platform.OS === 'web' ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Чаты',
          tabBarIcon: ({ color }) => <ChatIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'ИИ-чат',
          tabBarIcon: ({ color, focused }) => <AIChatIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="union"
        options={{
          title: 'Профсоюз',
          tabBarIcon: ({ color }) => <Users color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  aiButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
