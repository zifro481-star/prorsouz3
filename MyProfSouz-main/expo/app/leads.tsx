import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Send, AlertTriangle, Lightbulb, Clock } from 'lucide-react-native';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { Lead } from '@/types';

type TabKey = 'active' | 'closed' | 'all';

const REQUEST_TYPES = [
  { value: 'complaint', label: 'Жалоба', icon: AlertTriangle, color: Colors.error },
  { value: 'initiative', label: 'Инициатива', icon: Lightbulb, color: Colors.warning },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
    case 'open':
      return { label: 'Активно', color: Colors.primary, bg: 'rgba(59,130,246,0.12)' };
    case 'resolved':
    case 'closed':
      return { label: 'Завершено', color: Colors.success, bg: 'rgba(34,197,94,0.12)' };
    case 'in_progress':
      return { label: 'В работе', color: Colors.warning, bg: 'rgba(245,158,11,0.12)' };
    default:
      return { label: status, color: Colors.textMuted, bg: 'rgba(113,113,122,0.12)' };
  }
}

function getTypeBadge(type?: string) {
  if (type === 'complaint') return { label: 'Жалоба', color: Colors.error, bg: 'rgba(239,68,68,0.12)' };
  if (type === 'initiative') return { label: 'Инициатива', color: Colors.warning, bg: 'rgba(245,158,11,0.12)' };
  return { label: 'Обращение', color: Colors.textSecondary, bg: 'rgba(161,161,170,0.12)' };
}

export default function LeadsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [description, setDescription] = useState('');
  const [requestType, setRequestType] = useState('complaint');
  const [showForm, setShowForm] = useState(true);

  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.getLeads(),
  });

  const createMutation = useMutation({
    mutationFn: (data: { description: string; requestType: string }) => api.createLead(data),
    onSuccess: () => {
      setDescription('');
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      Alert.alert('Готово', 'Обращение отправлено');
    },
    onError: (err: Error) => {
      Alert.alert('Ошибка', err.message || 'Не удалось отправить обращение');
    },
  });

  const handleSubmit = useCallback(() => {
    if (!description.trim()) {
      Alert.alert('Внимание', 'Опишите ваше обращение');
      return;
    }
    createMutation.mutate({ description: description.trim(), requestType });
  }, [description, requestType, createMutation]);

  const leads: Lead[] = useMemo(() => {
    if (!Array.isArray(leadsQuery.data)) return [];
    return leadsQuery.data;
  }, [leadsQuery.data]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return leads;
    if (activeTab === 'active') return leads.filter(l => l.status === 'active' || l.status === 'open' || l.status === 'in_progress');
    return leads.filter(l => l.status === 'resolved' || l.status === 'closed');
  }, [leads, activeTab]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'active', label: 'Активные' },
    { key: 'closed', label: 'Завершённые' },
    { key: 'all', label: 'Все' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Вопрос руководителю', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={leadsQuery.isFetching} onRefresh={() => void leadsQuery.refetch()} tintColor={Colors.primary} />
        }
      >
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Новое обращение</Text>

            <Text style={styles.label}>Тип обращения</Text>
            <View style={styles.typeRow}>
              {REQUEST_TYPES.map(t => {
                const Icon = t.icon;
                const selected = requestType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.typeChip, selected && { borderColor: t.color, backgroundColor: `${t.color}15` }]}
                    onPress={() => setRequestType(t.value)}
                    activeOpacity={0.7}
                  >
                    <Icon color={selected ? t.color : Colors.textMuted} size={16} />
                    <Text style={[styles.typeChipText, selected && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Опишите вашу жалобу или инициативу..."
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
            <FileText color={Colors.primary} size={18} />
            <Text style={styles.showFormText}>Новое обращение</Text>
          </TouchableOpacity>
        )}

        <View style={styles.tabsRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 && !leadsQuery.isLoading && (
          <View style={styles.emptyState}>
            <FileText color={Colors.textMuted} size={40} />
            <Text style={styles.emptyText}>Нет обращений</Text>
          </View>
        )}

        {filtered.map(lead => {
          const statusBadge = getStatusBadge(lead.status);
          const typeBadge = getTypeBadge(lead.requestType);
          return (
            <View key={lead.id} style={styles.leadCard}>
              <View style={styles.leadHeader}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: typeBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: typeBadge.color }]}>{typeBadge.label}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.leadDescription} numberOfLines={3}>
                {lead.description || lead.title || 'Без описания'}
              </Text>
              <View style={styles.leadFooter}>
                <Clock color={Colors.textMuted} size={13} />
                <Text style={styles.leadDate}>
                  {new Date(lead.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </View>
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
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surface,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
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
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
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
  leadCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  leadHeader: {
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  leadDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  leadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadDate: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
