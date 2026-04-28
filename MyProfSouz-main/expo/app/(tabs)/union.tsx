import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Linking, TextInput, Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users, Calendar, History, HelpCircle, FileText, Activity,
  ChevronDown, ChevronUp, ExternalLink, ScrollText, Shield, Lock,
  Search, UserMinus, UserPlus,
} from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { UnionEvent, UnionDocument } from '@/types';
import {
  getParticipantId,
  getParticipantInitials,
  getParticipantLeaderId,
  getParticipantMeta,
  getParticipantName,
  uniqParticipants,
  withParticipantLeader,
} from '@/utils/participants';

type TabKey = 'participants' | 'leadership' | 'events' | 'history' | 'faq' | 'documents' | 'activities' | 'agreements';

const ALL_TABS: { key: TabKey; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'leadership', label: 'Руководство', icon: Users },
  { key: 'events', label: 'Мероприятия', icon: Calendar },
  { key: 'history', label: 'История', icon: History },
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
  { key: 'documents', label: 'Документы', icon: FileText },
  { key: 'activities', label: 'Деятельность', icon: Activity },
  { key: 'agreements', label: 'Соглашения', icon: ScrollText },
];

const PARTICIPANTS_TAB = { key: 'participants' as const, label: 'Участники', icon: Users };

const HISTORY_TEXT = `Профсоюзная организация была создана в 2005 году с целью защиты трудовых прав работников и содействия улучшению условий труда.

За годы работы профсоюз добился значительных результатов:
• Заключение коллективного договора с улучшенными условиями
• Создание системы правовой поддержки для всех участников
• Организация программ обучения и повышения квалификации
• Развитие партнёрской сети с льготными условиями для членов профсоюза

Сегодня профсоюз объединяет более 500 активных участников и продолжает расширять спектр услуг и возможностей для своих членов.`;

const FAQ_ITEMS = [
  { id: '1', q: 'Как вступить в профсоюз?', a: 'Для вступления необходимо заполнить заявление на сайте или в приложении, выбрать профсоюзную организацию и подразделение. После рассмотрения заявки вы получите уведомление о принятии.' },
  { id: '2', q: 'Какие преимущества даёт членство?', a: 'Членство в профсоюзе даёт правовую защиту, доступ к бесплатным юридическим консультациям, скидки от партнёров, участие в мероприятиях и программах обучения.' },
  { id: '3', q: 'Как подать обращение руководителю?', a: 'Перейдите в раздел «Обращение» на главной странице, выберите тип обращения (жалоба или инициатива), опишите ситуацию и отправьте.' },
  { id: '4', q: 'Как получить юридическую консультацию?', a: 'Нажмите «Юристу» на главной или перейдите в раздел вопросов юристу. Заполните тему, выберите категорию и опишите проблему.' },
  { id: '5', q: 'Какой размер членского взноса?', a: 'Размер членского взноса составляет 1% от заработной платы. Взносы направляются на финансирование деятельности профсоюза и оказание помощи членам.' },
];

