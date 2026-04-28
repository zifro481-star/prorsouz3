import React, { useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { LearningModule } from '@/types';

export default function LearningModuleScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const router = useRouter();

  const modulesQuery = useQuery({
    queryKey: ['learning-modules'],
    queryFn: () => api.getLearningModules(),
  });

  const currentModule: LearningModule | null = useMemo(() => {
    if (!Array.isArray(modulesQuery.data)) return null;
    return modulesQuery.data.find((m: LearningModule) => m.id === id) ?? null;
  }, [modulesQuery.data, id]);

  const lessons = currentModule?.lessons ?? [];

  const handleLessonPress = useCallback((lessonId: string, lessonTitle: string) => {
    router.push({ pathname: '/lesson-detail' as any, params: { id: lessonId, title: lessonTitle } });
  }, [router]);

  if (modulesQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: title ?? 'Модуль' }} />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title ?? 'Модуль', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {currentModule?.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{currentModule.description}</Text>
          </View>
        )}

        {lessons.length === 0 && (
          <View style={styles.emptyState}>
            <BookOpen color={Colors.textMuted} size={40} />
            <Text style={styles.emptyText}>Нет уроков в модуле</Text>
          </View>
        )}

        {lessons.map((lesson, idx) => {
          const isCompleted = lesson.completed;
          return (
            <TouchableOpacity
              key={lesson.id}
              style={styles.lessonCard}
              onPress={() => handleLessonPress(lesson.id, lesson.title)}
              activeOpacity={0.8}
            >
              <View style={[styles.lessonNumber, isCompleted && styles.lessonNumberComplete]}>
                {isCompleted ? (
                  <CheckCircle2 color={Colors.success} size={20} />
                ) : (
                  <Text style={styles.lessonNumberText}>{idx + 1}</Text>
                )}
              </View>
              <View style={styles.lessonInfo}>
                <Text style={[styles.lessonTitle, isCompleted && styles.lessonTitleComplete]}>
                  {lesson.title}
                </Text>
                {isCompleted && <Text style={styles.lessonStatus}>Завершён</Text>}
              </View>
              <ChevronRight color={Colors.textMuted} size={18} />
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
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
    paddingTop: 12,
  },
  descriptionCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
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
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  lessonNumber: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberComplete: {
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  lessonNumberText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  lessonInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  lessonTitleComplete: {
    color: Colors.textMuted,
  },
  lessonStatus: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600' as const,
    marginTop: 2,
  },
});
