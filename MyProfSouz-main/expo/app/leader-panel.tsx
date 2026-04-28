import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, Search, Unlink, Users } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import {
  getParticipantId,
  getParticipantLeaderId,
  getParticipantMeta,
  getParticipantName,
  uniqParticipants,
  withParticipantLeader,
} from '@/utils/participants';

export default function LeaderPanelScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
  const [search, setSearch] = useState('');

  const leadersQuery = useQuery({
    queryKey: ['leaders'],
    queryFn: () => api.getLeaders(),
  });

  const agentsQuery = useQuery({
    queryKey: ['agents-reassignment'],
    queryFn: () => api.getAllAgentsForReassignment(),
  });

  const unassignedQuery = useQuery({
    queryKey: ['agents-unassigned'],
    queryFn: () => api.getUnassignedAgents(),
  });

  const leaders = useMemo(() => Array.isArray(leadersQuery.data) ? leadersQuery.data : [], [leadersQuery.data]);
  const agents = useMemo(() => Array.isArray(agentsQuery.data) ? agentsQuery.data : [], [agentsQuery.data]);
  const unassigned = useMemo(() => Array.isArray(unassignedQuery.data) ? unassignedQuery.data : [], [unassignedQuery.data]);

  const selectedLeader = useMemo(
    () => leaders.find((leader: any) => getParticipantId(leader) === selectedLeaderId),
    [leaders, selectedLeaderId]
  );
  const effectiveLeaderId = selectedLeaderId || user?.id || '';

  const allParticipants = useMemo(() => uniqParticipants([...agents, ...unassigned]), [agents, unassigned]);
  const unassignedIds = useMemo(() => new Set(unassigned.map((agent: any) => getParticipantId(agent))), [unassigned]);
  const normalizedSearch = search.trim().toLowerCase();

  const matchesSearch = useCallback((agent: any) => {
    if (!normalizedSearch) return true;
    return [
      getParticipantName(agent),
      getParticipantMeta(agent),
      agent?.email,
      agent?.phone,
      agent?.memberNumber,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
  }, [normalizedSearch]);

  const assignedToLeader = useMemo(() => {
    return allParticipants.filter((agent: any) => {
      const assignedLeaderId = getParticipantLeaderId(agent);
      const assignedHere = assignedLeaderId
        ? assignedLeaderId === effectiveLeaderId
        : !unassignedIds.has(getParticipantId(agent));
      return assignedHere && matchesSearch(agent);
    });
  }, [allParticipants, effectiveLeaderId, matchesSearch, unassignedIds]);

  const unassignedList = useMemo(() => {
    return allParticipants.filter((agent: any) => {
      const assignedLeaderId = getParticipantLeaderId(agent);
      const isUnassigned = !assignedLeaderId && unassignedIds.has(getParticipantId(agent));
      return isUnassigned && matchesSearch(agent);
    });
  }, [allParticipants, matchesSearch, unassignedIds]);

  const assignMutation = useMutation({
    mutationFn: ({ agentId, leaderId }: { agentId: string; leaderId: string }) => api.assignAgentToLeader(agentId, leaderId),
    onMutate: async ({ agentId, leaderId }) => {
      await queryClient.cancelQueries({ queryKey: ['agents-reassignment'] });
      await queryClient.cancelQueries({ queryKey: ['agents-unassigned'] });
      const previousAgents = queryClient.getQueryData<any[]>(['agents-reassignment']);
      const previousUnassigned = queryClient.getQueryData<any[]>(['agents-unassigned']);
      queryClient.setQueryData<any[]>(['agents-reassignment'], (current) =>
        Array.isArray(current) ? current.map((agent) => getParticipantId(agent) === agentId ? withParticipantLeader(agent, leaderId) : agent) : current
      );
      queryClient.setQueryData<any[]>(['agents-unassigned'], (current) =>
        Array.isArray(current) ? current.filter((agent) => getParticipantId(agent) !== agentId) : current
      );
      return { previousAgents, previousUnassigned };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agents-reassignment'] });
      void queryClient.invalidateQueries({ queryKey: ['agents-unassigned'] });
    },
    onError: (error: Error, _variables, context) => {
      queryClient.setQueryData(['agents-reassignment'], context?.previousAgents);
      queryClient.setQueryData(['agents-unassigned'], context?.previousUnassigned);
      Alert.alert('Ошибка', error.message || 'Не удалось закрепить участника');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: ({ agentId, leaderId }: { agentId: string; leaderId?: string }) => api.unassignAgentFromLeader(agentId, leaderId),
    onMutate: async ({ agentId }) => {
      await queryClient.cancelQueries({ queryKey: ['agents-reassignment'] });
      await queryClient.cancelQueries({ queryKey: ['agents-unassigned'] });
      const previousAgents = queryClient.getQueryData<any[]>(['agents-reassignment']);
      const previousUnassigned = queryClient.getQueryData<any[]>(['agents-unassigned']);
      const detached = allParticipants.find((agent: any) => getParticipantId(agent) === agentId);
      queryClient.setQueryData<any[]>(['agents-reassignment'], (current) =>
        Array.isArray(current) ? current.map((agent) => getParticipantId(agent) === agentId ? withParticipantLeader(agent, null) : agent) : current
      );
      queryClient.setQueryData<any[]>(['agents-unassigned'], (current) => {
        if (!detached) return current;
        const next = Array.isArray(current) ? current : [];
        return next.some((agent) => getParticipantId(agent) === agentId) ? next : [withParticipantLeader(detached, null), ...next];
      });
      return { previousAgents, previousUnassigned };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agents-reassignment'] });
      void queryClient.invalidateQueries({ queryKey: ['agents-unassigned'] });
    },
    onError: (error: Error, _variables, context) => {
      queryClient.setQueryData(['agents-reassignment'], context?.previousAgents);
      queryClient.setQueryData(['agents-unassigned'], context?.previousUnassigned);
      Alert.alert('Ошибка', error.message || 'Не удалось открепить участника');
    },
  });

  const refresh = useCallback(() => {
    void leadersQuery.refetch();
    void agentsQuery.refetch();
    void unassignedQuery.refetch();
  }, [leadersQuery, agentsQuery, unassignedQuery]);

  const handleAssign = useCallback((agent: any) => {
    const agentId = getParticipantId(agent);
    if (!agentId || !effectiveLeaderId) return;
    assignMutation.mutate({ agentId, leaderId: effectiveLeaderId });
  }, [assignMutation, effectiveLeaderId]);

  const handleUnassign = useCallback((agent: any) => {
    const agentId = getParticipantId(agent);
    const leaderId = getParticipantLeaderId(agent) || selectedLeaderId || effectiveLeaderId;
    if (!agentId) return;
    unassignMutation.mutate({ agentId, leaderId });
  }, [effectiveLeaderId, selectedLeaderId, unassignMutation]);

  const isLoading = leadersQuery.isLoading || agentsQuery.isLoading || unassignedQuery.isLoading;
  const isFetching = leadersQuery.isFetching || agentsQuery.isFetching || unassignedQuery.isFetching;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Панель руководителя</Text>
          <Text style={styles.subtitle}>Закрепление участников</Text>
        </View>
        <View style={styles.headerIcon}>
          <Users color={Colors.primary} size={22} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refresh} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} size="large" />
        ) : (
          <>
            {leaders.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Руководители</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leadersRow}>
                  {leaders.map((leader: any) => {
                    const id = getParticipantId(leader);
                    const active = id === selectedLeaderId;
                    return (
                      <TouchableOpacity key={id} style={[styles.leaderChip, active && styles.leaderChipActive]} onPress={() => setSelectedLeaderId(id)}>
                        <Text style={[styles.leaderChipText, active && styles.leaderChipTextActive]}>{getParticipantName(leader)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <View style={styles.searchBox}>
              <Search color={Colors.textMuted} size={18} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск по ФИО, телефону, email..."
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.sectionTitle}>Закреплённые участники</Text>
            {selectedLeader ? <Text style={styles.notice}>Выбран: {getParticipantName(selectedLeader)}</Text> : null}
            {assignedToLeader.length === 0 ? (
              <Text style={styles.empty}>Закреплённых участников пока нет</Text>
            ) : assignedToLeader.map((agent: any) => (
              <View key={`assigned-${getParticipantId(agent)}`} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{getParticipantName(agent)}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{getParticipantMeta(agent)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, styles.unassignButton, unassignMutation.isPending && styles.actionButtonDisabled]}
                  disabled={unassignMutation.isPending}
                  onPress={() => handleUnassign(agent)}
                >
                  <Unlink color={Colors.error} size={16} />
                  <Text style={[styles.actionText, styles.unassignText]}>Открепить</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Не закреплённые участники</Text>
            {unassignedList.length === 0 ? (
              <Text style={styles.empty}>Незакреплённых участников нет</Text>
            ) : unassignedList.map((agent: any) => (
              <View key={`agent-${getParticipantId(agent)}`} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{getParticipantName(agent)}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{getParticipantMeta(agent)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionButton, (!effectiveLeaderId || assignMutation.isPending) && styles.actionButtonDisabled]}
                  disabled={!effectiveLeaderId || assignMutation.isPending}
                  onPress={() => handleAssign(agent)}
                >
                    <Link color={Colors.white} size={16} />
                    <Text style={styles.actionText}>Закрепить</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  title: { color: Colors.text, fontSize: 23, fontWeight: '800' as const },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  content: { padding: 20, paddingTop: 0, gap: 10 },
  sectionTitle: { color: Colors.text, fontSize: 17, fontWeight: '700' as const, marginTop: 14 },
  leadersRow: { gap: 10, paddingVertical: 4 },
  leaderChip: { borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  leaderChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  leaderChipText: { color: Colors.text, fontSize: 13, fontWeight: '700' as const },
  leaderChipTextActive: { color: Colors.white },
  notice: { color: Colors.primary, fontSize: 13, fontWeight: '700' as const },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: 14, height: 48, marginTop: 6 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, paddingVertical: 0 },
  empty: { color: Colors.textMuted, fontSize: 14, paddingVertical: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.cardBorder },
  cardInfo: { flex: 1 },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' as const },
  cardMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { minWidth: 112, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 10 },
  actionText: { color: Colors.white, fontSize: 12, fontWeight: '700' as const },
  actionButtonDisabled: { opacity: 0.45 },
  unassignButton: { backgroundColor: 'rgba(239,68,68,0.12)' },
  unassignText: { color: Colors.error },
});
