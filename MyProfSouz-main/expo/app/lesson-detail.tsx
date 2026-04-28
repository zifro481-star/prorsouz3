import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { LearningLesson } from '@/types';

export default function LessonDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const lessonQuery = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.getLearningLesson(id ?? ''),
    enabled: !!id,
  });

  const completeMutation = useMutation({
    mutationFn: () => api.completeLesson(id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learning-modules'] });
      void queryClient.invalidateQueries({ queryKey: ['lesson', id] });
      Alert.alert('Готово', 'Урок завершён!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert('Ошибка', err.message || 'Не удалось завершить урок');
    },
  });

  const lesson: LearningLesson | null = useMemo(() => {
    if (lessonQuery.data && lessonQuery.data.id) return lessonQuery.data;
    return null;
  }, [lessonQuery.data]);

  if (lessonQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: title ?? 'Урок' }} />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title ?? lesson?.title ?? 'Урок', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lessonTitle}>{lesson?.title ?? title ?? ''}</Text>
        <Text style={styles.lessonContent}>{lesson?.content ?? 'Содержание урока загружается...'}</Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        {lesson?.completed ? (
          <View style={styles.completedBadge}>
            <CheckCircle2 color={Colors.success} size={20} />
            <Text style={styles.completedText}>Урок завершён</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.completeButton, completeMutation.isPending && styles.completeButtonDisabled]}
            onPress={() => completeMutation.mutate()}
            disabled={completeMutation.isPending}
            activeOpacity={0.8}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <CheckCircle2 color={Colors.white} size={20} />
                <Text style={styles.completeButtonText}>Завершить урок</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  lessonTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 20,
    lineHeight: 30,
  },
  lessonContent: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  completedText: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
