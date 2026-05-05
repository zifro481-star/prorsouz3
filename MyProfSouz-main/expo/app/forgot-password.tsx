import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, ArrowLeft, CheckCircle, Lock, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { api } from '@/services/api';
import Colors from '@/constants/colors';

type Step = 'request' | 'verify' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (step !== 'verify' || !expiresAt) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step, expiresAt]);

  const timerText = useMemo(() => {
    if (!expiresAt) return null;
    const msLeft = expiresAt - nowTick;
    if (msLeft <= 0) return 'Код истёк. Запросите новый.';
    const totalSeconds = Math.floor(msLeft / 1000);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `Код действует: ${min}:${sec.toString().padStart(2, '0')}`;
  }, [expiresAt, nowTick]);

  const handleRequestCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Ошибка', 'Укажите email');
      return;
    }

    setRequestLoading(true);
    try {
      await api.forgotPassword(trimmed);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setExpiresAt(Date.now() + 15 * 60 * 1000);
      setStep('verify');
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Ошибка сервера';
      Alert.alert('Ошибка', message);
    } finally {
      setRequestLoading(false);
    }
  };

  const handleSetPassword = async () => {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!(trimmedCode.length === 6 && /^\d+$/.test(trimmedCode))) {
      Alert.alert('Ошибка', 'Введите 6-значный код из цифр');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Ошибка', 'Пароль должен быть не короче 8 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    setVerifyLoading(true);
    try {
      await api.verifyResetCode(trimmedEmail, trimmedCode, newPassword);
      setStep('success');
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Ошибка сервера';
      Alert.alert('Ошибка', message);
    } finally {
      setVerifyLoading(false);
    }
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

          {step === 'success' ? (
            <View style={styles.successSection}>
              <View style={styles.successCircle}>
                <CheckCircle color={Colors.success} size={48} />
              </View>
              <Text style={styles.successTitle}>Готово</Text>
              <Text style={styles.successText}>
                Пароль изменён. Войдите с новым паролем.
              </Text>
              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.backToLoginText}>Войти</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'request' ? (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Восстановление пароля</Text>
              <Text style={styles.formSubtitle}>
                Введите email, указанный при регистрации.
              </Text>

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
                  autoComplete="email"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, requestLoading && styles.submitButtonDisabled]}
                onPress={handleRequestCode}
                disabled={requestLoading}
                activeOpacity={0.8}
              >
                {requestLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Получить код</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Введите код</Text>
              <Text style={styles.formSubtitle}>
                Мы отправили 6-значный код на {email.trim()}.
              </Text>
              <Text style={styles.hintText}>Если не пришло письмо, проверьте папку Спам.</Text>
              {timerText ? <Text style={styles.timerText}>{timerText}</Text> : null}

              <View style={styles.inputWrapper}>
                <KeyRound color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Код из письма"
                  placeholderTextColor={Colors.textMuted}
                  value={code}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Новый пароль (минимум 8 символов)"
                  placeholderTextColor={Colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
                  {showPassword ? (
                    <EyeOff color={Colors.textMuted} size={20} />
                  ) : (
                    <Eye color={Colors.textMuted} size={20} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Lock color={Colors.textMuted} size={20} />
                <TextInput
                  style={styles.input}
                  placeholder="Повторите пароль"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)}>
                  {showConfirmPassword ? (
                    <EyeOff color={Colors.textMuted} size={20} />
                  ) : (
                    <Eye color={Colors.textMuted} size={20} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, verifyLoading && styles.submitButtonDisabled]}
                onPress={handleSetPassword}
                disabled={verifyLoading}
                activeOpacity={0.8}
              >
                {verifyLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Установить пароль</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLink}
                onPress={() => setStep('request')}
              >
                <Text style={styles.cancelText}>Запросить новый код</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    width: '100%',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  hintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  timerText: {
    fontSize: 13,
    color: Colors.primary,
    marginBottom: 14,
    fontWeight: '600' as const,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 14,
    marginLeft: 12,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  cancelLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  successSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(34,197,94,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backToLoginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backToLoginText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
