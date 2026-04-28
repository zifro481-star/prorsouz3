import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { Stack } from 'expo-router';
import { Handshake, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';

interface PartnerItem {
  id: string;
  title?: string;
  name?: string;
  specialization?: string;
  shortDescription?: string;
  fullDescription?: string;
  description?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export default function PartnersScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      try {
        const data = await api.getPartners();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });

  const partners: PartnerItem[] = useMemo(() => {
    if (!Array.isArray(partnersQuery.data)) return [];
    return partnersQuery.data;
  }, [partnersQuery.data]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Партнёры', headerTitleStyle: { fontWeight: '700' } }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={partnersQuery.isFetching} onRefresh={() => void partnersQuery.refetch()} tintColor={Colors.primary} />
        }
      >
        {partnersQuery.isLoading && (
          <View style={styles.loadingState}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        )}

        {partners.length === 0 && !partnersQuery.isLoading && (
          <View style={styles.emptyState}>
            <Handshake color={Colors.textMuted} size={44} />
            <Text style={styles.emptyTitle}>Нет партнёров</Text>
            <Text style={styles.emptyText}>Информация о партнёрах появится здесь</Text>
          </View>
        )}

        {partners.map(partner => {
          if (!partner || !partner.id) return null;
          const isExpanded = expandedId === partner.id;
          const displayName = partner.title || partner.name || 'Партнёр';
          const shortDesc = partner.shortDescription || partner.specialization || partner.description || '';
          const fullDesc = partner.fullDescription || '';

          return (
            <TouchableOpacity
              key={partner.id}
              style={styles.partnerCard}
              onPress={() => setExpandedId(isExpanded ? null : partner.id)}
              activeOpacity={0.85}
            >
              <View style={styles.partnerHeader}>
                {partner.logoUrl ? (
                  <Image
                    source={{ uri: `https://profsouz.info${partner.logoUrl}` }}
                    style={styles.partnerLogoImg}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.partnerLogo}>
                    <Text style={styles.partnerLogoText}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{displayName}</Text>
                  {partner.specialization && (
                    <Text style={styles.partnerSpec}>{partner.specialization}</Text>
                  )}
                  {shortDesc && !partner.specialization && (
                    <Text style={styles.partnerDesc} numberOfLines={isExpanded ? undefined : 2}>
                      {shortDesc}
                    </Text>
                  )}
                </View>
                {fullDesc ? (
                  isExpanded ? (
                    <ChevronUp color={Colors.textMuted} size={18} />
                  ) : (
                    <ChevronDown color={Colors.textMuted} size={18} />
                  )
                ) : null}
              </View>

              {isExpanded && (
                <View style={styles.expandedBlock}>
                  {partner.specialization && shortDesc && (
                    <Text style={styles.expandedText}>{shortDesc}</Text>
                  )}
                  {fullDesc && (
                    <Text style={styles.expandedText}>{fullDesc}</Text>
                  )}
                </View>
              )}
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
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  partnerCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  partnerLogoImg: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  partnerLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerLogoText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  partnerInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  partnerSpec: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  partnerDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  expandedBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  expandedText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 8,
  },
});
