import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil((ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
}

export default function PinPrompt({ mode = 'enter', onSubmit, onDismiss, visible }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [lockUntil, setLockUntil] = useState(null);
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!visible) {
      setPin('');
      setConfirm('');
      setError('');
      return;
    }
    setError('');
  }, [visible]);

  const isLocked = useMemo(() => lockUntil && Date.now() < lockUntil, [lockUntil]);

  const handlePress = digit => {
    if (isLocked) return;
    setError('');
    if (mode === 'enter') {
      if (pin.length >= 6) return;
      const next = pin + digit;
      setPin(next);
      if (next.length === 4 || next.length === 6) {
        onSubmit?.(next);
        setPin('');
      }
    } else {
      if (pin.length < 6 && confirm.length < 6) {
        if (pin.length < 6) setPin(pin + digit);
        else setConfirm(confirm + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    setError('');
    if (mode === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      if (confirm.length > 0) setConfirm(prev => prev.slice(0, -1));
      else if (pin.length > 0) setPin(prev => prev.slice(0, -1));
    }
  };

  const submitCreate = async () => {
    if (pin.length < 4 || pin.length > 6) return Alert.alert('PIN', 'Inserisci un PIN di 4-6 cifre.');
    if (pin !== confirm) return Alert.alert('PIN', 'I due PIN non corrispondono.');
    onSubmit?.(pin);
    setPin('');
    setConfirm('');
  };

  const dots = useMemo(() => {
    const length = mode === 'enter' ? pin.length : pin.length + confirm.length;
    return Array.from({ length: 6 }).map((_, i) => ({ filled: i < length }));
  }, [mode, pin, confirm]);

  const lockLabel = useMemo(() => {
    if (!isLocked) return '';
    return `Bloccato. Riprova tra ${formatMs(lockUntil - Date.now())}`;
  }, [isLocked, lockUntil]);

  useEffect(() => {
    if (!isLocked) return;
    const id = setInterval(() => setLockUntil(prev => prev), 1000);
    return () => clearInterval(id);
  }, [isLocked]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'enter' ? 'Inserisci PIN' : 'Crea PIN'}</Text>
        <View style={styles.dotsRow}>
          {dots.map((dot, i) => (
            <View key={i} style={[styles.dot, dot.filled && styles.dotFilled]} />
          ))}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!lockLabel && <Text style={styles.error}>{lockLabel}</Text>}
        {!!remaining && !isLocked && <Text style={styles.muted}>Tentativi rimasti: {remaining}</Text>}

        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <TouchableOpacity key={d} style={styles.key} onPress={() => handlePress(String(d))} disabled={isLocked}>
              <Text style={styles.keyText}>{d}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.key} onPress={() => onDismiss?.()} disabled={isLocked}>
            <Text style={styles.keyText}>Annulla</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={() => handlePress('0')} disabled={isLocked}>
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.key} onPress={handleBackspace} disabled={isLocked}>
            <Text style={styles.keyText}>⌫</Text>
          </TouchableOpacity>
        </View>

        {mode === 'create' && (
          <TouchableOpacity style={styles.primaryButton} onPress={submitCreate}>
            <Text style={styles.buttonText}>Salva PIN</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ddd' },
  dotFilled: { backgroundColor: '#222' },
  error: { color: '#c62828', marginBottom: 8, textAlign: 'center' },
  muted: { color: '#555', marginBottom: 8 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between', marginTop: 10 },
  key: { width: '30%', aspectRatio: 1.4, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  keyText: { fontSize: 22, fontWeight: '600' },
  primaryButton: { marginTop: 14, backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
