import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Bell, CheckCheck, MessageSquare, FileText, Scale, Newspaper, Gift, Info } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { Notification } from '@/types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

function getNotifIcon(type?: string) {
  switch (type) {
    case 'chat': case 'message': case 'broadcast': return MessageSquare;
    case 'lead': case 'leads': return FileText;
    case 'legal': case 'lawyer': return Scale;
    case 'news': return Newspaper;
    case 'giveaway': return Gift;
    default: return Info;
  }
}

function getNotifRoute(type?: string): string | null {
  switch (type) {
    case 'chat': case 'message': case 'broadcast': return '/(tabs)/chats';
    case 'lead': case 'leads': return '/leads';
    case 'legal': case 'lawyer': return '/legal-requests';
    case 'news': return '/notifications';
    case 'giveaway': return '/notifications';
    case 'announcement': return '/notifications';
    default: return null;
  }
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [optimisticReadIds, setOptimisticReadIds] = useState<string[]>([]);

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => api.markNotificationsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications: Notification[] = useMemo(() => {
    if (Array.isArray(notifQuery.data)) return notifQuery.data;
    return [];
  }, [notifQuery.data]);

  const visibleNotifications = useMemo(
    () => notifications.map((n) => optimisticReadIds.includes(n.id) ? { ...n, read: true } : n),
    [notifications, optimisticReadIds]
  );

  const unreadIds = useMemo(
    () => visibleNotifications.filter((n) => !n.read).map((n) => n.id),
    [visibleNotifications]
  );

  const markAllRead = useCallback(() => {
    if (unreadIds.length > 0) {
      setOptimisticReadIds((prev) => Array.from(new Set([...prev, ...unreadIds])));
      markReadMutation.mutate(unreadIds);
    }
  }, [unreadIds, markReadMutation]);

  const handlePress = useCallback((item: Notification) => {
    // Mark as read
    if (!item.read) {
      setOptimisticReadIds((prev) => Array.from(new Set([...prev, item.id])));
      markReadMutation.mutate([item.id]);
    }

    // Navigate to relevant section
    const route = getNotifRoute(item.type);
    if (route && route !== '/notifications') {
      router.push(route as any);
    }
  }, [markReadMutation, router]);

  const renderItem = useCallback(({ item }: { item: Notification }) => {
    const Icon = getNotifIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
          <Icon color={!item.read ? Colors.primary : Colors.textMuted} size={18} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]} numberOfLines={1}>{item.title}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handlePress]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Уведомления',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerRight: () =>
            unreadIds.length > 0 ? (
              <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
                <CheckCheck color={Colors.primary} size={20} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={visibleNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={notifQuery.isFetching}
            onRefresh={() => void notifQuery.refetch()}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Bell color={Colors.textMuted} size={40} />
            </View>
            <Text style={styles.emptyTitle}>Нет уведомлений</Text>
            <Text style={styles.emptyText}>Новые уведомления появятся здесь</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  markAllButton: {
    marginRight: 4,
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  notifUnread: {
    backgroundColor: Colors.unreadBg,
    borderColor: 'rgba(59,130,246,0.15)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapUnread: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  notifContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  notifMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
