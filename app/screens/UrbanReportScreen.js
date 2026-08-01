import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  MAX_URBAN_REPORT_PHOTOS,
  URBAN_REPORT_PRIORITIES,
  URBAN_REPORT_TYPES,
  createUrbanReport,
} from '../services/urbanReportService';

export default function UrbanReportScreen({ navigation }) {
  const [type, setType] = useState('road');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [photoInput, setPhotoInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const captureLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Posizione', 'Permesso GPS negato. La segnalazione richiede coordinate verificabili.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (error) {
      Alert.alert('Posizione', error.message || 'Impossibile ottenere la posizione corrente.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    captureLocation();
  }, []);

  const addPhoto = () => {
    const next = photoInput.trim();
    if (!next) return;
    if (photos.length >= MAX_URBAN_REPORT_PHOTOS) {
      Alert.alert('Foto', `Puoi allegare al massimo ${MAX_URBAN_REPORT_PHOTOS} foto.`);
      return;
    }
    setPhotos(current => [...current, next]);
    setPhotoInput('');
  };

  const pickPhotos = async () => {
    const remaining = MAX_URBAN_REPORT_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert('Foto', `Puoi allegare al massimo ${MAX_URBAN_REPORT_PHOTOS} foto.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Foto', 'Permesso galleria negato.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: remaining,
    });

    if (result.canceled) return;

    const selected = result.assets.map(asset => asset.uri).filter(Boolean);
    setPhotos(current => [...current, ...selected].slice(0, MAX_URBAN_REPORT_PHOTOS));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const report = await createUrbanReport({ type, priority, description, photos, location });
      Alert.alert('Segnalazione inviata', 'Il comune puo ora verificarla e aggiornarne lo stato.', [
        { text: 'Dashboard', onPress: () => navigation.replace('MunicipalReports', { reportId: report.id }) },
      ]);
    } catch (error) {
      Alert.alert('Segnalazione', error.response?.data?.error || error.message || 'Invio non riuscito.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>Indietro</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Segnala un problema</Text>
      <Text style={styles.subtitle}>Registra una criticita urbana con GPS, priorita e foto di supporto.</Text>

      <Text style={styles.label}>Tipologia</Text>
      <View style={styles.options}>
        {URBAN_REPORT_TYPES.map(option => (
          <TouchableOpacity key={option.id} style={[styles.option, type === option.id && styles.optionSelected]} onPress={() => setType(option.id)}>
            <Text style={[styles.optionText, type === option.id && styles.optionTextSelected]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Priorita</Text>
      <View style={styles.options}>
        {URBAN_REPORT_PRIORITIES.map(option => (
          <TouchableOpacity key={option.id} style={[styles.option, priority === option.id && styles.optionSelected]} onPress={() => setPriority(option.id)}>
            <Text style={[styles.optionText, priority === option.id && styles.optionTextSelected]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Descrizione</Text>
      <TextInput
        style={styles.description}
        placeholder="Descrivi il problema, il punto esatto e qualsiasi rischio immediato."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Posizione GPS</Text>
      <View style={styles.locationBox}>
        <Text style={styles.locationText}>
          {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Nessuna posizione acquisita'}
        </Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={captureLocation} disabled={locating}>
          {locating ? <ActivityIndicator color="#1976D2" /> : <Text style={styles.secondaryButtonText}>Aggiorna GPS</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Foto ({photos.length}/{MAX_URBAN_REPORT_PHOTOS})</Text>
      <TouchableOpacity style={styles.pickButton} onPress={pickPhotos}>
        <Text style={styles.pickButtonText}>Scegli foto dalla galleria</Text>
      </TouchableOpacity>
      <View style={styles.photoRow}>
        <TextInput style={styles.photoInput} placeholder="URI o URL foto" value={photoInput} onChangeText={setPhotoInput} autoCapitalize="none" />
        <TouchableOpacity style={styles.addButton} onPress={addPhoto}>
          <Text style={styles.addButtonText}>Aggiungi</Text>
        </TouchableOpacity>
      </View>
      {photos.map((photo, index) => (
        <View key={`${photo}-${index}`} style={styles.photoItem}>
          <Text numberOfLines={1} style={styles.photoText}>{photo}</Text>
          <TouchableOpacity onPress={() => setPhotos(current => current.filter((_, itemIndex) => itemIndex !== index))}>
            <Text style={styles.remove}>Rimuovi</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={[styles.submit, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>Invia segnalazione</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  back: { color: '#1976D2', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { borderWidth: 1, borderColor: '#d6d6d6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'white' },
  optionSelected: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  optionText: { color: '#333', fontWeight: '600' },
  optionTextSelected: { color: 'white' },
  description: { minHeight: 116, textAlignVertical: 'top', backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  locationBox: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 12, gap: 10 },
  locationText: { fontWeight: '700', color: '#333' },
  secondaryButton: { borderWidth: 1, borderColor: '#1976D2', borderRadius: 8, padding: 10, alignItems: 'center' },
  secondaryButtonText: { color: '#1976D2', fontWeight: '700' },
  photoRow: { flexDirection: 'row', gap: 8 },
  pickButton: { borderWidth: 1, borderColor: '#2e7d32', borderRadius: 8, padding: 11, alignItems: 'center', marginBottom: 8, backgroundColor: 'white' },
  pickButtonText: { color: '#2e7d32', fontWeight: '700' },
  photoInput: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  addButton: { backgroundColor: '#1976D2', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  addButtonText: { color: 'white', fontWeight: '700' },
  photoItem: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 8, padding: 10 },
  photoText: { flex: 1, color: '#555', marginRight: 10 },
  remove: { color: '#c62828', fontWeight: '700' },
  submit: { marginTop: 24, backgroundColor: '#2e7d32', borderRadius: 8, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.7 },
  submitText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
