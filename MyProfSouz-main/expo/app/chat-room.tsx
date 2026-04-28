import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { ChatMessage } from '@/types';

export default function ChatRoomScreen() {
  const { chatId, chatType, name } = useLocalSearchParams<{ chatId: string; chatType: string; name: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const isConversation = chatType === 'conversation';

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', chatType, chatId],
    queryFn: () => isConversation
      ? api.getConversationMessages(chatId ?? '')
      : api.getDirectChatMessages(chatId ?? ''),
    enabled: !!chatId,
    refetchInterval: 2000,
  });

  const messages: ChatMessage[] = useMemo(() => {
    const data = messagesQuery.data;
    if (data && Array.isArray(data.messages)) return data.messages;
    if (Array.isArray(data)) return data as unknown as ChatMessage[];
    return [];
  }, [messagesQuery.data]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => isConversation
      ? api.sendConversationMessage(chatId ?? '', msg)
      : api.sendDirectMessage(chatId ?? '', msg),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', chatType, chatId] });
      void queryClient.invalidateQueries({ queryKey: ['direct-chats'] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    setText('');
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Get agentId from profile for matching senderId in conversations
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
    staleTime: 60000,
  });
  const agentId = (profileQuery.data as any)?.agentId;

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const msg = item as any;
    let isMe = false;

    if (isConversation) {
      // Conversation messages use sender_type: 'agent' | 'manager'
      isMe = msg.senderType === 'agent';
    } else {
      // Direct messages use senderId (UUID)
      isMe = msg.senderId === user?.id || msg.senderId === agentId;
    }

    return (
      <View style={[styles.messageBubbleRow, isMe ? styles.messageRight : styles.messageLeft]}>
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>{msg.text || msg.content || ''}</Text>
          <Text style={[styles.messageTime, isMe ? styles.myTime : styles.theirTime]}>
            {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [user?.id, agentId, isConversation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <Stack.Screen options={{ title: name ?? 'Чат', headerTitleStyle: { fontWeight: '700' } }} />

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, idx) => item.id ?? `msg-${idx}`}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          messagesQuery.isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Нет сообщений</Text>
              <Text style={styles.emptySubtext}>Начните переписку</Text>
            </View>
          )
        }
      />

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Сообщение..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          activeOpacity={0.7}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Send color={Colors.white} size={18} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubbleRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  messageRight: {
    justifyContent: 'flex-end',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: Colors.white,
  },
  theirText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTime: {
    color: 'rgba(255,255,255,0.6)',
  },
  theirTime: {
    color: Colors.textMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
