import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ClipboardList, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { Survey } from '@/types';

export default function SurveysScreen() {
  const router = useRouter();

  const surveysQuery = useQuery({
    queryKey: ['surveys'],
    queryFn: () => api.getSurveys(),
  });

  const surveys: Survey[] = useMemo(() => {
    if (!Array.isArray(surveysQuery.data)) return [];
    return surveysQuery.data;
  }, [surveysQuery.data]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Опросы', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={surveysQuery.isFetching} onRefresh={() => void surveysQuery.refetch()} tintColor={Colors.primary} />
        }
      >
        {surveysQuery.isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}

        {surveys.length === 0 && !surveysQuery.isLoading && (
          <View style={styles.emptyState}>
            <ClipboardList color={Colors.textMuted} size={44} />
            <Text style={styles.emptyTitle}>Нет опросов</Text>
            <Text style={styles.emptyText}>Новые опросы появятся здесь</Text>
          </View>
        )}

        {surveys.map(survey => {
          const isCompleted = survey.completed || survey.status === 'completed';
          return (
            <TouchableOpacity
              key={survey.id}
              style={styles.surveyCard}
              onPress={() => {
                if (!isCompleted) {
                  router.push({ pathname: '/survey-detail' as any, params: { id: survey.id, title: survey.title } });
                }
              }}
              activeOpacity={isCompleted ? 1 : 0.8}
            >
              <View style={styles.surveyHeader}>
                <View style={[styles.surveyIcon, isCompleted && styles.surveyIconCompleted]}>
                  {isCompleted ? (
                    <CheckCircle2 color={Colors.success} size={22} />
                  ) : (
                    <Sparkles color={Colors.primary} size={22} />
                  )}
                </View>
                <View style={styles.surveyInfo}>
                  <Text style={styles.surveyTitle}>{survey.title}</Text>
                  {survey.description && (
                    <Text style={styles.surveyDesc} numberOfLines={2}>{survey.description}</Text>
                  )}
                  <View style={styles.surveyMeta}>
                    <View style={[styles.statusBadge, isCompleted ? styles.badgeCompleted : styles.badgeNew]}>
                      <Text style={[styles.statusBadgeText, isCompleted ? styles.badgeTextCompleted : styles.badgeTextNew]}>
                        {isCompleted ? 'Пройден' : 'Новый'}
                      </Text>
                    </View>
                    {survey.questionsCount && (
                      <Text style={styles.questionsCount}>{survey.questionsCount} вопросов</Text>
                    )}
                  </View>
                </View>
                {!isCompleted && <ChevronRight color={Colors.textMuted} size={18} />}
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
  surveyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surveyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  surveyIconCompleted: {
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  surveyInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  surveyTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  surveyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  surveyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeNew: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  badgeCompleted: {
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  badgeTextNew: {
    color: Colors.primary,
  },
  badgeTextCompleted: {
    color: Colors.success,
  },
  questionsCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
