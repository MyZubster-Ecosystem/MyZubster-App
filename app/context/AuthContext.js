import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@MyZubster:token');
      const storedUser = await AsyncStorage.getItem('@MyZubster:user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/users/login', { email, password });
      const { token: nextToken, user: nextUser } = response.data;

      setToken(nextToken);
      setUser(nextUser);
      api.defaults.headers.Authorization = `Bearer ${nextToken}`;

      await AsyncStorage.setItem('@MyZubster:token', nextToken);
      await AsyncStorage.setItem('@MyZubster:user', JSON.stringify(nextUser));

      return nextUser;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await api.post('/users/register', { email, password, name });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    delete api.defaults.headers.Authorization;
    await AsyncStorage.removeItem('@MyZubster:token');
    await AsyncStorage.removeItem('@MyZubster:user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
