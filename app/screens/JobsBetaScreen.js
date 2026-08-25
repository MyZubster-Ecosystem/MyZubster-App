import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  applyToSkillExchangeOffer,
  createSkillExchangeOffer,
  listSkillExchangeOffers,
} from '../services/skillExchangeService';

const FILTERS = [
  { label: 'TUTTI', value: '' },
  { label: 'REMOTO', value: 'remote' },
  { label: 'LOCALE', value: 'local' },
  { label: 'IBRIDO', value: 'hybrid' },
];

export default function JobsBetaScreen() {
  const [offers, setOffers] = useState([]);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    offeredSkill: '',
    requestedSkill: '',
    location: '',
    mode: 'remote',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listSkillExchangeOffers({ status: 'open' });
      setOffers(next);
    } catch (error) {
      Alert.alert('Gateway non disponibile', error.response?.data?.error || 'Impossibile caricare gli scambi di competenze.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter(offer => {
      const matchesMode = !filter || offer.mode === filter;
      const haystack = `${offer.title || ''} ${offer.offeredSkill || ''} ${offer.requestedSkill || ''} ${offer.location || ''}`.toLowerCase();
      return matchesMode && (!q || haystack.includes(q));
    });
  }, [offers, filter, query]);

  const apply = async offer => {
    try {
      await applyToSkillExchangeOffer(offer._id || offer.id, 'Candidatura inviata da MyZubster Lavori Beta.');
      setApplied(current => ({ ...current, [offer._id || offer.id]: true }));
      Alert.alert('Candidatura inviata', 'La candidatura è stata registrata nel Gateway. Non crea pagamenti o contratti automatici.');
    } catch (error) {
      Alert.alert('Candidatura non inviata', error.response?.data?.error || 'Accedi e riprova.');
    }
  };

  const publish = async () => {
    if (!draft.title.trim() || !draft.description.trim() || !draft.offeredSkill.trim() || !draft.requestedSkill.trim()) {
      Alert.alert('Campi mancanti', 'Titolo, descrizione, competenza offerta e competenza cercata sono obbligatori.');
      return;
    }
    try {
      await createSkillExchangeOffer(draft);
      setDraft({ title: '', description: '', offeredSkill: '', requestedSkill: '', location: '', mode: 'remote' });
      setShowCreate(false);
      await load();
      Alert.alert('Offerta pubblicata', 'Lo scambio è ora aperto alle candidature.');
    } catch (error) {
      Alert.alert('Offerta non pubblicata', error.response?.data?.error || 'Accedi e riprova.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>MYZUBSTER BETA</Text>
      <Text style={styles.title}>Lavori & Scambio competenze</Text>
      <Text style={styles.subtitle}>Offri ciò che sai fare e cerca la competenza che ti serve. Matching e conferme sono persistenti nel Gateway; nessun pagamento o settlement parte automaticamente.</Text>

      <Pressable style={styles.createToggle} onPress={() => setShowCreate(value => !value)}>
        <Text style={styles.createToggleText}>{showCreate ? 'CHIUDI' : '+ PUBBLICA UNO SCAMBIO'}</Text>
      </Pressable>

      {showCreate && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Titolo" placeholderTextColor="#64748b" value={draft.title} onChangeText={title => setDraft(current => ({ ...current, title }))} />
          <TextInput style={styles.input} placeholder="Competenza che offri" placeholderTextColor="#64748b" value={draft.offeredSkill} onChangeText={offeredSkill => setDraft(current => ({ ...current, offeredSkill }))} />
          <TextInput style={styles.input} placeholder="Competenza che cerchi" placeholderTextColor="#64748b" value={draft.requestedSkill} onChangeText={requestedSkill => setDraft(current => ({ ...current, requestedSkill }))} />
          <TextInput style={styles.input} placeholder="Luogo (opzionale)" placeholderTextColor="#64748b" value={draft.location} onChangeText={location => setDraft(current => ({ ...current, location }))} />
          <TextInput style={[styles.input, styles.multiline]} multiline placeholder="Descrizione" placeholderTextColor="#64748b" value={draft.description} onChangeText={description => setDraft(current => ({ ...current, description }))} />
          <View style={styles.filters}>
            {FILTERS.slice(1).map(item => (
              <Pressable key={item.value} onPress={() => setDraft(current => ({ ...current, mode: item.value }))} style={[styles.filter, draft.mode === item.value && styles.filterActive]}>
                <Text style={[styles.filterText, draft.mode === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.publish} onPress={publish}><Text style={styles.applyText}>PUBBLICA</Text></Pressable>
        </View>
      )}

      <TextInput value={query} onChangeText={setQuery} placeholder="Cerca competenza o luogo" placeholderTextColor="#64748b" style={styles.search} />
      <View style={styles.filters}>
        {FILTERS.map(item => (
          <Pressable key={item.label} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item._id || item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Caricamento…' : 'Nessuno scambio aperto.'}</Text>}
        renderItem={({ item }) => {
          const id = item._id || item.id;
          return (
            <View style={styles.card}>
              <View style={styles.row}><Text style={styles.badge}>{String(item.mode || 'remote').toUpperCase()}</Text><Text style={styles.status}>APERTO</Text></View>
              <Text style={styles.jobTitle}>{item.title}</Text>
              <Text style={styles.skill}>Offro: {item.offeredSkill}</Text>
              <Text style={styles.skill}>Cerco: {item.requestedSkill}</Text>
              {!!item.location && <Text style={styles.meta}>{item.location}</Text>}
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.settlement}>Scambio di competenze: nessun MYZ, wallet o settlement automatico.</Text>
              <Pressable disabled={applied[id]} onPress={() => apply(item)} style={[styles.apply, applied[id] && styles.applyDisabled]}>
                <Text style={styles.applyText}>{applied[id] ? 'CANDIDATURA INVIATA' : 'CANDIDATI'}</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  eyebrow: { color: '#5eead4', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#a8b3c7', lineHeight: 20, marginTop: 8, marginBottom: 12 },
  createToggle: { borderColor: '#14b8a6', borderWidth: 1, borderRadius: 10, padding: 11, alignItems: 'center', marginBottom: 12 },
  createToggleText: { color: '#5eead4', fontWeight: '900' },
  form: { backgroundColor: '#111b2d', borderRadius: 14, padding: 12, marginBottom: 14 },
  input: { backgroundColor: '#0b1220', color: '#fff', borderColor: '#263550', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  search: { backgroundColor: '#111b2d', color: '#fff', borderColor: '#263550', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 10, flexWrap: 'wrap' },
  filter: { borderColor: '#334155', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  filterText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: '#06131a' },
  publish: { backgroundColor: '#14b8a6', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  list: { paddingBottom: 28 },
  card: { backgroundColor: '#111b2d', borderColor: '#263550', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { color: '#5eead4', fontWeight: '800', fontSize: 11 },
  status: { color: '#fbbf24', fontWeight: '900', fontSize: 11 },
  jobTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 12 },
  skill: { color: '#d7dfeb', marginTop: 6, fontWeight: '700' },
  meta: { color: '#94a3b8', marginTop: 6 },
  description: { color: '#d7dfeb', lineHeight: 20, marginTop: 12 },
  settlement: { color: '#93c5fd', fontSize: 12, marginTop: 12 },
  apply: { backgroundColor: '#14b8a6', borderRadius: 10, alignItems: 'center', paddingVertical: 12, marginTop: 14 },
  applyDisabled: { backgroundColor: '#334155' },
  applyText: { color: '#06131a', fontWeight: '900' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
});
