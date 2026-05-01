import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Archive, Image as ImageIcon, Pencil, Pin, Video } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { NewsItem } from '@/types';

type StatusFilter = 'all' | 'draft' | 'published' | 'archive';
type MediaType = 'none' | 'image' | 'video';
type ManagedNews = NewsItem & { status?: string; pinned?: boolean; mediaUrl?: string; mediaType?: MediaType };

type NewsDraft = {
  id?: string;
  title: string;
  summary: string;
  content: string;
  mediaType: MediaType;
  mediaUrl: string;
  pinned: boolean;
};

const emptyDraft: NewsDraft = {
  title: '',
  summary: '',
  content: '',
  mediaType: 'none',
  mediaUrl: '',
  pinned: false,
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'draft', label: 'Черновик' },
  { key: 'published', label: 'Опубликовано' },
  { key: 'archive', label: 'Архив' },
];

function getStatus(item: ManagedNews): StatusFilter {
  const status = String(item.status || '').toLowerCase();
  if (status === 'draft') return 'draft';
  if (status === 'archive' || status === 'archived') return 'archive';
  return 'published';
}

function getNewsId(item: ManagedNews): string {
  return String((item as any).id ?? (item as any)._id ?? (item as any).newsId ?? '');
}

export default function ManagerNewsScreen() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<NewsDraft>(emptyDraft);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const newsQuery = useQuery({
    queryKey: ['news'],
    queryFn: () => api.getNews(),
  });

  const news = useMemo(() => Array.isArray(newsQuery.data) ? newsQuery.data as ManagedNews[] : [], [newsQuery.data]);
  const filteredNews = useMemo(
    () => activeFilter === 'all' ? news : news.filter((item) => getStatus(item) === activeFilter),
    [activeFilter, news]
  );

  const saveMutation = useMutation({
    mutationFn: ({ data, status }: { data: NewsDraft; status: 'draft' | 'published' }) => {
      const payload = {
        title: data.title.trim(),
        summary: data.summary.trim(),
        content: data.content.trim(),
        imageUrl: data.mediaType === 'image' ? data.mediaUrl.trim() || undefined : undefined,
        mediaUrl: data.mediaType !== 'none' ? data.mediaUrl.trim() || undefined : undefined,
        mediaType: data.mediaType,
        pinned: data.pinned,
        status,
      } as Partial<ManagedNews>;
      return data.id ? api.updateNews(data.id, payload) : api.createNews(payload);
    },
    onSuccess: async () => {
      setDraft(emptyDraft);
      await queryClient.invalidateQueries({ queryKey: ['news'] });
      Alert.alert('Готово', 'Новость сохранена');
    },
    onError: (error: Error) => Alert.alert('Ошибка', error.message || 'Не удалось сохранить новость'),
  });

  const archiveMutation = useMutation({
    mutationFn: (item: ManagedNews) => api.archiveNews(item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news'] }),
    onError: (error: Error) => Alert.alert('Ошибка', error.message || 'Не удалось перенести новость в архив'),
  });

  const startEdit = useCallback((item: ManagedNews) => {
    setDraft({
      id: getNewsId(item),
      title: item.title ?? '',
      summary: item.summary ?? '',
      content: item.content ?? '',
      mediaType: item.mediaType || (item.imageUrl ? 'image' : 'none'),
      mediaUrl: item.mediaUrl || item.imageUrl || '',
      pinned: Boolean(item.pinned),
    });
  }, []);

  const handleSave = useCallback((status: 'draft' | 'published') => {
    if (!draft.title.trim() || !draft.content.trim()) {
      Alert.alert('Заполните поля', 'Заголовок и текст новости обязательны');
      return;
    }
    saveMutation.mutate({ data: draft, status });
  }, [draft, saveMutation]);

  const setField = useCallback(<K extends keyof NewsDraft>(key: K, value: NewsDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Новости (управление)', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={newsQuery.isFetching} onRefresh={() => void newsQuery.refetch()} tintColor={Colors.primary} />}
      >
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{draft.id ? 'Редактировать новость' : 'Создать новость'}</Text>
          <TextInput style={styles.input} placeholder="Заголовок *" placeholderTextColor={Colors.textMuted} value={draft.title} onChangeText={(value) => setField('title', value)} />
          <TextInput style={styles.input} placeholder="Краткое описание" placeholderTextColor={Colors.textMuted} value={draft.summary} onChangeText={(value) => setField('summary', value)} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Текст новости *" placeholderTextColor={Colors.textMuted} value={draft.content} onChangeText={(value) => setField('content', value)} multiline textAlignVertical="top" />

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

          <TouchableOpacity style={styles.pinRow} onPress={() => setField('pinned', !draft.pinned)}>
            <Pin color={draft.pinned ? Colors.primary : Colors.textMuted} size={18} />
            <Text style={[styles.pinText, draft.pinned && { color: Colors.primary }]}>Закрепить новость</Text>
          </TouchableOpacity>

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

        {newsQuery.isLoading ? <ActivityIndicator color={Colors.primary} size="large" /> : null}
        {!newsQuery.isLoading && filteredNews.length === 0 ? <Text style={styles.empty}>Новостей пока нет</Text> : null}
        {filteredNews.map((item) => {
          const status = getStatus(item);
          const isArchiving = archiveMutation.isPending && getNewsId(archiveMutation.variables as ManagedNews) === getNewsId(item);
          return (
            <View key={getNewsId(item)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <View style={[styles.statusBadge, status === 'archive' && styles.archiveBadge, status === 'draft' && styles.draftBadge]}>
                  <Text style={[styles.statusText, status === 'archive' && styles.archiveText, status === 'draft' && styles.draftText]}>
                    {status === 'archive' ? 'Архив' : status === 'draft' ? 'Черновик' : 'Опубликовано'}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardText} numberOfLines={3}>{item.summary || item.content}</Text>
              {item.imageUrl || item.mediaUrl ? <Text style={styles.mediaText}>Медиа: {item.mediaUrl || item.imageUrl}</Text> : null}
              {item.pinned ? <Text style={styles.pinnedText}>Закреплено</Text> : null}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editButton} onPress={() => startEdit(item)}>
                  <Pencil color={Colors.primary} size={17} />
                  <Text style={styles.editButtonText}>Редактировать</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.archiveButton} onPress={() => archiveMutation.mutate(item)} disabled={isArchiving}>
                  {isArchiving ? <ActivityIndicator color={Colors.error} size="small" /> : <Archive color={Colors.error} size={17} />}
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
  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  segment: { flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' as const },
  segmentTextActive: { color: Colors.white },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  pinText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' as const },
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
  mediaText: { color: Colors.textMuted, fontSize: 12, marginTop: 10 },
  pinnedText: { color: Colors.primary, fontSize: 13, fontWeight: '700' as const, marginTop: 10 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editButton: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', backgroundColor: 'rgba(59,130,246,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  editButtonText: { color: Colors.primary, fontSize: 13, fontWeight: '700' as const },
  archiveButton: { minWidth: 124, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  archiveButtonText: { color: Colors.error, fontSize: 13, fontWeight: '700' as const },
});
