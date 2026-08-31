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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Mancano alcuni dati', 'Inserisci email e password per continuare.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert(
        'Accesso non riuscito',
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
        <View style={styles.brand}>
          <Text style={styles.eyebrow}>MYZUBSTER</Text>
          <Text style={styles.title}>Le competenze si incontrano</Text>
          <Text style={styles.subtitle}>
            Trova una persona che può aiutarti oppure offri quello che sai fare.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entra nel tuo spazio</Text>
          <Text style={styles.cardIntro}>Servono solo email e password.</Text>

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
            placeholder="La tua password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            autoComplete="password"
            textContentType="password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entra in MyZubster"
            disabled={loading}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#052e2b" />
            ) : (
              <Text style={styles.primaryButtonText}>Entra</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Register')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>Crea un account</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showAdvanced }}
            onPress={() => setShowAdvanced(value => !value)}
            style={styles.advancedToggle}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Nascondi accesso avanzato' : 'Accesso avanzato'}
            </Text>
            <Text style={styles.chevron}>{showAdvanced ? '−' : '+'}</Text>
          </Pressable>

          {showAdvanced && (
            <View style={styles.advancedPanel}>
              <Text style={styles.advancedText}>
                L’accesso anonimo con wallet Monero è destinato a utenti esperti.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('AnonymousLogin')}
                style={styles.walletButton}
              >
                <Text style={styles.walletButtonText}>Continua con wallet Monero</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          Nessun pagamento o contratto viene creato automaticamente.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#07111f' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 32 },
  brand: { marginBottom: 24 },
  eyebrow: { color: '#5eead4', fontSize: 13, fontWeight: '800', letterSpacing: 1.6 },
  title: { color: '#ffffff', fontSize: 34, lineHeight: 40, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#cbd5e1', fontSize: 17, lineHeight: 25, marginTop: 12 },
  card: { backgroundColor: '#111c2e', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#263550' },
  cardTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  cardIntro: { color: '#a8b3c7', fontSize: 15, marginTop: 6, marginBottom: 20 },
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
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5eead4',
    borderRadius: 12,
    marginTop: 4,
  },
  primaryButtonText: { color: '#052e2b', fontSize: 18, fontWeight: '900' },
  secondaryButton: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#5eead4',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
  },
  secondaryButtonText: { color: '#99f6e4', fontSize: 17, fontWeight: '800' },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { backgroundColor: '#64748b' },
  divider: { height: 1, backgroundColor: '#263550', marginVertical: 20 },
  advancedToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advancedToggleText: { color: '#cbd5e1', fontSize: 15, fontWeight: '800' },
  chevron: { color: '#5eead4', fontSize: 24, fontWeight: '700' },
  advancedPanel: { backgroundColor: '#0b1628', borderRadius: 12, padding: 14, marginTop: 8 },
  advancedText: { color: '#a8b3c7', fontSize: 14, lineHeight: 20 },
  walletButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#a78bfa',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 12,
  },
  walletButtonText: { color: '#c4b5fd', fontWeight: '800' },
  footer: { color: '#94a3b8', textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 18 },
});
