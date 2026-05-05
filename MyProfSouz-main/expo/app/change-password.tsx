import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import Colors from '@/constants/colors';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Успех', 'Пароль изменён');
    },
    onError: (error: Error) => {
      Alert.alert('Ошибка', error.message || 'Ошибка сервера');
    },
  });

  const onSubmit = () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Ошибка', 'Новый пароль должен быть не короче 8 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Сменить пароль' }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Безопасность аккаунта</Text>

          <View style={styles.inputWrapper}>
            <Lock color={Colors.textMuted} size={20} />
            <TextInput
              style={styles.input}
              placeholder="Текущий пароль"
              placeholderTextColor={Colors.textMuted}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              autoComplete="current-password"
            />
            <TouchableOpacity onPress={() => setShowCurrentPassword((prev) => !prev)}>
              {showCurrentPassword ? (
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
              placeholder="Новый пароль (минимум 8 символов)"
              placeholderTextColor={Colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowNewPassword((prev) => !prev)}>
              {showNewPassword ? (
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
              placeholder="Повторите новый пароль"
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
            style={[styles.submitButton, mutation.isPending && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.8}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Сохранить</Text>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
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
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
