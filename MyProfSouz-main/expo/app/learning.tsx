import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { LearningModule } from '@/types';

export default function LearningScreen() {
  const router = useRouter();

  const modulesQuery = useQuery({
    queryKey: ['learning-modules'],
    queryFn: async () => {
      try {
        const data = await api.getLearningModules();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const modules: LearningModule[] = useMemo(() => {
    if (!Array.isArray(modulesQuery.data)) return [];
    return modulesQuery.data;
  }, [modulesQuery.data]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Обучение', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={modulesQuery.isFetching} onRefresh={() => void modulesQuery.refetch()} tintColor={Colors.primary} />
        }
      >
        {modulesQuery.isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}

        {modules.length === 0 && !modulesQuery.isLoading && (
          <View style={styles.emptyState}>
            <BookOpen color={Colors.textMuted} size={44} />
            <Text style={styles.emptyTitle}>Нет модулей</Text>
            <Text style={styles.emptyText}>Обучающие модули появятся здесь</Text>
          </View>
        )}

        {modules.map(mod => {
          const progress = mod.progress ?? (mod.lessonsCount && mod.completedLessons
            ? Math.round((mod.completedLessons / mod.lessonsCount) * 100)
            : 0);
          const isComplete = progress >= 100;

          return (
            <TouchableOpacity
              key={mod.id}
              style={styles.moduleCard}
              onPress={() => router.push({ pathname: '/learning-module' as any, params: { id: mod.id, title: mod.title } })}
              activeOpacity={0.8}
            >
              <View style={styles.moduleHeader}>
                <View style={[styles.moduleIcon, isComplete && styles.moduleIconComplete]}>
                  {isComplete ? (
                    <CheckCircle2 color={Colors.success} size={24} />
                  ) : (
                    <BookOpen color={Colors.primary} size={24} />
                  )}
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{mod.title}</Text>
                  {mod.description && (
                    <Text style={styles.moduleDesc} numberOfLines={2}>{mod.description}</Text>
                  )}
                  <View style={styles.moduleProgress}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progress}%` }, isComplete && styles.progressBarComplete]} />
                    </View>
                    <Text style={styles.progressText}>{progress}%</Text>
                  </View>
                  {mod.lessonsCount != null && (
                    <Text style={styles.lessonsCount}>
                      {mod.completedLessons ?? 0} / {mod.lessonsCount} уроков
                    </Text>
                  )}
                </View>
                <ChevronRight color={Colors.textMuted} size={18} />
              </View>
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
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  moduleCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleIconComplete: {
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  moduleInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  moduleDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  moduleProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.cardBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressBarComplete: {
    backgroundColor: Colors.success,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    minWidth: 32,
    textAlign: 'right',
  },
  lessonsCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