const AGREEMENTS = [
  {
    id: 'offer',
    title: 'Оферта',
    icon: FileText,
    content: `ПУБЛИЧНАЯ ОФЕРТА\n\n1. ОБЩИЕ ПОЛОЖЕНИЯ\n1.1. Настоящий документ является официальным предложением (публичной офертой) профсоюзной организации и содержит все существенные условия предоставления услуг.\n1.2. В соответствии с п. 2 ст. 437 Гражданского кодекса Российской Федерации данный документ является публичной офертой.\n1.3. Акцептом настоящей оферты является регистрация на платформе и/или подача заявления о вступлении в профсоюз.\n\n2. ПРЕДМЕТ ОФЕРТЫ\n2.1. Профсоюзная организация предоставляет участнику доступ к платформе для получения информационных, консультационных и правовых услуг.\n2.2. Объём и содержание услуг определяются текущим функционалом платформы.\n\n3. ПРАВА И ОБЯЗАННОСТИ СТОРОН\n3.1. Профсоюзная организация обязуется:\n— обеспечить доступ к платформе;\n— предоставлять консультационные услуги;\n— защищать трудовые права участников.\n3.2. Участник обязуется:\n— предоставить достоверные данные при регистрации;\n— соблюдать правила пользования платформой;\n— своевременно уплачивать членские взносы.\n\n4. ОТВЕТСТВЕННОСТЬ\n4.1. Стороны несут ответственность в соответствии с действующим законодательством РФ.\n\n5. СРОК ДЕЙСТВИЯ\n5.1. Оферта действует с момента публикации на платформе и до момента её отзыва.`,
  },
  {
    id: 'privacy',
    title: 'Политика конфиденциальности',
    icon: Shield,
    content: `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ\n\n1. СБОР ИНФОРМАЦИИ\n1.1. При регистрации мы собираем: ФИО, email, телефон, информацию о месте работы.\n1.2. Автоматически собираются: IP-адрес, тип устройства, версия ОС.\n\n2. ИСПОЛЬЗОВАНИЕ ИНФОРМАЦИИ\n2.1. Для идентификации, предоставления услуг, отправки уведомлений, улучшения сервиса.\n\n3. ЗАЩИТА ДАННЫХ\n3.1. Применяются организационные и технические меры защиты.\n3.2. Данные хранятся на защищённых серверах с шифрованием.\n\n4. ПЕРЕДАЧА ДАННЫХ\n4.1. Не передаём третьим лицам без согласия, за исключением случаев, предусмотренных законодательством.\n\n5. ПРАВА ПОЛЬЗОВАТЕЛЯ\n5.1. Запросить, исправить или удалить персональные данные, отозвать согласие.`,
  },
  {
    id: 'consent',
    title: 'Согласие на обработку ПД',
    icon: Lock,
    content: `СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ\n\nЯ, субъект персональных данных, в соответствии с ФЗ от 27.07.2006 № 152-ФЗ «О персональных данных», даю согласие на обработку моих персональных данных.\n\nПЕРЕЧЕНЬ ДАННЫХ:\n— ФИО, email, телефон;\n— место работы и должность;\n— город проживания, профессия.\n\nЦЕЛИ ОБРАБОТКИ:\n— участие в деятельности профсоюза;\n— правовая и консультационная поддержка;\n— информирование о мероприятиях;\n— формирование отчётности.\n\nСРОК: действует до момента отзыва в письменной форме.`,
  },
];

const ACTIVITIES = [
  { id: '1', title: 'Правовая защита', description: 'Бесплатные юридические консультации, представительство интересов работников в трудовых спорах, помощь в составлении документов.' },
  { id: '2', title: 'Коллективные переговоры', description: 'Ведение переговоров с работодателем по улучшению условий труда, заключение и контроль выполнения коллективного договора.' },
  { id: '3', title: 'Охрана труда', description: 'Контроль соблюдения норм охраны труда, участие в расследовании несчастных случаев, обучение по вопросам безопасности.' },
  { id: '4', title: 'Социальные программы', description: 'Организация отдыха и оздоровления, материальная помощь членам профсоюза, программы лояльности с партнёрами.' },
  { id: '5', title: 'Образовательная деятельность', description: 'Семинары и тренинги по трудовому праву, вебинары, программы повышения квалификации профсоюзного актива.' },
];

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
}

