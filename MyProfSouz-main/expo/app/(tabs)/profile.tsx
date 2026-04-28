import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl, Linking, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Edit3, Check, X, Shield, Building2, MapPin, Briefcase, Sun, Moon, Send, RefreshCw, Unlink, KeyRound } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { User, ProfileUpdateData } from '@/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case 'leader': return 'Руководитель';
    case 'admin': return 'Администратор';
    case 'lawyer': return 'Юрист';
    default: return 'Участник';
  }
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme, colors: themeColors } = useTheme();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editProfession, setEditProfession] = useState('');
  const [tgDeepLink, setTgDeepLink] = useState<string | null>(null);
  const [maxDeepLink, setMaxDeepLink] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
  });

  const profile: User | null = useMemo(() => {
    if (profileQuery.data && profileQuery.data.id) return profileQuery.data;
    return user;
  }, [profileQuery.data, user]);

  // Messenger integrations
  const tgStatusQuery = useQuery({
    queryKey: ['telegram-status'],
    queryFn: () => api.getTelegramStatus(),
  });

  const maxStatusQuery = useQuery({
    queryKey: ['max-status'],
    queryFn: () => api.getMaxStatus(),
  });

  const tgLinkMutation = useMutation({
    mutationFn: () => api.linkTelegram(),
    onSuccess: (data) => { if (data.deepLink) setTgDeepLink(data.deepLink); },
    onError: () => Alert.alert('Ошибка', 'Не удалось создать ссылку'),
  });

  const tgUnlinkMutation = useMutation({
    mutationFn: () => api.unlinkTelegram(),
    onSuccess: () => { setTgDeepLink(null); void tgStatusQuery.refetch(); },
    onError: () => Alert.alert('Ошибка', 'Не удалось отключить Telegram'),
  });

  const maxLinkMutation = useMutation({
    mutationFn: () => api.linkMax(),
    onSuccess: (data) => { if (data.deepLink) setMaxDeepLink(data.deepLink); },
    onError: () => Alert.alert('Ошибка', 'Не удалось создать ссылку'),
  });

  const maxUnlinkMutation = useMutation({
    mutationFn: () => api.unlinkMax(),
    onSuccess: () => { setMaxDeepLink(null); void maxStatusQuery.refetch(); },
    onError: () => Alert.alert('Ошибка', 'Не удалось отключить MAX'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileUpdateData) => api.updateProfile(data),
    onSuccess: async (updated) => {
      if (updated && updated.id) {
        await updateUser(updated);
      }
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      Alert.alert('Ошибка', error.message || 'Не удалось обновить профиль');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Готово', 'Пароль изменён');
    },
    onError: (error: Error) => {
      Alert.alert('Ошибка', error.message || 'Не удалось изменить пароль');
    },
  });

  const startEdit = useCallback(() => {
    setEditFullName(profile?.fullName ?? '');
    setEditPhone(profile?.phone ?? '');
    setEditCity(profile?.city ?? '');
    setEditProfession(profile?.profession ?? '');
    setIsEditing(true);
  }, [profile]);

  const handleSave = useCallback(() => {
    updateMutation.mutate({
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      city: editCity.trim(),
      profession: editProfession.trim(),
    });
  }, [editFullName, editPhone, editCity, editProfession, updateMutation]);

  const handleChangePassword = useCallback(() => {
    if (!currentPassword.trim()) {
      Alert.alert('Внимание', 'Введите текущий пароль');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Внимание', 'Новый пароль должен быть не короче 8 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Внимание', 'Новые пароли не совпадают');
      return;
    }
    changePasswordMutation.mutate();
  }, [changePasswordMutation, confirmPassword, currentPassword, newPassword]);

  const handleLogout = useCallback(() => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  }, [logout]);

  const rawNumber = profile?.memberNumber || (profile as any)?.partnerNumber || '';
  const memberNumber = rawNumber ? rawNumber.toString().replace(/\D/g, '') : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профиль</Text>
        {!isEditing ? (
          <TouchableOpacity onPress={startEdit} style={styles.editButton}>
            <Edit3 color={Colors.primary} size={18} />
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.editActionBtn}>
              <X color={Colors.textMuted} size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.editActionBtn}>
              <Check color={Colors.success} size={20} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isFetching}
            onRefresh={() => void profileQuery.refetch()}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.fullName ?? 'U')}</Text>
          </View>
          <Text style={styles.fullName}>{profile?.fullName ?? 'Участник'}</Text>
          <Text style={styles.email}>{profile?.email ?? ''}</Text>
          {memberNumber ? (
            <Text style={styles.memberNum}>Электронный членский билет: {memberNumber}</Text>
          ) : null}
          <View style={styles.badges}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{getRoleLabel(profile?.role)}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {profile?.status === 'active' ? 'Активен' : profile?.status === 'pending' ? 'На рассмотрении' : profile?.status === 'blocked' ? 'Заблокирован' : profile?.status ?? 'Активен'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          {profile?.unionName && (
            <View style={styles.infoRow}>
              <Building2 color={Colors.textMuted} size={18} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Профсоюз</Text>
                <Text style={styles.infoValue}>{profile.unionName}</Text>
              </View>
            </View>
          )}
          {profile?.divisionName && (
            <View style={styles.infoRow}>
              <Shield color={Colors.textMuted} size={18} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Подразделение</Text>
                <Text style={styles.infoValue}>{profile.divisionName}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Messenger integrations */}
        <View style={styles.messengerSection}>
          {/* Telegram */}
          <View style={styles.messengerCard}>
            <View style={styles.messengerHeader}>
              <View style={[styles.messengerIconWrap, { backgroundColor: 'rgba(42,171,238,0.12)' }]}>
                <Send color="#2AABEE" size={18} />
              </View>
              <Text style={styles.messengerTitle}>Telegram</Text>
              {tgStatusQuery.data?.connected && (
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>Подключён</Text>
                </View>
              )}
            </View>
            {tgStatusQuery.data?.connected ? (
              /* STATE 3: Connected */
              <View style={styles.messengerBody}>
                <Text style={styles.messengerUsername}>
                  {tgStatusQuery.data.telegramUsername ? `@${tgStatusQuery.data.telegramUsername}` : tgStatusQuery.data.telegramFirstName}
                </Text>
                <TouchableOpacity
                  style={styles.disconnectBtn}
                  onPress={() => Alert.alert('Отключить Telegram?', 'Уведомления больше не будут приходить в Telegram.', [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Отключить', style: 'destructive', onPress: () => tgUnlinkMutation.mutate() },
                  ])}
                >
                  <Unlink color={Colors.error} size={14} />
                  <Text style={styles.disconnectBtnText}>Отключить</Text>
                </TouchableOpacity>
              </View>
            ) : tgDeepLink ? (
              /* STATE 2: Waiting for binding */
              <View style={styles.messengerBody}>
                <Text style={styles.messengerHint}>Откройте ссылку и нажмите Start в боте</Text>
                <TouchableOpacity
                  style={[styles.connectBtn, { backgroundColor: '#2AABEE' }]}
                  onPress={() => void Linking.openURL(tgDeepLink)}
                >
                  <Text style={styles.connectBtnText}>Открыть Telegram</Text>
                </TouchableOpacity>
                <Text style={styles.messengerExpiry}>Ссылка действительна 15 минут</Text>
                <TouchableOpacity
                  style={styles.refreshStatusBtn}
                  onPress={() => {
                    void tgStatusQuery.refetch().then(() => {
                      if (tgStatusQuery.data?.connected) setTgDeepLink(null);
                    });
                  }}
                >
                  <RefreshCw color={Colors.primary} size={14} />
                  <Text style={styles.refreshStatusText}>Я уже привязал — обновить статус</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* STATE 1: Not connected */
              <View style={styles.messengerBody}>
                <Text style={styles.messengerHint}>Подключите Telegram для получения уведомлений</Text>
                <TouchableOpacity
                  style={[styles.connectBtn, { backgroundColor: '#2AABEE' }]}
                  onPress={() => tgLinkMutation.mutate()}
                  disabled={tgLinkMutation.isPending}
                >
                  {tgLinkMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.connectBtnText}>Подключить</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* MAX */}
          <View style={styles.messengerCard}>
            <View style={styles.messengerHeader}>
              <View style={[styles.messengerIconWrap, { backgroundColor: 'rgba(91,46,255,0.12)' }]}>
                <Send color="#5B2EFF" size={18} />
              </View>
              <Text style={styles.messengerTitle}>MAX</Text>
              {maxStatusQuery.data?.connected && (
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>Подключён</Text>
                </View>
              )}
            </View>
            {maxStatusQuery.data?.connected ? (
              /* STATE 3: Connected */
              <View style={styles.messengerBody}>
                <Text style={styles.messengerUsername}>
                  {maxStatusQuery.data.maxUsername || maxStatusQuery.data.maxFirstName || 'Подключён'}
                </Text>
                <TouchableOpacity
                  style={styles.disconnectBtn}
                  onPress={() => Alert.alert('Отключить MAX?', 'Уведомления больше не будут приходить в MAX.', [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Отключить', style: 'destructive', onPress: () => maxUnlinkMutation.mutate() },
                  ])}
                >
                  <Unlink color={Colors.error} size={14} />
                  <Text style={styles.disconnectBtnText}>Отключить</Text>
                </TouchableOpacity>
              </View>
            ) : maxDeepLink ? (
              /* STATE 2: Waiting for binding */
              <View style={styles.messengerBody}>
                <Text style={styles.messengerHint}>Откройте ссылку и нажмите Start в боте</Text>
                <TouchableOpacity
                  style={[styles.connectBtn, { backgroundColor: '#5B2EFF' }]}
                  onPress={() => void Linking.openURL(maxDeepLink)}
                >
                  <Text style={styles.connectBtnText}>Открыть MAX</Text>
                </TouchableOpacity>
                <Text style={styles.messengerExpiry}>Ссылка действительна 15 минут</Text>
                <TouchableOpacity
                  style={styles.refreshStatusBtn}
                  onPress={() => {
                    void maxStatusQuery.refetch().then(() => {
                      if (maxStatusQuery.data?.connected) setMaxDeepLink(null);
                    });
                  }}
                >
                  <RefreshCw color={Colors.primary} size={14} />
                  <Text style={styles.refreshStatusText}>Я уже привязал — обновить статус</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* STATE 1: Not connected */
              <View style={styles.messengerBody}>
                <Text style={styles.messengerHint}>Подключите MAX для получения уведомлений</Text>
                <TouchableOpacity
                  style={[styles.connectBtn, { backgroundColor: '#5B2EFF' }]}
                  onPress={() => maxLinkMutation.mutate()}
                  disabled={maxLinkMutation.isPending}
                >
                  {maxLinkMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.connectBtnText}>Подключить</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.editSection}>
          <Text style={styles.editSectionTitle}>Личные данные</Text>

          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>ФИО</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={editFullName}
                onChangeText={setEditFullName}
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.fullName ?? '—'}</Text>
            )}
          </View>

          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Телефон</Text>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.phone ?? '—'}</Text>
            )}
          </View>

          <View style={styles.fieldCard}>
            <View style={styles.fieldRow}>
              <MapPin color={Colors.textMuted} size={16} />
              <Text style={styles.fieldLabel}>Город</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={editCity}
                onChangeText={setEditCity}
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.city ?? '—'}</Text>
            )}
          </View>

          <View style={styles.fieldCard}>
            <View style={styles.fieldRow}>
              <Briefcase color={Colors.textMuted} size={16} />
              <Text style={styles.fieldLabel}>Профессия</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.fieldInput}
                value={editProfession}
                onChangeText={setEditProfession}
                placeholderTextColor={Colors.textMuted}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.profession ?? '—'}</Text>
            )}
          </View>
        </View>

        <View style={styles.passwordSection}>
          <View style={styles.passwordHeader}>
            <KeyRound color={Colors.primary} size={18} />
            <Text style={styles.editSectionTitle}>Смена пароля</Text>
          </View>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Текущий пароль</Text>
            <TextInput
              style={styles.fieldInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Введите текущий пароль"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoComplete="current-password"
            />
          </View>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Новый пароль</Text>
            <TextInput
              style={styles.fieldInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Минимум 8 символов"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Подтвердите новый пароль</Text>
            <TextInput
              style={styles.fieldInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Повторите новый пароль"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>
          <TouchableOpacity
            style={[styles.changePasswordButton, changePasswordMutation.isPending && styles.disabledButton]}
            onPress={handleChangePassword}
            disabled={changePasswordMutation.isPending}
            activeOpacity={0.8}
          >
            {changePasswordMutation.isPending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.changePasswordText}>Изменить пароль</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut color={Colors.error} size={20} />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '800' as const,
  },
  fullName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  memberNum: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500' as const,
    marginBottom: 14,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  statusBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  editSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  fieldCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    color: Colors.text,
  },
  fieldInput: {
    fontSize: 15,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingVertical: 4,
  },
  passwordSection: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  changePasswordButton: {
    minHeight: 52,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.65,
  },
  changePasswordText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  messengerSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 10,
  },
  messengerCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  messengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  messengerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messengerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  connectedBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedBadgeText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  messengerBody: {
    gap: 10,
  },
  messengerUsername: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  messengerHint: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  messengerExpiry: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  connectBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  disconnectBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  refreshStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  refreshStatusText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
  },
  themeText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
