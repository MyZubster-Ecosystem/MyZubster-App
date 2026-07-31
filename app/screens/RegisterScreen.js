import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { isValidEmail, isValidPassword } from '../utils/validators';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const { t } = useLanguage();

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('❌ ' + t('auth.registerError'), t('auth.fillAllFields'));
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('❌ ' + t('auth.registerError'), 'Inserisci un indirizzo email valido.');
      return;
    }
    if (!isValidPassword(password)) {
      Alert.alert('❌ ' + t('auth.registerError'), 'La password deve contenere almeno 6 caratteri.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      Alert.alert('✅ ' + t('common.success'), t('auth.registerSuccess'));
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('❌ ' + t('auth.registerError'), error.message || '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.registerTitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('auth.name')}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerButtonText}>{t('auth.registerButton')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  registerButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginText: { textAlign: 'center', marginTop: 16, color: '#2196F3' },
});
