import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { isValidEmail, isValidPassword } from '../utils/validators';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('❌ Errore', 'Inserisci email e password.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('❌ Errore', 'Inserisci un indirizzo email valido.');
      return;
    }
    if (!isValidPassword(password)) {
      Alert.alert('❌ Errore', 'La password deve contenere almeno 6 caratteri.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('❌ Login fallito', error.message || 'Credenziali non valide.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 MyZubster</Text>
      <Text style={styles.subtitle}>Accedi al tuo account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>🚀 Accedi</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>Non hai un account? Registrati</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('AnonymousLogin')}>
        <Text style={styles.anonymousText}>🕶️ Accedi con wallet Monero (anonimo)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#4CAF50' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  loginButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  registerText: { textAlign: 'center', marginTop: 16, color: '#2196F3' },
  anonymousText: { textAlign: 'center', marginTop: 14, color: '#7B2FBE', fontWeight: '600' },
});
