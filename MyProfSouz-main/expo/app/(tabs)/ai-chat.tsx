import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bot, Send, Sparkles, Scale, BookOpen, FileText } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { AIChatMessage } from '@/types';

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    };
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingRow}>
      <View style={styles.botIconSmall}>
        <Bot color={Colors.primary} size={16} />
      </View>
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const SUGGESTIONS = [
  { icon: Scale, label: 'Трудовое право', prompt: 'Расскажи об основных правах работника по ТК РФ' },
  { icon: BookOpen, label: 'Профсоюз', prompt: 'Что даёт членство в профсоюзе?' },
  { icon: FileText, label: 'Документы', prompt: 'Какие документы нужны для вступления в профсоюз?' },
];

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<DisplayMessage[]>([]);

  const chatQuery = useQuery({
    queryKey: ['ai-chat'],
    queryFn: () => api.getAIChat(),
  });

  const serverMessages: AIChatMessage[] = useMemo(() => {
    if (chatQuery.data && Array.isArray(chatQuery.data.messages)) return chatQuery.data.messages;
    return [];
  }, [chatQuery.data]);

  const displayMessages: DisplayMessage[] = useMemo(() => {
    const fromServer = serverMessages.map((m, i) => ({
      id: `server-${i}`,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
    return [...fromServer, ...optimisticMessages];
  }, [serverMessages, optimisticMessages]);

  const sendMutation = useMutation({
    mutationFn: (message: string) => api.sendAIMessage(message),
    onSuccess: () => {
      setOptimisticMessages([]);
      void queryClient.invalidateQueries({ queryKey: ['ai-chat'] });
    },
    onError: () => {
      setOptimisticMessages(prev => prev.filter(m => m.role !== 'user'));
    },
  });

  const handleSend = useCallback((msg?: string) => {
    const trimmed = (msg ?? text).trim();
    if (!trimmed || sendMutation.isPending) return;
    setText('');

    const optimistic: DisplayMessage = {
      id: `opt-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages([optimistic]);
    sendMutation.mutate(trimmed);
  }, [text, sendMutation]);

  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages.length, sendMutation.isPending]);

  const isEmpty = displayMessages.length === 0 && !chatQuery.isLoading;

  const renderMessage = useCallback(({ item }: { item: DisplayMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubbleRow, isUser ? styles.messageRight : styles.messageLeft]}>
        {!isUser && (
          <View style={styles.botIcon}>
            <Bot color={Colors.primary} size={18} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>{item.content}</Text>
          <Text style={[styles.messageTime, isUser ? styles.userTime : styles.aiTime]}>
            {new Date(item.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Bot color={Colors.primary} size={22} />
        </View>
        <View>
          <Text style={styles.headerTitle}>ИИ-консультант</Text>
          <Text style={styles.headerSubtitle}>Трудовое право и профсоюз</Text>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Sparkles color={Colors.primary} size={48} />
          </View>
          <Text style={styles.emptyTitle}>Добро пожаловать!</Text>
          <Text style={styles.emptyText}>
            Задайте вопрос о трудовых правах, платформе или профсоюзе
          </Text>
          <View style={styles.suggestionsWrap}>
            {SUGGESTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(s.prompt)}
                  activeOpacity={0.7}
                >
                  <Icon color={Colors.primary} size={16} />
                  <Text style={styles.suggestionText}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={sendMutation.isPending ? <TypingIndicator /> : null}
        />
      )}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ИИ-помощник консультирует по трудовому праву и профсоюзной деятельности
        </Text>
      </View>

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Задайте вопрос..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sendMutation.isPending) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -40,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(59,130,246,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  suggestionText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 4,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubbleRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageRight: {
    justifyContent: 'flex-end',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  botIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  botIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userText: {
    color: Colors.white,
  },
  aiText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: 'rgba(255,255,255,0.6)',
  },
  aiTime: {
    color: Colors.textMuted,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
  disclaimer: {
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
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
});
