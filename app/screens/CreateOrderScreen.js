import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { createOrder } from '../services/orderService';

export default function CreateOrderScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const [skillId, setSkillId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    if (!skillId || !amount) {
      Alert.alert('❌ ' + t('createOrder.error'), t('createOrder.errorMessage'));
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder({
        skillId,
        amount: parseFloat(amount),
        currency: currency.trim().toUpperCase(),
        customerEmail: user?.email,
      });

      Alert.alert('✅ ' + t('common.success'), t('createOrder.successMessage'));
      navigation.navigate('Order', { orderId: order.id || order._id });
    } catch (error) {
      console.error('Errore creazione ordine:', error);
      Alert.alert('❌ ' + t('createOrder.error'), error.response?.data?.error || t('createOrder.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('createOrder.title')}</Text>

      <Text style={styles.label}>{t('createOrder.skillId')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('createOrder.skillIdPlaceholder')}
        value={skillId}
        onChangeText={setSkillId}
        keyboardType="numeric"
      />

      <Text style={styles.label}>{t('createOrder.amount')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('createOrder.amountPlaceholder')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>{t('createOrder.currency')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('createOrder.currencyPlaceholder')}
        value={currency}
        onChangeText={setCurrency}
        autoCapitalize="characters"
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabled]}
        onPress={handleCreateOrder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>{t('createOrder.createButton')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  submitButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  disabled: { backgroundColor: '#a5d6a7' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelButton: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#666', fontSize: 16 },
});
