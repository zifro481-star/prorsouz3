import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, ChevronLeft, Check, Circle, CheckCircle2, Square, CheckSquare } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { SurveyDetail, SurveyAnswer } from '@/types';

export default function SurveyDetailScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [completed, setCompleted] = useState(false);

  const surveyQuery = useQuery({
    queryKey: ['survey-detail', id],
    queryFn: () => api.getSurveyDetail(id ?? ''),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: SurveyAnswer[]) => api.submitSurvey(id ?? '', data),
    onSuccess: () => {
      setCompleted(true);
      void queryClient.invalidateQueries({ queryKey: ['surveys'] });
    },
    onError: (err: Error) => {
      Alert.alert('Ошибка', err.message || 'Не удалось отправить ответы');
    },
  });

  const survey: SurveyDetail | null = useMemo(() => {
    if (surveyQuery.data && surveyQuery.data.questions) return surveyQuery.data;
    return null;
  }, [surveyQuery.data]);

  const questions = survey?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLast = currentIndex === totalQuestions - 1;

  const handleSingleChoice = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, optionIds: [optionId] },
    }));
  }, []);

  const handleMultipleChoice = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => {
      const existing = prev[questionId]?.optionIds ?? [];
      const updated = existing.includes(optionId)
        ? existing.filter(id => id !== optionId)
        : [...existing, optionId];
      return {
        ...prev,
        [questionId]: { questionId, optionIds: updated },
      };
    });
  }, []);

  const handleTextAnswer = useCallback((questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, textAnswer: text },
    }));
  }, []);

  const handleNext = useCallback(() => {
    const answer = currentQuestion ? answers[currentQuestion.id] : null;
    const hasAnswer = Boolean(
      answer?.textAnswer?.trim() ||
      (answer?.optionIds && answer.optionIds.length > 0)
    );
    if (!hasAnswer) {
      Alert.alert('Ответьте на вопрос', 'Выберите вариант или введите ответ');
      return;
    }
    if (isLast) {
      const answersList = Object.values(answers);
      submitMutation.mutate(answersList);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [answers, currentQuestion, isLast, submitMutation]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  }, [currentIndex]);

  if (completed) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: title ?? 'Опрос', headerTitleStyle: { fontWeight: '700' } }} />
        <View style={styles.completedState}>
          <View style={styles.completedIcon}>
            <CheckCircle2 color={Colors.success} size={56} />
          </View>
          <Text style={styles.completedTitle}>Спасибо за участие!</Text>
          <Text style={styles.completedText}>Ваши ответы отправлены</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Вернуться к опросам</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (surveyQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: title ?? 'Опрос' }} />
        <View style={styles.loadingState}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: title ?? 'Опрос' }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Нет вопросов</Text>
        </View>
      </View>
    );
  }

  const currentAnswer = answers[currentQuestion.id];
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title ?? 'Опрос', headerTitleStyle: { fontWeight: '700' } }} />

      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Вопрос {currentIndex + 1} из {totalQuestions}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.questionText}>{currentQuestion.text}</Text>

        {currentQuestion.type === 'single_choice' && currentQuestion.options?.map(opt => {
          const selected = currentAnswer?.optionIds?.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              onPress={() => handleSingleChoice(currentQuestion.id, opt.id)}
              activeOpacity={0.7}
            >
              {selected ? (
                <CheckCircle2 color={Colors.primary} size={22} />
              ) : (
                <Circle color={Colors.textMuted} size={22} />
              )}
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.text}</Text>
            </TouchableOpacity>
          );
        })}

        {currentQuestion.type === 'multiple_choice' && currentQuestion.options?.map(opt => {
          const selected = currentAnswer?.optionIds?.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              onPress={() => handleMultipleChoice(currentQuestion.id, opt.id)}
              activeOpacity={0.7}
            >
              {selected ? (
                <CheckSquare color={Colors.primary} size={22} />
              ) : (
                <Square color={Colors.textMuted} size={22} />
              )}
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt.text}</Text>
            </TouchableOpacity>
          );
        })}

        {currentQuestion.type === 'text' && (
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={5}
            placeholder="Введите ваш ответ..."
            placeholderTextColor={Colors.textMuted}
            value={currentAnswer?.textAnswer ?? ''}
            onChangeText={(text) => handleTextAnswer(currentQuestion.id, text)}
            textAlignVertical="top"
          />
        )}
      </ScrollView>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
          activeOpacity={0.7}
        >
          <ChevronLeft color={currentIndex === 0 ? Colors.textMuted : Colors.text} size={20} />
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>Назад</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, submitMutation.isPending && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={submitMutation.isPending}
          activeOpacity={0.8}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>{isLast ? 'Отправить' : 'Далее'}</Text>
              {isLast ? <Check color={Colors.white} size={18} /> : <ChevronRight color={Colors.white} size={18} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  progressBarBg: {
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
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    flexGrow: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 26,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  optionText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  textArea: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    color: Colors.text,
    fontSize: 15,
    minHeight: 140,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  navButtonTextDisabled: {
    color: Colors.textMuted,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  completedState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  completedIcon: {
    marginBottom: 24,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
