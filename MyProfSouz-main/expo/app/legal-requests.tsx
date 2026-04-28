import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Scale, Send, ChevronDown, ChevronUp, Clock, MessageSquare } from 'lucide-react-native';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { LegalRequest } from '@/types';
import { LEGAL_CATEGORIES } from '@/types';

type TabKey = 'all' | 'in_progress' | 'answered' | 'closed';

function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
    case 'new':
      return { label: 'Новый', color: Colors.primary, bg: 'rgba(59,130,246,0.12)' };
    case 'in_progress':
      return { label: 'В работе', color: Colors.warning, bg: 'rgba(245,158,11,0.12)' };
    case 'answered':
      return { label: 'Отвечено', color: Colors.success, bg: 'rgba(34,197,94,0.12)' };
    case 'closed':
      return { label: 'Закрыто', color: Colors.textMuted, bg: 'rgba(113,113,122,0.12)' };
    default:
      return { label: status, color: Colors.textMuted, bg: 'rgba(113,113,122,0.12)' };
  }
}

export default function LegalRequestsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('labor_disputes');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: ['legal-requests'],
    queryFn: () => api.getLegalRequests(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { subject: string; category: string; description: string }) =>
      api.createLegalRequest(data),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['legal-requests'] });
      Alert.alert('Готово', 'Вопрос отправлен юристу');
    },
    onError: (err: Error) => {
      Alert.alert('Ошибка', err.message || 'Не удалось отправить');
    },
  });

  const handleSubmit = useCallback(() => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Внимание', 'Заполните тему и описание');
      return;
    }
    createMutation.mutate({ subject: subject.trim(), category, description: description.trim() });
  }, [subject, category, description, createMutation]);

  const requests: LegalRequest[] = useMemo(() => {
    if (!Array.isArray(requestsQuery.data)) return [];
    return requestsQuery.data;
  }, [requestsQuery.data]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return requests;
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'in_progress', label: 'В работе' },
    { key: 'answered', label: 'Отвечено' },
    { key: 'closed', label: 'Закрыто' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Вопрос юристу', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={requestsQuery.isFetching} onRefresh={() => void requestsQuery.refetch()} tintColor={Colors.primary} />
        }
      >
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Новый вопрос юристу</Text>

            <Text style={styles.label}>Тема</Text>
            <TextInput
              style={styles.input}
              placeholder="Краткая тема вопроса"
              placeholderTextColor={Colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.label}>Категория</Text>
            <TouchableOpacity
              style={styles.categoryPicker}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryText}>{LEGAL_CATEGORIES[category] ?? category}</Text>
              <ChevronDown color={Colors.textMuted} size={18} />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.categoryDropdown}>
                {Object.entries(LEGAL_CATEGORIES).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.categoryOption, category === key && styles.categoryOptionActive]}
                    onPress={() => { setCategory(key); setShowCategoryPicker(false); }}
                  >
                    <Text style={[styles.categoryOptionText, category === key && styles.categoryOptionTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Подробно опишите ваш вопрос..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
              activeOpacity={0.8}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Send color={Colors.white} size={18} />
                  <Text style={styles.submitText}>Отправить</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!showForm && (
          <TouchableOpacity style={styles.showFormBtn} onPress={() => setShowForm(true)} activeOpacity={0.7}>
            <Scale color={Colors.primary} size={18} />
            <Text style={styles.showFormText}>Новый вопрос</Text>
          </TouchableOpacity>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScrollContainer} contentContainerStyle={styles.tabsRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 && !requestsQuery.isLoading && (
          <View style={styles.emptyState}>
            <Scale color={Colors.textMuted} size={40} />
            <Text style={styles.emptyText}>Нет вопросов</Text>
          </View>
        )}

        {filtered.map(req => {
          const statusBadge = getStatusBadge(req.status);
          const isExpanded = expandedId === req.id;
          return (
            <TouchableOpacity
              key={req.id}
              style={styles.requestCard}
              onPress={() => setExpandedId(isExpanded ? null : req.id)}
              activeOpacity={0.85}
            >
              <View style={styles.requestHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestSubject} numberOfLines={isExpanded ? undefined : 1}>{req.subject}</Text>
                  <View style={styles.requestMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                    </View>
                    <Text style={styles.categoryLabel}>{LEGAL_CATEGORIES[req.category] ?? req.category}</Text>
                  </View>
                </View>
                {isExpanded ? <ChevronUp color={Colors.textMuted} size={18} /> : <ChevronDown color={Colors.textMuted} size={18} />}
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={styles.requestDescription}>{req.description}</Text>

                  {req.answer && (
                    <View style={styles.answerBlock}>
                      <View style={styles.answerHeader}>
                        <MessageSquare color={Colors.success} size={16} />
                        <Text style={styles.answerTitle}>Ответ юриста</Text>
                      </View>
                      <Text style={styles.answerText}>{req.answer}</Text>
                    </View>
                  )}

                  <View style={styles.requestFooter}>
                    <Clock color={Colors.textMuted} size={13} />
                    <Text style={styles.requestDate}>
                      {new Date(req.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
  },
  categoryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 4,
  },
  categoryText: {
    color: Colors.text,
    fontSize: 15,
  },
  categoryDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  categoryOptionActive: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  categoryOptionText: {
    color: Colors.text,
    fontSize: 14,
  },
  categoryOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  showFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 20,
  },
  showFormText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tabsScrollContainer: {
    marginBottom: 16,
    flexGrow: 0,
  },
  tabsRow: {
    gap: 6,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  requestCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestSubject: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expandedContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  requestDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  answerBlock: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
    marginBottom: 12,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  answerTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.success,
  },
  answerText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
