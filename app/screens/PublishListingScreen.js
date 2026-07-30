import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { publishListing } from '../services/listingsService';

const { getUserId } = require('../services/listingUtils');

const getErrorMessage = (error) =>
  error.response?.data?.error ||
  error.message ||
  'The listing could not be published.';

export default function PublishListingScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceXmr, setPriceXmr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    try {
      setSubmitting(true);
      await publishListing({
        userId: getUserId(user),
        title,
        description,
        priceXmr,
      });
      Alert.alert('Published', 'Your skill is now listed in the marketplace.');
      navigation.navigate('Marketplace', { refreshAt: Date.now() });
    } catch (error) {
      Alert.alert('Unable to publish', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Publish a skill</Text>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          accessibilityLabel="Listing title"
          maxLength={120}
          onChangeText={setTitle}
          placeholder="What can you deliver?"
          style={styles.input}
          value={title}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          accessibilityLabel="Listing description"
          maxLength={2000}
          multiline
          onChangeText={setDescription}
          placeholder="Describe the scope and expected delivery."
          style={[styles.input, styles.descriptionInput]}
          textAlignVertical="top"
          value={description}
        />

        <Text style={styles.label}>Price in XMR</Text>
        <TextInput
          accessibilityLabel="Listing price in XMR"
          keyboardType="decimal-pad"
          onChangeText={setPriceXmr}
          placeholder="0.05"
          style={styles.input}
          value={priceXmr}
        />

        <Text style={styles.hint}>
          The listing will be attached to your signed-in user profile.
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={submitting}
          onPress={submit}
          style={[styles.submitButton, submitting && styles.disabledButton]}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Publish listing</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  content: {
    padding: 18,
  },
  header: {
    marginBottom: 24,
  },
  back: {
    color: '#2e7d32',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  heading: {
    color: '#17202a',
    fontSize: 24,
    fontWeight: '800',
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d8dee4',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  descriptionInput: {
    minHeight: 140,
  },
  hint: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 13,
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
