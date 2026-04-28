import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { User, RegisterData } from '@/types';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const restore = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const savedUser = await AsyncStorage.getItem('auth_user');
        if (token && savedUser) {
          const parsed = JSON.parse(savedUser) as User;
          setUser(parsed);
          setIsAuthenticated(true);
          console.log('[Auth] Session restored for', parsed.email);
        }
      } catch (e) {
        console.log('[Auth] Failed to restore session', e);
      } finally {
        setIsLoading(false);
      }
    };
    void restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Logging in', email);
    const response = await api.login(email, password);
    const u = response.user;
    await AsyncStorage.setItem('auth_user', JSON.stringify(u));
    setUser(u);
    setIsAuthenticated(true);
    console.log('[Auth] Login success', u.fullName);
    return u;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    console.log('[Auth] Registering', data.email);
    const response = await api.register(data);
    const u = response.user;
    try {
      await api.assignNewUserToDefaultLeader(u);
      console.log('[Auth] New user assigned to default leader');
    } catch (e) {
      console.log('[Auth] Failed to assign new user to default leader', e);
    }
    await AsyncStorage.setItem('auth_user', JSON.stringify(u));
    setUser(u);
    setIsAuthenticated(true);
    console.log('[Auth] Register success', u.fullName);
    return u;
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out');
    try {
      await api.logout();
    } catch (e) {
      console.log('[Auth] Logout API error (ignoring)', e);
    }
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setUser(null);
    setIsAuthenticated(false);
    queryClient.clear();
  }, [queryClient]);

  const updateUser = useCallback(async (updated: User) => {
    setUser(updated);
    await AsyncStorage.setItem('auth_user', JSON.stringify(updated));
  }, []);

  return useMemo(() => ({
    user, isLoading, isAuthenticated, login, register, logout, updateUser,
  }), [user, isLoading, isAuthenticated, login, register, logout, updateUser]);
});
