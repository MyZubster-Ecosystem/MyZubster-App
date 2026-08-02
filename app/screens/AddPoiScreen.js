import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { POI_CATEGORIES, createPoi } from '../services/poiService';

const MAX_PHOTOS = 5;

export default function AddPoiScreen({ navigation }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [category, setCategory] = useState(POI_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [coords, setCoords] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setLocationDenied(true); return; }
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch { setLocationDenied(true); }
    })();
  }, []);

  const pickPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) { Alert.alert(t('poi.maxPhotos'), ''); return; }
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert(t('poi.photoPermission'), ''); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, selectionLimit: MAX_PHOTOS - photos.length, quality: 0.7, allowsMultipleSelection: true });
      if (result.canceled) return;
      const picked = (result.assets || []).map((a) => a.uri);
      setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    } catch (error) {
      Alert.alert(t('common.error'), t('common.failed', { defaultValue: 'Module non disponibile' }));
    }
  }, [photos, t]);

  const openCamera = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) { Alert.alert(t('poi.maxPhotos'), ''); return; }
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { Alert.alert(t('poi.photoPermission'), ''); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (result.canceled) return;
      const shot = (result.assets || []).map((a) => a.uri);
      setPhotos((prev) => [...prev, ...shot].slice(0, MAX_PHOTOS));
    } catch (error) {
      Alert.alert(t('common.error'), t('common.failed', { defaultValue: 'Module non disponibile' }));
    }
  }, [photos, t]);

  const submit = useCallback(async () => {
    if (!name.trim()) { Alert.alert(t('poi.nameRequired'), ''); return; }
    if (!coords) { Alert.alert(t('poi.locationRequired'), ''); return; }
    setSubmitting(true);
    try {
      await createPoi({ name: name.trim(), category, description: description.trim(), latitude: coords.latitude, longitude: coords.longitude, photos });
      Alert.alert(t('common.success'), t('poi.created'), [{ text: t('common.ok'), onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.error || error.message || t('poi.createFailed'));
    } finally { setSubmitting(false); }
  }, [name, category, description, coords, photos, t, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>{t('poi.addTitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>{t('poi.name')}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('poi.namePlaceholder')} />

        <Text style={styles.label}>{t('poi.category')}</Text>
        <View style={styles.chips}>
          {POI_CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{t(`poi.categories.${c}`, { defaultValue: c })}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{t('poi.description')}</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder={t('poi.descriptionPlaceholder')} multiline numberOfLines={4} textAlignVertical="top" />

        <Text style={styles.label}>{t('poi.location')}</Text>
        {coords ? (
          <Text style={styles.coords}>📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
        ) : locationDenied ? (
          <Text style={styles.warning}>{t('poi.locationDenied')}</Text>
        ) : (
          <View style={styles.loading}><ActivityIndicator color="#4CAF50" /><Text>{t('common.loading')}</Text></View>
        )}
        <TouchableOpacity style={styles.gpsButton} onPress={() => { (async () => { try { const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); setCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude }); setLocationDenied(false); } catch { setLocationDenied(true); } })(); }}><Text style={styles.gpsText}>◎ {t('poi.refreshLocation')}</Text></TouchableOpacity>

        <Text style={styles.label}>{t('poi.photos')} ({photos.length}/{MAX_PHOTOS})</Text>
        <View style={styles.photoActions}>
          <TouchableOpacity style={styles.photoBtn} onPress={openCamera}><Text style={styles.photoBtnText}>📷 {t('poi.camera')}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}><Text style={styles.photoBtnText}>🖼 {t('poi.gallery')}</Text></TouchableOpacity>
        </View>
        <FlatList
          data={photos}
          horizontal
          keyExtractor={(item, i) => `${item}:${i}`}
          renderItem={({ item, index }) => (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: item }} style={styles.thumb} />
              <TouchableOpacity style={styles.thumbRemove} onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== index))}><Text style={styles.thumbRemoveText}>×</Text></TouchableOpacity>
            </View>
          )}
        />

        <TouchableOpacity style={[styles.submit, submitting && styles.submitDisabled]} onPress={submit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? t('common.loading') : t('poi.submit')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  toolbar: { padding: 16, paddingBottom: 8 },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  form: { padding: 16, paddingTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { minHeight: 90 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  chipText: { color: '#555' },
  chipTextActive: { color: 'white', fontWeight: '700' },
  coords: { fontSize: 15, color: '#333', marginTop: 4 },
  warning: { color: '#9a6300', marginTop: 4 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpsButton: { alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: '#1976D2', borderRadius: 8, padding: 10 },
  gpsText: { color: '#1976D2', fontWeight: '600' },
  photoActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  photoBtn: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, alignItems: 'center' },
  photoBtnText: { color: '#333', fontWeight: '600' },
  thumbWrap: { marginRight: 8 },
  thumb: { width: 88, height: 88, borderRadius: 8 },
  thumbRemove: { position: 'absolute', right: -6, top: -6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { color: 'white', fontSize: 16 },
  submit: { backgroundColor: '#4CAF50', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 22, marginBottom: 40 },
  submitDisabled: { backgroundColor: '#a5d6a7' },
  submitText: { color: 'white', fontWeight: '700', fontSize: 16 },
  maxPhotos: {},
});
