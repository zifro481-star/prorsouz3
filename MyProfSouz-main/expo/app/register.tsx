import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, Alert, ScrollView, ActivityIndicator,
  Dimensions, Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, Lock, ChevronDown, Square, CheckSquare, X } from 'lucide-react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import Colors from '@/constants/colors';
import type { Union, Division } from '@/types';

const { width: SW } = Dimensions.get('window');
const s = (size: number) => Math.round(size * Math.min(Math.max(SW / 375, 0.85), 1.25));

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUnion, setSelectedUnion] = useState<Union | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [showUnionPicker, setShowUnionPicker] = useState(false);
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptData, setAcceptData] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [docModal, setDocModal] = useState<{ title: string; text: string } | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const unionsQuery = useQuery({
    queryKey: ['unions'],
    queryFn: () => api.getUnions(),
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        unionId: selectedUnion?.id ?? '',
        divisionId: selectedDivision?.id ?? '',
        acceptTerms,
        acceptData,
        acceptPrivacy,
        consents: ['offer', 'privacy', 'personal_data'],
      }),
    onSuccess: () => {
      console.log('[Register] Success');
      router.replace('/');
    },
    onError: (error: Error) => {
      console.log('[Register] Error:', error.message);
      Alert.alert('Ошибка регистрации', error.message || 'Попробуйте ещё раз');
    },
  });

  const handlePressIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleRegister = () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Заполните все поля', 'Все поля обязательны для заполнения');
      return;
    }
    if (!selectedUnion) {
      Alert.alert('Выберите профсоюз', 'Укажите профсоюзную организацию');
      return;
    }
    if (!selectedDivision) {
      Alert.alert('Выберите подразделение', 'Укажите подразделение профсоюза');
      return;
    }
    if (!acceptTerms || !acceptPrivacy || !acceptData) {
      Alert.alert('Необходимо согласие', 'Примите оферту, политику конфиденциальности и согласие на обработку персональных данных');
      return;
    }
    registerMutation.mutate();
  };

  const unions: Union[] = unionsQuery.data ?? [];
  const divisions: Division[] = selectedUnion?.divisions ?? [];

  const DOCS = {
    offer: {
      title: 'Оферта',
      text: `ПУБЛИЧНАЯ ОФЕРТА

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Настоящий документ является официальным предложением (публичной офертой) профсоюзной организации и содержит все существенные условия предоставления услуг.
1.2. В соответствии с п. 2 ст. 437 Гражданского кодекса Российской Федерации данный документ является публичной офертой.
1.3. Акцептом настоящей оферты является регистрация на платформе и/или подача заявления о вступлении в профсоюз.

2. ПРЕДМЕТ ОФЕРТЫ
2.1. Профсоюзная организация предоставляет участнику доступ к платформе для получения информационных, консультационных и правовых услуг.
2.2. Объём и содержание услуг определяются текущим функционалом платформы.

3. ПРАВА И ОБЯЗАННОСТИ СТОРОН
3.1. Профсоюзная организация обязуется:
— обеспечить доступ к платформе;
— предоставлять консультационные услуги;
— защищать трудовые права участников.
3.2. Участник обязуется:
— предоставить достоверные данные при регистрации;
— соблюдать правила пользования платформой;
— своевременно уплачивать членские взносы.

4. ОТВЕТСТВЕННОСТЬ
4.1. Стороны несут ответственность в соответствии с действующим законодательством РФ.
4.2. Профсоюзная организация не несёт ответственности за убытки, возникшие вследствие форс-мажорных обстоятельств.

5. СРОК ДЕЙСТВИЯ
5.1. Оферта действует с момента публикации на платформе и до момента её отзыва.`,
    },
    privacy: {
      title: 'Политика конфиденциальности',
      text: `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

1. СБОР ИНФОРМАЦИИ
1.1. При регистрации и использовании платформы мы собираем следующие персональные данные: фамилия, имя, отчество; адрес электронной почты; номер телефона; место работы и должность.
1.2. Также автоматически собирается техническая информация: IP-адрес, тип устройства, версия операционной системы, данные об использовании приложения.

2. ИСПОЛЬЗОВАНИЕ ИНФОРМАЦИИ
2.1. Собранная информация используется для:
— идентификации пользователя;
— предоставления доступа к функционалу платформы;
— отправки уведомлений о мероприятиях и новостях;
— улучшения качества работы сервиса;
— формирования статистической отчётности.

3. ЗАЩИТА ИНФОРМАЦИИ
3.1. Мы принимаем необходимые организационные и технические меры для защиты персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.
3.2. Доступ к персональным данным имеют только уполномоченные сотрудники.

4. ПЕРЕДАЧА ДАННЫХ ТРЕТЬИМ ЛИЦАМ
4.1. Мы не передаём персональные данные третьим лицам без согласия пользователя, за исключением случаев, предусмотренных законодательством Российской Федерации.

5. ПРАВА ПОЛЬЗОВАТЕЛЯ
5.1. Пользователь имеет право:
— получить информацию о хранящихся персональных данных;
— потребовать исправления неточных данных;
— потребовать удаления персональных данных;
— отозвать согласие на обработку персональных данных.

6. ИЗМЕНЕНИЕ ПОЛИТИКИ
6.1. Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. Актуальная версия всегда доступна на платформе.`,
    },
    consent: {
      title: 'Согласие на обработку ПД',
      text: `СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ

Я, субъект персональных данных, в соответствии с Федеральным законом от 27.07.2006 г. № 152-ФЗ «О персональных данных», свободно, своей волей и в своём интересе даю согласие профсоюзной организации на обработку моих персональных данных.

ПЕРЕЧЕНЬ ПЕРСОНАЛЬНЫХ ДАННЫХ:
— фамилия, имя, отчество;
— адрес электронной почты;
— номер телефона;
— место работы и должность;
— город проживания;
— профессия.

ЦЕЛИ ОБРАБОТКИ:
— обеспечение участия в деятельности профсоюзной организации;
— предоставление правовой и консультационной поддержки;
— информирование о мероприятиях, акциях и новостях;
— формирование отчётности.

СПОСОБЫ ОБРАБОТКИ:
Сбор, запись, систематизация, накопление, хранение, уточнение, извлечение, использование, передача, обезличивание, блокирование, удаление, уничтожение персональных данных.

СРОК ДЕЙСТВИЯ:
Согласие действует с момента предоставления и до момента отзыва. Отзыв может быть подан в письменной форме.

Настоящее согласие может быть отозвано путём направления соответствующего заявления в профсоюзную организацию.`,
    },
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>

          <Text style={styles.title}>Регистрация</Text>
          <Text style={styles.subtitle}>Создайте аккаунт для доступа к платформе</Text>

          <View style={styles.inputWrapper}>
            <User color={Colors.textMuted} size={20} />
            <TextInput
              style={styles.input}
              placeholder="ФИО"
              placeholderTextColor={Colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              testID="register-fullname"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Mail color={Colors.textMuted} size={20} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="register-email"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Phone color={Colors.textMuted} size={20} />
            <TextInput
              style={styles.input}
              placeholder="Телефон"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              testID="register-phone"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock color={Colors.textMuted} size={20} />
            <TextInput
              style={styles.input}
              placeholder="Пароль"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              testID="register-password"
            />
          </View>

          {/* Union picker */}
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              setShowUnionPicker(!showUnionPicker);
              setShowDivisionPicker(false);
            }}
          >
            <Text style={[styles.pickerText, !selectedUnion && styles.pickerPlaceholder]}>
              {selectedUnion?.name ?? 'Выберите профсоюз'}
            </Text>
            {unionsQuery.isLoading ? (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            ) : (
              <ChevronDown color={Colors.textMuted} size={20} />
            )}
          </TouchableOpacity>

          {showUnionPicker && (
            <View style={[styles.pickerList, { maxHeight: SW * 0.6 }]}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                {unions.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.pickerItem,
                      selectedUnion?.id === u.id && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedUnion(u);
                      setSelectedDivision(null);
                      setShowUnionPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerItemText,
                      selectedUnion?.id === u.id && styles.pickerItemTextSelected,
                    ]}>
                      {u.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {unions.length === 0 && !unionsQuery.isLoading && (
                  <Text style={styles.emptyText}>Нет доступных профсоюзов</Text>
                )}
              </ScrollView>
            </View>
          )}

          {/* Division picker */}
          {selectedUnion && (
            <>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  setShowDivisionPicker(!showDivisionPicker);
                  setShowUnionPicker(false);
                }}
              >
                <Text style={[styles.pickerText, !selectedDivision && styles.pickerPlaceholder]}>
                  {selectedDivision?.name ?? 'Выберите подразделение'}
                </Text>
                <ChevronDown color={Colors.textMuted} size={20} />
              </TouchableOpacity>

              {showDivisionPicker && (
                <View style={[styles.pickerList, { maxHeight: SW * 0.6 }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                    {divisions.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        style={[
                          styles.pickerItem,
                          selectedDivision?.id === d.id && styles.pickerItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedDivision(d);
                          setShowDivisionPicker(false);
                        }}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          selectedDivision?.id === d.id && styles.pickerItemTextSelected,
                        ]}>
                          {d.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {divisions.length === 0 && (
                      <Text style={styles.emptyText}>Нет подразделений</Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {/* Checkboxes */}
          <View style={styles.checkboxRow}>
            <TouchableOpacity onPress={() => setAcceptTerms(!acceptTerms)} hitSlop={8}>
              {acceptTerms ? (
                <CheckSquare color={Colors.primary} size={s(22)} />
              ) : (
                <Square color={Colors.textMuted} size={s(22)} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAcceptTerms(!acceptTerms)} style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>Принимаю условия оферты</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDocModal(DOCS.offer)} hitSlop={8}>
              <Text style={styles.readLink}>Читать</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity onPress={() => setAcceptPrivacy(!acceptPrivacy)} hitSlop={8}>
              {acceptPrivacy ? (
                <CheckSquare color={Colors.primary} size={s(22)} />
              ) : (
                <Square color={Colors.textMuted} size={s(22)} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAcceptPrivacy(!acceptPrivacy)} style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>Принимаю политику конфиденциальности</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDocModal(DOCS.privacy)} hitSlop={8}>
              <Text style={styles.readLink}>Читать</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity onPress={() => setAcceptData(!acceptData)} hitSlop={8}>
              {acceptData ? (
                <CheckSquare color={Colors.primary} size={s(22)} />
              ) : (
                <Square color={Colors.textMuted} size={s(22)} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAcceptData(!acceptData)} style={{ flex: 1 }}>
              <Text style={styles.checkboxLabel}>Даю согласие на обработку ПД</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setDocModal(DOCS.consent)} hitSlop={8}>
              <Text style={styles.readLink}>Читать</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.registerButton, registerMutation.isPending && styles.buttonDisabled]}
              onPress={handleRegister}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={registerMutation.isPending}
              activeOpacity={0.8}
              testID="register-submit"
            >
              <Text style={styles.registerButtonText}>
                {registerMutation.isPending ? 'Регистрация...' : 'Зарегистрироваться'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
            <Text style={styles.loginText}>
              Уже есть аккаунт? <Text style={styles.loginTextBold}>Войти</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!docModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{docModal?.title}</Text>
              <TouchableOpacity onPress={() => setDocModal(null)} hitSlop={12}>
                <X color={Colors.text} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator style={styles.modalScroll}>
              <Text style={styles.modalText}>{docModal?.text}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDocModal(null)}>
              <Text style={styles.modalCloseBtnText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: s(24),
    paddingTop: s(56),
    paddingBottom: s(40),
  },
  backButton: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: s(24),
  },
  title: {
    fontSize: s(26),
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: s(6),
  },
  subtitle: {
    fontSize: s(14),
    color: Colors.textSecondary,
    marginBottom: s(28),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: s(14),
    paddingHorizontal: s(16),
    paddingVertical: s(4),
    marginBottom: s(12),
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: s(15),
    paddingVertical: s(13),
    marginLeft: s(12),
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: s(14),
    paddingHorizontal: s(16),
    paddingVertical: s(14),
    marginBottom: s(12),
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  pickerText: {
    color: Colors.text,
    fontSize: s(15),
    flex: 1,
  },
  pickerPlaceholder: {
    color: Colors.textMuted,
  },
  pickerList: {
    backgroundColor: Colors.surface,
    borderRadius: s(12),
    marginBottom: s(12),
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: s(16),
    paddingVertical: s(13),
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  pickerItemText: {
    color: Colors.text,
    fontSize: s(14),
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: s(13),
    padding: s(16),
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(14),
    gap: s(10),
  },
  checkboxLabel: {
    color: Colors.textSecondary,
    fontSize: s(13),
    flex: 1,
  },
  readLink: {
    color: Colors.primary,
    fontSize: s(13),
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: s(14),
    paddingVertical: s(15),
    alignItems: 'center',
    marginTop: s(8),
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: Colors.white,
    fontSize: s(16),
    fontWeight: '700' as const,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: s(24),
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: s(14),
  },
  loginTextBold: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: s(16),
    paddingVertical: s(40),
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: s(20),
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    paddingVertical: s(16),
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {
    fontSize: s(18),
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: s(20),
  },
  modalText: {
    fontSize: s(13),
    color: Colors.textSecondary,
    lineHeight: s(20),
    paddingVertical: s(16),
  },
  modalCloseBtn: {
    backgroundColor: Colors.primary,
    margin: s(16),
    borderRadius: s(12),
    paddingVertical: s(14),
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: Colors.white,
    fontSize: s(15),
    fontWeight: '600' as const,
  },
});
