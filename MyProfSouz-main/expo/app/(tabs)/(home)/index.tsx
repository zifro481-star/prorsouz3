import React, { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, FileText, Scale, MessageSquare, Bot,
  ChevronRight, CheckCircle2, Circle, Newspaper,
  Handshake, ClipboardList, BookOpen, Calendar, Users,
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { Lead, NewsItem, Notification } from '@/types';
import LinkifiedText from '@/components/LinkifiedText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NEWS_CARD_WIDTH = SCREEN_WIDTH * 0.72;


export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.getLeads(),
  });

  const newsQuery = useQuery({
    queryKey: ['news'],
    queryFn: () => api.getNews(),
  });

  const notifQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  });

  const isRefreshing = leadsQuery.isFetching || newsQuery.isFetching || notifQuery.isFetching;

  const onRefresh = useCallback(() => {
    void leadsQuery.refetch();
    void newsQuery.refetch();
    void notifQuery.refetch();
  }, [leadsQuery, newsQuery, notifQuery]);

  const leads: Lead[] = useMemo(() => {
    if (Array.isArray(leadsQuery.data)) return leadsQuery.data;
    return [];
  }, [leadsQuery.data]);

  const news: NewsItem[] = useMemo(() => {
    if (Array.isArray(newsQuery.data)) return newsQuery.data;
    return [];
  }, [newsQuery.data]);

  const notifications: Notification[] = useMemo(() => {
    if (Array.isArray(notifQuery.data)) return notifQuery.data;
    return [];
  }, [notifQuery.data]);

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );
  const unreadNotificationIds = useMemo(
    () => notifications.filter((item) => !item.read).map((item) => item.id),
    [notifications]
  );

  const directChatsQuery = useQuery({
    queryKey: ['direct-chats'],
    queryFn: async () => {
      try { const d = await api.getDirectChats(); return Array.isArray(d) ? d : []; } catch { return []; }
    },
    staleTime: 30000,
  });
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try { const d = await api.getConversations(); return Array.isArray(d) ? d : []; } catch { return []; }
    },
    staleTime: 30000,
  });

  const unreadCount = useMemo(() => {
    let count = 0;
    if (Array.isArray(directChatsQuery.data)) {
      count += directChatsQuery.data.reduce((s: number, c: any) => s + (Number(c.unreadCount) || 0), 0);
    }
    if (Array.isArray(conversationsQuery.data)) {
      count += conversationsQuery.data.reduce((s: number, c: any) => s + (Number(c.unreadCount) || 0), 0);
    }
    return count;
  }, [directChatsQuery.data, conversationsQuery.data]);

  const activeLeads = useMemo(
    () => leads.filter((l) => l.status === 'active' || l.status === 'open').length,
    [leads]
  );
  const resolvedLeads = useMemo(
    () => leads.filter((l) => l.status === 'resolved' || l.status === 'closed').length,
    [leads]
  );

  const nameParts = user?.fullName?.split(' ') ?? [];
  const firstName = nameParts.length >= 2 ? nameParts[1] : nameParts[0] ?? 'Участник';
  const canManageContent = user?.role === 'manager' || user?.role === 'leader' || user?.role === 'admin';

  const handleNotificationsPress = useCallback(() => {
    if (unreadNotificationIds.length > 0) {
      queryClient.setQueryData<Notification[]>(['notifications'], (current) =>
        Array.isArray(current)
          ? current.map((item) => unreadNotificationIds.includes(item.id) ? { ...item, read: true } : item)
          : current
      );
      void api.markNotificationsRead(unreadNotificationIds)
        .finally(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }));
    }
    router.push('/notifications');
  }, [queryClient, router, unreadNotificationIds]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Привет, {firstName}</Text>
          <Text style={styles.headerTitle}>Мой Профсоюз</Text>
        </View>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={handleNotificationsPress}
          testID="notifications-button"
        >
          <Bell color={Colors.text} size={22} />
          {unreadNotificationsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* AI Banner */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity
            style={styles.aiBanner}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/ai-chat')}
          >
            <View style={styles.lawyerBannerIcon}>
              <Bot color={Colors.white} size={24} />
            </View>
            <View style={styles.aiBannerContent}>
              <Text style={styles.aiBannerTitle}>Чат с ИИ</Text>
              <Text style={styles.aiBannerSubtitle}>Мгновенная юридическая консультация</Text>
            </View>
            <ChevronRight color={Colors.white} size={20} />
          </TouchableOpacity>
        </View>

        {/* Lawyer question */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <TouchableOpacity
            style={styles.lawyerBanner}
            activeOpacity={0.85}
            onPress={() => router.push('/legal-requests' as any)}
          >
            <View style={styles.lawyerBannerIcon}>
              <Scale color={Colors.white} size={24} />
            </View>
            <View style={styles.aiBannerContent}>
              <Text style={styles.aiBannerTitle}>Вопрос юристу</Text>
              <Text style={styles.aiBannerSubtitle}>Задайте вопрос профессионалу</Text>
            </View>
            <ChevronRight color={Colors.white} size={20} />
          </TouchableOpacity>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{activeLeads}</Text>
            <Text style={styles.metricLabel}>Активных{'\n'}обращений</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Colors.warning }]}>{unreadCount}</Text>
            <Text style={styles.metricLabel}>Непрочитанные{'\n'}сообщения</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Colors.success }]}>{resolvedLeads}</Text>
            <Text style={styles.metricLabel}>Решено{'\n'}обращений</Text>
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Сервисы</Text>
          </View>
          <View style={styles.servicesGrid}>
            <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('/leads' as any)} activeOpacity={0.8}>
              <View style={[styles.serviceIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                <FileText color={Colors.primary} size={20} />
              </View>
              <Text style={styles.serviceLabel}>Обращение</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('/partners' as any)} activeOpacity={0.8}>
              <View style={[styles.serviceIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                <Handshake color={Colors.warning} size={20} />
              </View>
              <Text style={styles.serviceLabel}>Партнёры</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('/surveys' as any)} activeOpacity={0.8}>
              <View style={[styles.serviceIcon, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <ClipboardList color="#8b5cf6" size={20} />
              </View>
              <Text style={styles.serviceLabel}>Опросы</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('/(tabs)/union' as any)} activeOpacity={0.8}>
              <View style={[styles.serviceIcon, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                <Calendar color={Colors.success} size={20} />
              </View>
              <Text style={styles.serviceLabel}>Мероприятия</Text>
            </TouchableOpacity>
            {canManageContent && (
              <>
                <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('/leader-panel' as any)} activeOpacity={0.8}>
                  <View style={[styles.serviceIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                    <Users color={Colors.success} size={20} />
                  </View>
                  <Text style={styles.serviceLabel}>Участники</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('/manager-news' as any)} activeOpacity={0.8}>
                  <View style={[styles.serviceIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                    <Newspaper color={Colors.error} size={20} />
                  </View>
                  <Text style={styles.serviceLabel}>Новости</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.serviceCard} onPress={() => router.push('/manager-events' as any)} activeOpacity={0.8}>
                  <View style={[styles.serviceIcon, { backgroundColor: 'rgba(14,165,233,0.12)' }]}>
                    <Calendar color="#0ea5e9" size={20} />
                  </View>
                  <Text style={styles.serviceLabel}>Управление</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* News */}
        {news.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Новости</Text>
              <Newspaper color={Colors.textMuted} size={18} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newsScroll}
              decelerationRate="fast"
              snapToInterval={NEWS_CARD_WIDTH + 12}
            >
              {news.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.newsCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/news-detail', params: { id: item.id, title: item.title, content: item.content } })}
                >
                  <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                  <LinkifiedText text={item.summary ?? item.content ?? ''} style={styles.newsSummary} />
                  <Text style={styles.newsDate}>
                    {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short',
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.badgeBg,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700' as const,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 8,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 16,
  },
  aiBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lawyerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    padding: 16,
  },
  lawyerBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerContent: {
    flex: 1,
    marginLeft: 14,
  },
  aiBannerTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  aiBannerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionMeta: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.cardBorder,
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  stepLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  stepDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  newsScroll: {
    gap: 12,
  },
  newsCard: {
    width: NEWS_CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  newsSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  newsDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceCard: {
    width: '48%' as any,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
