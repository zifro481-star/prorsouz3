import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, Users, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation } from '@tanstack/react-query';

import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { DirectChat, Conversation } from '@/types';

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffHours < 48) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

interface ColleagueItem {
  id: string;
  fullName: string;
  email?: string;
  agentId?: string;
  profession?: string;
  divisionName?: string;
}

interface ColleaguesResponse {
  managerId?: string;
  managerName?: string;
  colleagues?: ColleagueItem[];
}

interface AgentItem {
  id: string;
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  profession?: string;
  divisionName?: string;
  status?: string;
  memberNumber?: string;
}

const HIDDEN_CHATS_KEY = 'hidden_chats';

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hiddenChatIds, setHiddenChatIds] = useState<string[]>([]);

  // Load hidden chats from storage
  React.useEffect(() => {
    AsyncStorage.getItem(HIDDEN_CHATS_KEY).then(val => {
      if (val) setHiddenChatIds(JSON.parse(val));
    });
  }, []);

  const hideChat = useCallback((chatId: string, chatName: string) => {
    Alert.alert('Удалить чат?', `Чат с "${chatName}" будет скрыт с вашего устройства.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          const updated = [...hiddenChatIds, chatId];
          setHiddenChatIds(updated);
          await AsyncStorage.setItem(HIDDEN_CHATS_KEY, JSON.stringify(updated));
        },
      },
    ]);
  }, [hiddenChatIds]);

  // Get role from profile API (most reliable)
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try { return await api.getProfile(); } catch { return null; }
    },
  });
  const isLeader = profileQuery.data?.role === 'leader' || profileQuery.data?.role === 'manager';

  // --- Leader: load agents (their members) ---
  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      try {
        const data = await api.getAgents();
        return Array.isArray(data) ? data as AgentItem[] : [];
      } catch {
        return [];
      }
    },
    enabled: isLeader,
  });

  // --- Member: load colleagues ---
  const colleaguesQuery = useQuery({
    queryKey: ['colleagues'],
    queryFn: async () => {
      try {
        const data = await api.getColleagues();
        if (Array.isArray(data)) {
          return { colleagues: data } as ColleaguesResponse;
        }
        return data as ColleaguesResponse;
      } catch {
        return { colleagues: [] } as ColleaguesResponse;
      }
    },
    enabled: !isLeader && !profileQuery.isLoading,
  });

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
    enabled: !isLeader && !profileQuery.isLoading,
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
  });

  const createChatMutation = useMutation({
    mutationFn: (args: { recipientId: string; name: string }) => api.createDirectChat(args.recipientId),
    onSuccess: (result: any, variables) => {
      const chatId = result?.chatId || result?.id;
      if (chatId) {
        router.push({ pathname: '/chat-room', params: { chatId, chatType: 'direct', name: variables.name } });
        void directChatsQuery.refetch();
      }
    },
    onError: (error: Error) => Alert.alert('Ошибка', error.message || 'Не удалось создать чат'),
  });

  const createConversationMutation = useMutation({
    mutationFn: (args: { agentId: string; name: string }) => api.createConversation(args.agentId),
    onSuccess: async (result: any, variables) => {
      let chatId = result?.conversation?.id || result?.conversationId || result?.chatId || result?.id;
      if (!chatId) {
        const refreshed = await conversationsQuery.refetch();
        const conv = Array.isArray(refreshed.data)
          ? refreshed.data.find((c: any) =>
              c.agentId === variables.agentId ||
              c.contactId === variables.agentId ||
              c.participantId === variables.agentId ||
              c.participant?.id === variables.agentId
            )
          : null;
        chatId = conv?.id;
      }
      if (chatId) {
        router.push({ pathname: '/chat-room', params: { chatId, chatType: 'conversation', name: variables.name } });
      } else {
        Alert.alert('Ошибка', 'Чат создан, но не удалось открыть беседу. Обновите список чатов.');
      }
    },
    onError: (error: Error) => Alert.alert('Ошибка', error.message || 'Не удалось создать чат'),
  });

  const agents: AgentItem[] = useMemo(() => agentsQuery.data ?? [], [agentsQuery.data]);

  const managerName = colleaguesQuery.data?.managerName;
  const colleagues: ColleagueItem[] = useMemo(() => {
    return colleaguesQuery.data?.colleagues || [];
  }, [colleaguesQuery.data]);

  const directChats: DirectChat[] = useMemo(() => {
    if (!Array.isArray(directChatsQuery.data)) return [];
    return directChatsQuery.data.filter(c => !hiddenChatIds.includes(c.id));
  }, [directChatsQuery.data, hiddenChatIds]);

  const conversations: Conversation[] = useMemo(() => {
    if (!Array.isArray(conversationsQuery.data)) return [];
    return conversationsQuery.data;
  }, [conversationsQuery.data]);

  const isRefreshing = isLeader
    ? (agentsQuery.isFetching || conversationsQuery.isFetching)
    : (directChatsQuery.isFetching || colleaguesQuery.isFetching || conversationsQuery.isFetching);

  const onRefresh = useCallback(() => {
    void profileQuery.refetch();
    void conversationsQuery.refetch();
    if (isLeader) {
      void agentsQuery.refetch();
    } else {
      void directChatsQuery.refetch();
      void colleaguesQuery.refetch();
    }
  }, [isLeader, profileQuery, agentsQuery, directChatsQuery, colleaguesQuery, conversationsQuery]);

  // --- Leader: press on agent → open conversation ---
  const handleAgentPress = useCallback((agent: AgentItem) => {
    // Find existing conversation for this agent
    const conv = conversations.find((c: any) =>
      c.agentId === agent.id || c.contactId === agent.id || c.participantId === agent.id || c.participant?.id === agent.id
    );
    if (conv) {
      router.push({ pathname: '/chat-room', params: { chatId: conv.id, chatType: 'conversation', name: agent.fullName } });
    } else {
      createConversationMutation.mutate({ agentId: agent.id, name: agent.fullName });
    }
  }, [conversations, createConversationMutation, router]);

  // --- Member: press on colleague ---
  const handleColleaguePress = useCallback((colleague: ColleagueItem) => {
    const existing = directChats.find(c =>
      (c as any).contactId === colleague.id ||
      c.participant?.id === colleague.id ||
      (c as any).contactId === colleague.agentId ||
      c.participant?.id === colleague.agentId
    );
    if (existing) {
      const name = (existing as any).contactName || existing.participant?.fullName || colleague.fullName;
      router.push({ pathname: '/chat-room', params: { chatId: existing.id, chatType: 'direct', name } });
    } else {
      createChatMutation.mutate({ recipientId: colleague.id, name: colleague.fullName });
    }
  }, [directChats, router, createChatMutation]);

  const handleDirectChatPress = useCallback((chat: DirectChat) => {
    const name = (chat as any).contactName || chat.participant?.fullName || 'Чат';
    router.push({ pathname: '/chat-room', params: { chatId: chat.id, chatType: 'direct', name } });
  }, [router]);

  const handleManagerPress = useCallback(() => {
    if (conversations.length > 0) {
      const conv = conversations[0];
      const name = (conv as any).managerName || managerName || 'Руководитель';
      router.push({ pathname: '/chat-room', params: { chatId: conv.id, chatType: 'conversation', name } });
    }
  }, [conversations, managerName, router]);

  // Colleagues that DON'T have an existing direct chat
  const colleaguesWithoutChat = useMemo(() => {
    return colleagues.filter(c => {
      return !directChats.some(dc =>
        (dc as any).contactId === c.id ||
        dc.participant?.id === c.id ||
        (dc as any).contactId === c.agentId ||
        dc.participant?.id === c.agentId
      );
    });
  }, [colleagues, directChats]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={styles.headerTitle}>Чаты</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {profileQuery.isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}

        {!profileQuery.isLoading && isLeader ? (
          <>
            {/* ===== LEADER VIEW: show assigned members ===== */}
            {agents.length > 0 && (
              <Text style={styles.sectionTitle}>Мои участники</Text>
            )}

            {agents.map(agent => {
              const conv = conversations.find((c: any) =>
                c.agentId === agent.id || c.contactId === agent.id || c.participantId === agent.id
              );
              const lastMsg = (conv as any)?.lastMessageText || (conv as any)?.lastMessage?.text || (conv as any)?.lastMessage;
              const lastTime = (conv as any)?.lastMessageAt || (conv as any)?.lastMessage?.createdAt || (conv as any)?.updatedAt;
              const unread = Number((conv as any)?.unreadCount) || 0;

              return (
                <TouchableOpacity
                  key={agent.id}
                  style={[styles.chatCard, unread > 0 && styles.chatCardUnread]}
                  onPress={() => handleAgentPress(agent)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(agent.fullName)}</Text>
                  </View>
                  <View style={styles.chatInfo}>
                    <View style={styles.chatTopRow}>
                      <Text style={styles.chatName} numberOfLines={1}>{agent.fullName}</Text>
                      {lastTime && <Text style={styles.chatTime}>{formatTime(lastTime)}</Text>}
                    </View>
                    <Text style={styles.chatSubLabel} numberOfLines={1}>
                      {agent.divisionName || agent.profession || 'Участник'}
                    </Text>
                    {lastMsg && typeof lastMsg === 'string' && (
                      <Text style={styles.chatLastMsg} numberOfLines={1}>{lastMsg}</Text>
                    )}
                  </View>
                  {unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{unread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {agents.length === 0 && !agentsQuery.isLoading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Users color={Colors.textMuted} size={40} />
                </View>
                <Text style={styles.emptyTitle}>Нет участников</Text>
                <Text style={styles.emptySubtext}>Закреплённые за вами участники появятся здесь</Text>
              </View>
            )}

            {agentsQuery.isLoading && (
              <View style={styles.loadingState}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            )}
          </>
        ) : !profileQuery.isLoading ? (
          <>
            {/* ===== MEMBER VIEW: manager + colleagues ===== */}
            {/* Manager chat — always on top */}
            {managerName && conversations.length > 0 && (
              <TouchableOpacity
                style={styles.leaderCard}
                onPress={handleManagerPress}
                activeOpacity={0.8}
              >
                <View style={styles.leaderAvatarRing}>
                  <View style={styles.leaderAvatar}>
                    <Text style={styles.avatarTextWhite}>{getInitials(managerName)}</Text>
                  </View>
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatTopRow}>
                    <Text style={styles.chatName} numberOfLines={1}>{managerName}</Text>
                    <Text style={styles.chatTime}>{formatTime((conversations[0] as any)?.lastMessageAt)}</Text>
                  </View>
                  <Text style={styles.leaderLabel}>Руководитель</Text>
                  {(conversations[0] as any)?.lastMessageText && (
                    <Text style={styles.chatLastMsg} numberOfLines={1}>{(conversations[0] as any).lastMessageText}</Text>
                  )}
                </View>
                {Number((conversations[0] as any)?.unreadCount) > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{(conversations[0] as any).unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Section title */}
            {(directChats.length > 0 || colleaguesWithoutChat.length > 0) && (
              <Text style={styles.sectionTitle}>Участники</Text>
            )}

            {/* Existing direct chats */}
            {directChats.map(chat => {
              const name = (chat as any).contactName || chat.participant?.fullName || 'Участник';
              return (
                <TouchableOpacity
                  key={`dc-${chat.id}`}
                  style={styles.chatCard}
                  onPress={() => handleDirectChatPress(chat)}
                  onLongPress={() => hideChat(chat.id, name)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(name)}</Text>
                  </View>
                  <View style={styles.chatInfo}>
                    <View style={styles.chatTopRow}>
                      <Text style={styles.chatName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.chatTime}>{formatTime((chat as any).lastMessageAt || chat.lastMessage?.createdAt)}</Text>
                    </View>
                    <Text style={styles.chatLastMsg} numberOfLines={1}>
                      {(chat as any).lastMessage?.text || (typeof (chat as any).lastMessage === 'string' ? (chat as any).lastMessage : 'Нет сообщений')}
                    </Text>
                  </View>
                  {Number((chat as any).unreadCount) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{(chat as any).unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Colleagues without chat yet */}
            {colleaguesWithoutChat.map(c => (
              <TouchableOpacity
                key={`col-${c.id}`}
                style={styles.chatCard}
                onPress={() => handleColleaguePress(c)}
                activeOpacity={0.8}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(c.fullName)}</Text>
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName} numberOfLines={1}>{c.fullName}</Text>
                  <Text style={styles.chatLastMsg}>{c.divisionName || 'Нажмите, чтобы написать'}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Empty state */}
            {directChats.length === 0 && conversations.length === 0 && colleaguesWithoutChat.length === 0 && !directChatsQuery.isLoading && !colleaguesQuery.isLoading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MessageSquare color={Colors.textMuted} size={40} />
                </View>
                <Text style={styles.emptyTitle}>Нет диалогов</Text>
                <Text style={styles.emptySubtext}>Здесь появятся чаты с руководителем и коллегами</Text>
              </View>
            )}

            {(directChatsQuery.isLoading || colleaguesQuery.isLoading) && (
              <View style={styles.loadingState}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            )}
          </>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {createChatMutation.isPending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
  },
  leaderAvatarRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  avatarText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  avatarTextWhite: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chatLastMsg: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chatSubLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 1,
  },
  chatCardUnread: {
    backgroundColor: 'rgba(59,130,246,0.04)',
    borderColor: 'rgba(59,130,246,0.15)',
  },
  leaderLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
