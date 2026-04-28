import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { CalendarClock, Image as ImageIcon, Pencil, Trash2, Video } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { UnionEvent } from '@/types';

type StatusFilter = 'all' | 'draft' | 'published' | 'archive';
type MediaType = 'none' | 'image' | 'video';
type ManagedEvent = UnionEvent & { status?: string; mediaUrl?: string; mediaType?: MediaType; summary?: string };

type EventDraft = {
  id?: string;
  title: string;
  summary: string;
  description: string;
  date: string;
  mediaType: MediaType;
  mediaUrl: string;
};

const emptyDraft: EventDraft = {
  title: '',
  summary: '',
  description: '',
  date: '',
  mediaType: 'none',
  mediaUrl: '',
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'draft', label: 'Черновик' },
  { key: 'published', label: 'Опубликовано' },
  { key: 'archive', label: 'Архив' },
];

function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getStatus(item: ManagedEvent): StatusFilter {
  const status = String(item.status || '').toLowerCase();
  if (status === 'draft') return 'draft';
  if (status === 'archive' || status === 'archived') return 'archive';
  return 'published';
}

export default function ManagerEventsScreen() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const eventsQuery = useQuery({
    queryKey: ['union-events'],
    queryFn: () => api.getUnionEvents(),
  });

  const events = useMemo(() => Array.isArray(eventsQuery.data) ? eventsQuery.data as ManagedEvent[] : [], [eventsQuery.data]);
  const filteredEvents = useMemo(
    () => activeFilter === 'all' ? events : events.filter((item) => getStatus(item) === activeFilter),
    [activeFilter, events]
  );

  const saveMutation = useMutation({
    mutationFn: ({ data, status }: { data: EventDraft; status: 'draft' | 'published' }) => {
      const payload = {
        title: data.title.trim(),
        summary: data.summary.trim(),
        description: data.summary.trim(),
        content: data.description.trim(),
        date: data.date.trim() || undefined,
        imageUrl: data.mediaType === 'image' ? data.mediaUrl.trim() || undefined : undefined,
        mediaUrl: data.mediaType !== 'none' ? data.mediaUrl.trim() || undefined : undefined,
        mediaType: data.mediaType,
        status,
      } as Partial<ManagedEvent>;
      return data.id ? api.updateUnionEvent(data.id, payload) : api.createUnionEvent(payload);
    },
    onSuccess: async () => {
      setDraft(emptyDraft);
      await queryClient.invalidateQueries({ queryKey: ['union-events'] });
      Alert.alert('Готово', 'Мероприятие сохранено');
    },
    onError: (error: Error) => Alert.alert('Ошибка', error.message || 'Не удалось сохранить мероприятие'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.updateUnionEvent(id, { status: 'archive' } as Partial<ManagedEvent>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['union-events'] }),
    onError: (error: Error) => Alert.alert('Ошибка', error.message || 'Не удалось перенести мероприятие в архив'),
  });

  const startEdit = useCallback((item: ManagedEvent) => {
    setDraft({
      id: item.id,
      title: item.title ?? '',
      summary: item.summary || item.description || '',
      description: item.content || item.description || '',
      date: item.date ?? '',
      mediaType: item.mediaType || (item.imageUrl ? 'image' : 'none'),
      mediaUrl: item.mediaUrl || item.imageUrl || '',
    });
  }, []);

  const handleSave = useCallback((status: 'draft' | 'published') => {
    if (!draft.title.trim() || !draft.description.trim()) {
      Alert.alert('Заполните поля', 'Заголовок и описание мероприятия обязательны');
      return;
    }
    saveMutation.mutate({ data: draft, status });
  }, [draft, saveMutation]);

  const setField = useCallback(<K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Мероприятия (управление)', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={eventsQuery.isFetching} onRefresh={() => void eventsQuery.refetch()} tintColor={Colors.primary} />}
      >
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{draft.id ? 'Редактировать мероприятие' : 'Создать мероприятие'}</Text>
          <TextInput style={styles.input} placeholder="Заголовок *" placeholderTextColor={Colors.textMuted} value={draft.title} onChangeText={(value) => setField('title', value)} />
          <TextInput style={styles.input} placeholder="Краткое описание" placeholderTextColor={Colors.textMuted} value={draft.summary} onChangeText={(value) => setField('summary', value)} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Описание мероприятия *" placeholderTextColor={Colors.textMuted} value={draft.description} onChangeText={(value) => setField('description', value)} multiline textAlignVertical="top" />

          <Text style={styles.label}>Дата проведения</Text>
          <TextInput style={styles.input} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor={Colors.textMuted} value={draft.date} onChangeText={(value) => setField('date', value)} />
          <View style={styles.quickDateRow}>
            <TouchableOpacity style={styles.quickDateButton} onPress={() => setField('date', toDateInput(new Date()))}>
              <Text style={styles.quickDateText}>Сейчас</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickDateButton} onPress={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(12, 0, 0, 0);
              setField('date', toDateInput(tomorrow));
            }}>
              <Text style={styles.quickDateText}>Завтра 12:00</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Медиа</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity style={[styles.segment, draft.mediaType === 'none' && styles.segmentActive]} onPress={() => setField('mediaType', 'none')}>
              <Text style={[styles.segmentText, draft.mediaType === 'none' && styles.segmentTextActive]}>Нет</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segment, draft.mediaType === 'image' && styles.segmentActive]} onPress={() => setField('mediaType', 'image')}>
              <ImageIcon color={draft.mediaType === 'image' ? Colors.white : Colors.textMuted} size={16} />
              <Text style={[styles.segmentText, draft.mediaType === 'image' && styles.segmentTextActive]}>Изображение</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.segment, draft.mediaType === 'video' && styles.segmentActive]} onPress={() => setField('mediaType', 'video')}>
              <Video color={draft.mediaType === 'video' ? Colors.white : Colors.textMuted} size={16} />
              <Text style={[styles.segmentText, draft.mediaType === 'video' && styles.segmentTextActive]}>Видео</Text>
            </TouchableOpacity>
          </View>
          {draft.mediaType !== 'none' && (
            <TextInput style={styles.input} placeholder="Ссылка на медиа" placeholderTextColor={Colors.textMuted} value={draft.mediaUrl} onChangeText={(value) => setField('mediaUrl', value)} />
          )}

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.draftButton} onPress={() => handleSave('draft')} disabled={saveMutation.isPending}>
              <Text style={styles.draftButtonText}>Сохранить черновик</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.publishButton} onPress={() => handleSave('published')} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.publishButtonText}>Опубликовать</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((filter) => (
            <TouchableOpacity key={filter.key} style={[styles.filterChip, activeFilter === filter.key && styles.filterChipActive]} onPress={() => setActiveFilter(filter.key)}>
              <Text style={[styles.filterText, activeFilter === filter.key && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {eventsQuery.isLoading ? <ActivityIndicator color={Colors.primary} size="large" /> : null}
        {!eventsQuery.isLoading && filteredEvents.length === 0 ? <Text style={styles.empty}>Мероприятий пока нет</Text> : null}
        {filteredEvents.map((item) => {
          const status = getStatus(item);
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={[styles.statusBadge, status === 'archive' && styles.archiveBadge, status === 'draft' && styles.draftBadge]}>
                  <Text style={[styles.statusText, status === 'archive' && styles.archiveText, status === 'draft' && styles.draftText]}>
                    {status === 'archive' ? 'Архив' : status === 'draft' ? 'Черновик' : 'Опубликовано'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardText} numberOfLines={2}>{item.summary || item.description}</Text>
              <Text style={styles.cardText} numberOfLines={3}>{item.content || item.description}</Text>
              {item.date ? <Text style={styles.dateText}>Дата: {item.date}</Text> : null}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editButton} onPress={() => startEdit(item)}>
                  <Pencil color={Colors.primary} size={17} />
                  <Text style={styles.editButtonText}>Редактировать</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.archiveButton} onPress={() => archiveMutation.mutate(item.id)}>
                  <Trash2 color={Colors.error} size={17} />
                  <Text style={styles.archiveButtonText}>В архив</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20, paddingTop: 12, gap: 12 },
  formCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  formTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' as const, marginBottom: 14 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15, marginBottom: 12 },
  textArea: { minHeight: 126 },
  label: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' as const, marginBottom: 8 },
  quickDateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickDateButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  quickDateText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' as const },
  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  segment: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' as const },
  segmentTextActive: { color: Colors.white },
  formActions: { flexDirection: 'row', gap: 10 },
  draftButton: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  draftButtonText: { color: Colors.text, fontSize: 15, fontWeight: '700' as const },
  publishButton: { flex: 1, minHeight: 52, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  publishButtonText: { color: Colors.white, fontSize: 15, fontWeight: '700' as const },
  filters: { gap: 10, paddingVertical: 4 },
  filterChip: { minHeight: 42, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' as const },
  filterTextActive: { color: Colors.white },
  empty: { color: Colors.textMuted, textAlign: 'center' as const, marginTop: 24 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '700' as const },
  statusBadge: { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  archiveBadge: { backgroundColor: Colors.surface },
  draftBadge: { backgroundColor: 'rgba(245,158,11,0.12)' },
  statusText: { color: Colors.success, fontSize: 12, fontWeight: '700' as const },
  archiveText: { color: Colors.textMuted },
  draftText: { color: Colors.warning },
  cardText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 10 },
  dateText: { color: Colors.textMuted, fontSize: 13, marginTop: 10 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editButton: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', backgroundColor: 'rgba(59,130,246,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editButtonText: { color: Colors.primary, fontSize: 13, fontWeight: '700' as const },
  archiveButton: { minWidth: 124, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  archiveButtonText: { color: Colors.error, fontSize: 13, fontWeight: '700' as const },
});
