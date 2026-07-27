import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.my-zubster.com';

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill all fields'); return; }
    if (!isLogin && !name) { Alert.alert('Error', 'Name is required'); return; }
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };
      const res = await fetch(API_URL + endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        navigation.replace('Home');
      } else {
        Alert.alert('Error', data.message || 'Authentication failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
      {!isLogin && (
        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      )}
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Register'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text style={styles.switchText}>{isLogin ? 'Need an account? Register' : 'Have an account? Login'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0d1117' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f7931a', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#161b22', color: '#c9d1d9', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#30363d', fontSize: 16 },
  button: { backgroundColor: '#f7931a', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#0d1117', fontWeight: 'bold', fontSize: 16 },
  switchText: { color: '#58a6ff', textAlign: 'center', marginTop: 20, fontSize: 14 },
});
