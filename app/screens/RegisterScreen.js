import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!email.trim() || !password || !name.trim()) {
      Alert.alert('Mancano alcuni dati', 'Compila nome, email e password per continuare.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      Alert.alert('Account creato', 'Ora puoi iniziare a cercare o offrire una competenza.');
    } catch (error) {
      Alert.alert(
        'Registrazione non riuscita',
        error.response?.data?.message || error.response?.data?.error || error.message || 'Controlla i dati e riprova.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Torna alla schermata di accesso"
          onPress={() => navigation.navigate('Login')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹ Torna indietro</Text>
        </Pressable>

        <View style={styles.brand}>
          <Text style={styles.eyebrow}>MYZUBSTER</Text>
          <Text style={styles.title}>Crea il tuo account</Text>
          <Text style={styles.subtitle}>
            Bastano tre dati. Wallet, GitHub e altre funzioni avanzate non sono obbligatori.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nome visibile</Text>
          <TextInput
            accessibilityLabel="Nome visibile"
            style={styles.input}
            placeholder="Come vuoi essere chiamato?"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
          />
          <Text style={styles.help}>È il nome mostrato alle altre persone.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            style={styles.input}
            placeholder="nome@email.it"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            accessibilityLabel="Password"
            style={styles.input}
            placeholder="Scegli una password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crea account MyZubster"
            disabled={loading}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#052e2b" />
            ) : (
              <Text style={styles.primaryButtonText}>Crea account</Text>
            )}
          </Pressable>

          <Text style={styles.privacy}>
            Creando l’account potrai controllare le tue attività. Pagamenti e contratti non vengono attivati automaticamente.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginLinkText}>Hai già un account? Entra</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07111f' },
  content: { flexGrow: 1, padding: 20, paddingVertical: 28 },
  backButton: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  backButtonText: { color: '#99f6e4', fontSize: 16, fontWeight: '800' },
  brand: { marginTop: 8, marginBottom: 24 },
  eyebrow: { color: '#5eead4', fontSize: 13, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#ffffff', fontSize: 32, lineHeight: 38, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#cbd5e1', fontSize: 17, lineHeight: 25, marginTop: 12 },
  card: { backgroundColor: '#111c2e', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#263550' },
  label: { color: '#e2e8f0', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  input: {
    minHeight: 52,
    backgroundColor: '#07111f',
    color: '#ffffff',
    borderColor: '#3b4c67',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    marginBottom: 10,
  },
  help: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 16, marginTop: -2 },
  primaryButton: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5eead4',
    borderRadius: 12,
    marginTop: 8,
  },
  primaryButtonText: { color: '#052e2b', fontSize: 18, fontWeight: '900' },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { backgroundColor: '#64748b' },
  privacy: { color: '#94a3b8', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 16 },
  loginLink: { minHeight: 52, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  loginLinkText: { color: '#99f6e4', fontSize: 16, fontWeight: '800' },
});
