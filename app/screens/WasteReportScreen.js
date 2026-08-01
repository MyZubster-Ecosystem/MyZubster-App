import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';
import { detectWaste, submitWasteReport, CONFIDENCE_THRESHOLD } from '../services/wasteDetectionService';

const WASTE_CATEGORIES = ['plastic', 'glass', 'metal', 'organic', 'bulky'];

export default function WasteReportScreen({ navigation }) {
  const { t } = useLanguage();
  const cameraRef = useRef(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState(null);
  const [location, setLocation] = useState(null);

  const [photo, setPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [manualWasteType, setManualWasteType] = useState('');
  const [notes, setNotes] = useState('');

  const [cameraFacing, setCameraFacing] = useState('back');
  const [flash, setFlash] = useState('off');

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      const loc = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(loc.status === 'granted');
    })();
  }, [cameraPermission, requestCameraPermission]);

  // Get current location
  const getLocation = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      Alert.alert(t('wasteDetection.alert.locationFailed'));
    }
  }, [t]);

  // Take photo
  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const snap = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setPhoto(snap.uri);
      setResult(null);
      setManualWasteType('');
      setNotes('');
      if (!location) await getLocation();
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  }, [getLocation, location, t]);

  // Run AI detection
  const runDetection = useCallback(async () => {
    if (!photo) return;
    setAnalyzing(true);
    try {
      const detection = await detectWaste(photo);
      setResult(detection);
      if (detection.confidence >= CONFIDENCE_THRESHOLD) {
        setManualWasteType(detection.wasteType);
      }
    } catch (error) {
      Alert.alert(t('wasteDetection.alert.detectFailed'), error.response?.data?.error || error.message);
    } finally {
      setAnalyzing(false);
    }
  }, [photo, t]);

  // Auto-run detection when photo changes
  useEffect(() => {
    if (photo) runDetection();
  }, [photo, runDetection]);

  // Submit report
  const handleSubmit = useCallback(async () => {
    if (!photo || !location) {
      Alert.alert(t('common.error'), t('wasteDetection.alert.missingData'));
      return;
    }
    const wasteType = manualWasteType || result?.wasteType;
    if (!wasteType) {
      Alert.alert(t('common.error'), t('wasteDetection.alert.selectWasteType'));
      return;
    }

    setSubmitting(true);
    try {
      await submitWasteReport({
        imageUri: photo,
        latitude: location.latitude,
        longitude: location.longitude,
        wasteType,
        confidence: result?.confidence || 0,
        notes: notes.trim() || undefined,
      });
      Alert.alert(t('common.success'), t('wasteDetection.alert.submitSuccess'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.error || error.message);
    } finally {
      setSubmitting(false);
    }
  }, [photo, location, manualWasteType, result, notes, t, navigation]);

  // Retake photo
  const retake = useCallback(() => {
    setPhoto(null);
    setResult(null);
    setManualWasteType('');
    setNotes('');
  }, []);

  if (!cameraPermission) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>{t('wasteDetection.cameraDenied')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>{t('wasteDetection.grantCamera')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'‹ '}{t('wasteDetection.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('wasteDetection.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {!photo ? (
        /* Camera preview */
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
            flash={flash}
          >
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.flashButton}
                onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
              >
                <Text style={styles.flashText}>{flash === 'on' ? '⚡' : '⚡'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePhoto}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setCameraFacing(f => (f === 'back' ? 'front' : 'back'))}
              >
                <Text style={styles.flipText}>🔄</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      ) : (
        /* Photo captured — show analysis */
        <ScrollView style={styles.analysisContainer} contentContainerStyle={styles.analysisContent}>
          <Image source={{ uri: photo }} style={styles.preview} resizeMode="cover" />

          {/* Location info */}
          {location && (
            <View style={styles.locationRow}>
              <Text style={styles.locationText}>
                📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </Text>
              <TouchableOpacity onPress={getLocation}>
                <Text style={styles.refreshLocation}>{t('wasteDetection.refreshLocation')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* AI Detection result */}
          {analyzing && (
            <View style={styles.analyzingRow}>
              <ActivityIndicator color="#4CAF50" />
              <Text style={styles.analyzingText}>{t('wasteDetection.analyzing')}</Text>
            </View>
          )}

          {result && !analyzing && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{t('wasteDetection.detectionResult')}</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('wasteDetection.wasteType')}</Text>
                <Text style={styles.resultValue}>{t(`wasteDetection.categories.${result.wasteType}`, { defaultValue: result.wasteType })}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>{t('wasteDetection.confidence')}</Text>
                <View style={styles.confidenceBarOuter}>
                  <View
                    style={[
                      styles.confidenceBarInner,
                      {
                        width: `${Math.round(result.confidence * 100)}%`,
                        backgroundColor:
                          result.confidence >= CONFIDENCE_THRESHOLD ? '#4CAF50' : '#f39c12',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceText}>
                  {Math.round(result.confidence * 100)}%
                </Text>
              </View>
              {result.confidence >= CONFIDENCE_THRESHOLD && (
                <View style={styles.autoBadge}>
                  <Text style={styles.autoBadgeText}>✅ {t('wasteDetection.autoQualified')}</Text>
                </View>
              )}
              {result.confidence < CONFIDENCE_THRESHOLD && (
                <View style={styles.lowConfBadge}>
                  <Text style={styles.lowConfBadgeText}>⚠️ {t('wasteDetection.lowConfidence')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Manual waste type selector */}
          <Text style={styles.sectionLabel}>{t('wasteDetection.wasteType')}</Text>
          <View style={styles.categoryRow}>
            {WASTE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  manualWasteType === cat && styles.categoryChipActive,
                ]}
                onPress={() => setManualWasteType(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    manualWasteType === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {t(`wasteDetection.categories.${cat}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={styles.sectionLabel}>{t('wasteDetection.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('wasteDetection.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <Text style={styles.retakeText}>{t('wasteDetection.retake')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitText}>{t('wasteDetection.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { fontSize: 16, textAlign: 'center', marginBottom: 16, color: '#555' },
  permissionButton: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  permissionButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },

  cameraContainer: { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  camera: { flex: 1, minHeight: 400 },
  cameraControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 24, flex: 1 },
  flashButton: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 10 },
  flashText: { fontSize: 20 },
  flipButton: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 10 },
  flipText: { fontSize: 20 },
  captureButton: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'white' },

  analysisContainer: { flex: 1, paddingHorizontal: 16 },
  analysisContent: { paddingBottom: 40 },
  preview: { width: '100%', height: 250, borderRadius: 12, marginBottom: 16 },

  locationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  locationText: { fontSize: 14, color: '#555' },
  refreshLocation: { color: '#1976D2', fontSize: 14 },

  analyzingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20 },
  analyzingText: { fontSize: 16, color: '#555' },

  resultCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  resultTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  resultLabel: { fontSize: 14, color: '#555', width: 90 },
  resultValue: { fontSize: 16, fontWeight: '600', flex: 1 },
  confidenceBarOuter: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, flex: 1, marginRight: 8 },
  confidenceBarInner: { height: 10, borderRadius: 5 },
  confidenceText: { fontSize: 14, fontWeight: '700', width: 40, textAlign: 'right' },

  autoBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 8 },
  autoBadgeText: { color: '#2e7d32', fontWeight: '600' },
  lowConfBadge: { backgroundColor: '#FFF3E0', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 8 },
  lowConfBadgeText: { color: '#e65100', fontWeight: '600' },

  sectionLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', backgroundColor: 'white' },
  categoryChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  categoryChipText: { fontSize: 14, color: '#333' },
  categoryChipTextActive: { color: 'white', fontWeight: '600' },

  notesInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 70, marginBottom: 16, fontSize: 14 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  retakeButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 14, alignItems: 'center' },
  retakeText: { color: '#555', fontWeight: '600', fontSize: 16 },
  submitButton: { flex: 2, backgroundColor: '#4CAF50', borderRadius: 8, padding: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: 'white', fontWeight: '700', fontSize: 16 },
  buttonDisabled: { opacity: 0.6 },
});