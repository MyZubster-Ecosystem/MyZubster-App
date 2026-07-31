import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { setBiometricUnlocked } from '../services/biometricService';

export default function UnlockScreen({ navigation }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, logout } = useContext(AuthContext);

  const handleUnlock = async () => {
    // 快速解锁（降级模式）：仅作本机便利性保护，不重新向服务器验证密码。
    // 输入框必须非空，并通过 300ms 延迟做基础节流，避免暴力尝试。
    // 需要完整安全验证时，用户应选择下方"使用密码登录"走正常登录流程。
    if (!password) {
      Alert.alert('🔒 Unlock', 'Inserisci la tua password.');
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await setBiometricUnlocked(true);
      // AppNavigator 订阅了解锁事件，会自动复位 needsUnlock 并切回主界面，
      // 因此无需在这里手动导航（本 Stack 也没有注册 Dashboard）。
    } catch (error) {
      Alert.alert('🔒 Unlock fallito', error.message || 'Impossibile sbloccare.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginFallback = async () => {
    try {
      await logout();
      // logout 使 user 变为 null，AppNavigator 自动渲染登录流程。
    } catch (error) {
      Alert.alert('🔒 Unlock', error.message || 'Impossibile uscire.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔓 Sblocco rapido</Text>
      <Text style={styles.subtitle}>Benvenuto, {user?.name || user?.email || 'utente'}!</Text>
      <Text style={styles.hint}>
        Sblocco rapido (modalità ridotta): non verifica la password sul server, è solo una protezione locale di comodo.
        Per una verifica completa usa "Accedi con credenziali".
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.unlockButtonText}>🔓 Sblocca</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={handleLoginFallback}>
        <Text style={styles.fallbackText}>Accedi con credenziali</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#4CAF50', marginBottom: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666' },
  hint: { fontSize: 12, textAlign: 'center', marginBottom: 16, color: '#8a8a8a', paddingHorizontal: 8 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  unlockButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' },
  unlockButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fallbackText: { textAlign: 'center', marginTop: 16, color: '#2196F3' },
});