export default function UnionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManageParticipants = user?.role === 'leader' || user?.role === 'manager' || user?.role === 'admin';
  const TABS = useMemo(() => canManageParticipants ? [PARTICIPANTS_TAB, ...ALL_TABS.filter(t => t.key !== 'leadership')] : ALL_TABS, [canManageParticipants]);
  const [activeTab, setActiveTab] = useState<TabKey>(canManageParticipants ? 'participants' : 'leadership');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [expandedAgreement, setExpandedAgreement] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState('');

  useEffect(() => {
    if (canManageParticipants && activeTab === 'leadership') setActiveTab('participants');
    if (!canManageParticipants && activeTab === 'participants') setActiveTab('leadership');
  }, [activeTab, canManageParticipants]);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        return await api.getProfile();
      } catch {
        return null;
      }
    },
  });

  const leaderName = (profileQuery.data as any)?.managerName;
  const leaderId = (profileQuery.data as any)?.managerId;

  const eventsQuery = useQuery({
    queryKey: ['union-events'],
    queryFn: () => api.getUnionEvents(),
    enabled: activeTab === 'events',
  });

  const participantsQuery = useQuery({
    queryKey: ['agents-reassignment'],
    queryFn: () => api.getAllAgentsForReassignment(),
    enabled: activeTab === 'participants' && canManageParticipants,
  });

  const unassignedQuery = useQuery({
    queryKey: ['agents-unassigned'],
    queryFn: () => api.getUnassignedAgents(),
    enabled: activeTab === 'participants' && canManageParticipants,
  });

  const documentsQuery = useQuery({
    queryKey: ['union-documents'],
    queryFn: () => api.getUnionDocuments(),
    enabled: activeTab === 'documents',
  });

  const events: UnionEvent[] = useMemo(() => {
    if (!Array.isArray(eventsQuery.data)) return [];
    return eventsQuery.data;
  }, [eventsQuery.data]);

  const documents: UnionDocument[] = useMemo(() => {
    if (!Array.isArray(documentsQuery.data)) return [];
    return documentsQuery.data;
  }, [documentsQuery.data]);

  const participants = useMemo(
    () => uniqParticipants([...(Array.isArray(participantsQuery.data) ? participantsQuery.data : []), ...(Array.isArray(unassignedQuery.data) ? unassignedQuery.data : [])]),
    [participantsQuery.data, unassignedQuery.data]
  );
  const unassignedIds = useMemo(
    () => new Set((Array.isArray(unassignedQuery.data) ? unassignedQuery.data : []).map((item: any) => getParticipantId(item))),
    [unassignedQuery.data]
  );
  const normalizedParticipantSearch = participantSearch.trim().toLowerCase();
  const matchesParticipantSearch = useCallback((item: any) => {
    if (!normalizedParticipantSearch) return true;
    return [
      getParticipantName(item),
      getParticipantMeta(item),
      item?.email,
      item?.phone,
      item?.memberNumber,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedParticipantSearch);
  }, [normalizedParticipantSearch]);

  const assignedParticipants = useMemo(() => {
    return participants.filter((item: any) => {
      const assignedLeaderId = getParticipantLeaderId(item);
      const assignedHere = assignedLeaderId
        ? assignedLeaderId === user?.id
        : !unassignedIds.has(getParticipantId(item));
      return assignedHere && matchesParticipantSearch(item);
    });
  }, [matchesParticipantSearch, participants, unassignedIds, user?.id]);

  const unassignedParticipants = useMemo(() => {
    return participants.filter((item: any) => {
      const assignedLeaderId = getParticipantLeaderId(item);
      const isUnassigned = !assignedLeaderId && unassignedIds.has(getParticipantId(item));
      return isUnassigned && matchesParticipantSearch(item);
    });
  }, [matchesParticipantSearch, participants, unassignedIds]);

  const assignMutation = useMutation({
    mutationFn: ({ participantId, leaderId }: { participantId: string; leaderId: string }) =>
      api.assignAgentToLeader(participantId, leaderId),
    onMutate: async ({ participantId, leaderId }) => {
      await queryClient.cancelQueries({ queryKey: ['agents-reassignment'] });
      await queryClient.cancelQueries({ queryKey: ['agents-unassigned'] });
      const previousParticipants = queryClient.getQueryData<any[]>(['agents-reassignment']);
      const previousUnassigned = queryClient.getQueryData<any[]>(['agents-unassigned']);
      queryClient.setQueryData<any[]>(['agents-reassignment'], (current) =>
        Array.isArray(current) ? current.map((item) => getParticipantId(item) === participantId ? withParticipantLeader(item, leaderId) : item) : current
      );
      queryClient.setQueryData<any[]>(['agents-unassigned'], (current) =>
        Array.isArray(current) ? current.filter((item) => getParticipantId(item) !== participantId) : current
      );
      return { previousParticipants, previousUnassigned };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agents-reassignment'] });
      void queryClient.invalidateQueries({ queryKey: ['agents-unassigned'] });
    },
    onError: (error: Error, _variables, context) => {
      queryClient.setQueryData(['agents-reassignment'], context?.previousParticipants);
      queryClient.setQueryData(['agents-unassigned'], context?.previousUnassigned);
      Alert.alert('Ошибка', error.message || 'Не удалось закрепить участника');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: ({ participantId, leaderId }: { participantId: string; leaderId?: string }) =>
      api.unassignAgentFromLeader(participantId, leaderId),
    onMutate: async ({ participantId }) => {
      await queryClient.cancelQueries({ queryKey: ['agents-reassignment'] });
      await queryClient.cancelQueries({ queryKey: ['agents-unassigned'] });
      const previousParticipants = queryClient.getQueryData<any[]>(['agents-reassignment']);
      const previousUnassigned = queryClient.getQueryData<any[]>(['agents-unassigned']);
      const detached = participants.find((item: any) => getParticipantId(item) === participantId);
      queryClient.setQueryData<any[]>(['agents-reassignment'], (current) =>
        Array.isArray(current) ? current.map((item) => getParticipantId(item) === participantId ? withParticipantLeader(item, null) : item) : current
      );
      queryClient.setQueryData<any[]>(['agents-unassigned'], (current) => {
        if (!detached) return current;
        const next = Array.isArray(current) ? current : [];
        return next.some((item) => getParticipantId(item) === participantId) ? next : [withParticipantLeader(detached, null), ...next];
      });
      return { previousParticipants, previousUnassigned };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agents-reassignment'] });
      void queryClient.invalidateQueries({ queryKey: ['agents-unassigned'] });
    },
    onError: (error: Error, _variables, context) => {
      queryClient.setQueryData(['agents-reassignment'], context?.previousParticipants);
      queryClient.setQueryData(['agents-unassigned'], context?.previousUnassigned);
      Alert.alert('Ошибка', error.message || 'Не удалось открепить участника');
    },
  });

  const handleDocumentPress = useCallback((doc: UnionDocument) => {
    if (doc.fileUrl) {
      void Linking.openURL(doc.fileUrl);
    }
  }, []);

  const isLoading = (activeTab === 'events' && eventsQuery.isLoading) ||
    (activeTab === 'documents' && documentsQuery.isLoading) ||
    (activeTab === 'participants' && (participantsQuery.isLoading || unassignedQuery.isLoading));

  const onRefresh = useCallback(() => {
    if (activeTab === 'events') void eventsQuery.refetch();
    if (activeTab === 'documents') void documentsQuery.refetch();
    if (activeTab === 'participants') {
      void participantsQuery.refetch();
      void unassignedQuery.refetch();
    }
  }, [activeTab, eventsQuery, documentsQuery, participantsQuery, unassignedQuery]);

  const handleAssignParticipant = useCallback((item: any) => {
    const participantId = getParticipantId(item);
    if (!participantId || !user?.id) return;
    assignMutation.mutate({ participantId, leaderId: user.id });
  }, [assignMutation, user?.id]);

  const handleUnassignParticipant = useCallback((item: any) => {
    const participantId = getParticipantId(item);
    if (!participantId) return;
    unassignMutation.mutate({ participantId, leaderId: getParticipantLeaderId(item) || user?.id });
  }, [unassignMutation, user?.id]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>О профсоюзе</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
        style={styles.tabsContainer}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, isActive && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Icon color={isActive ? Colors.white : Colors.textMuted} size={15} />
              <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}

        {activeTab === 'participants' && canManageParticipants && !isLoading && (
          <>
            <View style={styles.participantSearchBox}>
              <Search color={Colors.textMuted} size={18} />
              <TextInput
                value={participantSearch}
                onChangeText={setParticipantSearch}
                placeholder="Поиск по ФИО, телефону, email..."
                placeholderTextColor={Colors.textMuted}
                style={styles.participantSearchInput}
              />
            </View>

            <Text style={styles.participantSectionTitle}>Закреплённые участники</Text>
            {assignedParticipants.length === 0 ? (
              <Text style={styles.emptyTextInline}>Закреплённых участников пока нет</Text>
            ) : assignedParticipants.map((item: any) => {
              const name = getParticipantName(item);
              return (
                <View key={`assigned-${getParticipantId(item)}`} style={styles.participantCard}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantAvatarText}>{getParticipantInitials(name)}</Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.participantMeta} numberOfLines={1}>{getParticipantMeta(item)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.participantButton, styles.detachButton, unassignMutation.isPending && styles.participantButtonDisabled]}
                    disabled={unassignMutation.isPending}
                    onPress={() => handleUnassignParticipant(item)}
                  >
                    <UserMinus color={Colors.error} size={17} />
                    <Text style={styles.detachButtonText}>Открепить</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <Text style={styles.participantSectionTitle}>Не закреплённые участники</Text>
            {unassignedParticipants.length === 0 ? (
              <Text style={styles.emptyTextInline}>Незакреплённых участников нет</Text>
            ) : unassignedParticipants.map((item: any) => {
              const name = getParticipantName(item);
              return (
                <View key={`unassigned-${getParticipantId(item)}`} style={styles.participantCard}>
                  <View style={styles.participantAvatar}>
                    <Text style={styles.participantAvatarText}>{getParticipantInitials(name)}</Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.participantMeta} numberOfLines={1}>{getParticipantMeta(item)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.participantButton, styles.attachButton, (!user?.id || assignMutation.isPending) && styles.participantButtonDisabled]}
                    disabled={!user?.id || assignMutation.isPending}
                    onPress={() => handleAssignParticipant(item)}
                  >
                    <UserPlus color={Colors.success} size={17} />
                    <Text style={styles.attachButtonText}>Закрепить</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {activeTab === 'leadership' && (
          <>
            {profileQuery.isLoading && (
              <View style={styles.emptyState}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            )}
            {!leaderName && !profileQuery.isLoading && (
              <View style={styles.emptyState}>
                <Users color={Colors.textMuted} size={40} />
                <Text style={styles.emptyText}>Руководитель не назначен</Text>
              </View>
            )}
            {leaderName && (
              <View style={styles.leaderCard}>
                <View style={styles.leaderAvatar}>
                  <Text style={styles.leaderAvatarText}>{getInitials(leaderName)}</Text>
                </View>
                <View style={styles.leaderInfo}>
                  <Text style={styles.leaderName}>{leaderName}</Text>
                  <Text style={styles.leaderPosition}>Ваш руководитель</Text>
                </View>
              </View>
            )}
          </>
        )}

        {activeTab === 'events' && !eventsQuery.isLoading && (
          <>
            {events.length === 0 && (
              <View style={styles.emptyState}>
                <Calendar color={Colors.textMuted} size={40} />
                <Text style={styles.emptyText}>Нет мероприятий</Text>
              </View>
            )}
            {events.map(event => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/event-detail' as any, params: { id: event.id, title: event.title, content: event.content ?? event.description ?? '' } })}
              >
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.description && (
                  <Text style={styles.eventDesc} numberOfLines={2}>{event.description}</Text>
                )}
                <Text style={styles.eventDate}>
                  {event.date
                    ? new Date(event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                    : new Date(event.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <History color={Colors.primary} size={20} />
              <Text style={styles.historyTitle}>История профсоюза</Text>
            </View>
            <Text style={styles.historyText}>{HISTORY_TEXT}</Text>
          </View>
        )}

        {activeTab === 'faq' && (
          <>
            {FAQ_ITEMS.map(item => {
              const isExpanded = expandedFaq === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.faqCard}
                  onPress={() => setExpandedFaq(isExpanded ? null : item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.faqHeader}>
                    <Text style={styles.faqQuestion}>{item.q}</Text>
                    {isExpanded ? (
                      <ChevronUp color={Colors.primary} size={18} />
                    ) : (
                      <ChevronDown color={Colors.textMuted} size={18} />
                    )}
                  </View>
                  {isExpanded && (
                    <Text style={styles.faqAnswer}>{item.a}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {activeTab === 'documents' && !documentsQuery.isLoading && (
          <>
            {documents.length === 0 && (
              <View style={styles.emptyState}>
                <FileText color={Colors.textMuted} size={40} />
                <Text style={styles.emptyText}>Нет документов</Text>
              </View>
            )}
            {documents.map(doc => (
              <TouchableOpacity
                key={doc.id}
                style={styles.docCard}
                onPress={() => handleDocumentPress(doc)}
                activeOpacity={0.8}
              >
                <View style={styles.docIcon}>
                  <FileText color={Colors.error} size={22} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={2}>{doc.title}</Text>
                  <Text style={styles.docType}>{doc.fileType?.toUpperCase() ?? 'PDF'}</Text>
                </View>
                <ExternalLink color={Colors.textMuted} size={16} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {activeTab === 'activities' && (
          <>
            {ACTIVITIES.map(act => (
              <View key={act.id} style={styles.activityCard}>
                <View style={styles.activityBadge}>
                  <Text style={styles.activityBadgeText}>{act.id}</Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{act.title}</Text>
                  <Text style={styles.activityDesc}>{act.description}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'agreements' && (
          <>
            {AGREEMENTS.map(item => {
              const Icon = item.icon;
              const isExpanded = expandedAgreement === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.faqCard}
                  onPress={() => setExpandedAgreement(isExpanded ? null : item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.faqHeader}>
                    <View style={[styles.activityBadge, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                      <Icon color={Colors.primary} size={16} />
                    </View>
                    <Text style={[styles.faqQuestion, { marginLeft: 10 }]}>{item.title}</Text>
                    {isExpanded ? (
                      <ChevronUp color={Colors.primary} size={18} />
                    ) : (
                      <ChevronDown color={Colors.textMuted} size={18} />
                    )}
                  </View>
                  {isExpanded && (
                    <Text style={styles.faqAnswer}>{item.content}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  tabsContainer: {
    flexGrow: 0,
    marginBottom: 4,
    minHeight: 50,
  },
  tabsScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    height: 38,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  tabChipTextActive: {
    color: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: 'center',
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
  emptyTextInline: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  leaderCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  leaderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderAvatarText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  leaderInfo: {
    flex: 1,
    marginLeft: 14,
  },
  leaderName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  leaderPosition: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  leaderDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  participantSectionTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  participantSearchBox: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  participantSearchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  participantAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantAvatarText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  participantInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  participantName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  participantMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  participantButton: {
    height: 44,
    minWidth: 128,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  participantButtonDisabled: {
    opacity: 0.45,
  },
  attachButton: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderColor: 'rgba(34,197,94,0.25)',
  },
  detachButton: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  attachButtonText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  detachButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  eventDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  historyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  faqCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
    marginLeft: 12,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  docType: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  activityBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityBadgeText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  activityContent: {
    flex: 1,
    marginLeft: 14,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  activityDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
