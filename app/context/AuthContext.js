import React, { createContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthToken } from '../services/api';
import { getProfile, updateProfile, verifyMoneroSignature } from '../services/authService';

export const AuthContext = createContext(null);

const TOKEN_KEY = '@MyZubster:token';
const USER_KEY = '@MyZubster:user';

async function readToken() {
  try {
    const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
    return secureToken || AsyncStorage.getItem(TOKEN_KEY);
  } catch { return AsyncStorage.getItem(TOKEN_KEY); }
}

async function writeToken(token) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
  } catch {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

async function removeToken() {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* best effort */ }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([readToken(), AsyncStorage.getItem(USER_KEY)]);
        if (mounted && storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthToken(storedToken);
        }
      } catch (error) {
        console.warn('Unable to restore session:', error?.message || error);
        await Promise.all([removeToken(), AsyncStorage.removeItem(USER_KEY)]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persistSession = async (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);
    await Promise.all([writeToken(nextToken), AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser))]);
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email: email.trim(), password });
    const nextToken = response.data?.token;
    const nextUser = response.data?.user || response.data?.data?.user;
    if (!nextToken || !nextUser) throw new Error('Login response is missing token or user');
    await persistSession(nextToken, nextUser);
    return nextUser;
  };

  const register = async (email, password, name) => {
    const response = await api.post('/auth/register', { email: email.trim(), password, name: name.trim() });
    return response.data;
  };

  const loginAnonymous = async ({ walletAddress, nickname, message, signature }) => {
    const response = await verifyMoneroSignature({ walletAddress, nickname, message, signature });
    const nextToken = response?.token;
    const nextUser = response?.user || response?.data?.user || {
      id: response?.id,
      username: response?.username || nickname,
      name: response?.name || nickname,
      walletAddress,
      anonymous: true,
    };
    if (!nextToken) throw new Error('Anonymous login response is missing a JWT token.');
    await persistSession(nextToken, nextUser);
    return nextUser;
  };

  const refreshProfile = async () => {
    const nextUser = await getProfile();
    setUser(nextUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    return nextUser;
  };

  const saveProfile = async profile => {
    const nextUser = await updateProfile({ ...user, ...profile });
    setUser(nextUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    return nextUser;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await Promise.all([removeToken(), AsyncStorage.removeItem(USER_KEY)]);
  };

  const value = useMemo(
    () => ({ user, token, loading, login, register, loginAnonymous, refreshProfile, saveProfile, logout }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
