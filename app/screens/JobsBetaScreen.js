import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const JOBS = [
  {
    id: 'garden-sensor',
    title: 'Test sensore umidità su pianta reale',
    category: 'Ambiente',
    location: 'Sul campo',
    reward: '300 MYZ',
    settlement: 'eventuale settlement esterno separato',
    status: 'APERTO',
    description: 'Installa un sensore in un vaso o orto, registra letture timestampate, foto del setup e prova di invio dati a MyZubster.',
  },
  {
    id: 'urban-report',
    title: 'Verifica segnalazione urbana con foto',
    category: 'Comune',
    location: 'Locale',
    reward: '150 MYZ',
    settlement: 'MYZ = contabilità interna',
    status: 'APERTO',
    description: 'Documenta una segnalazione reale con posizione approssimata, foto non sensibile e verifica indipendente.',
  },
  {
    id: 'visual-guide',
    title: 'Visual guide MyZubster',
    category: 'Design',
    location: 'Remoto',
    reward: '300 MYZ',
    settlement: 'nessun pagamento automatico',
    status: 'IN REVISIONE',
    description: 'Crea o revisiona visual pubblici con provenienza documentata e distinzione chiara tra reward interno e settlement esterno.',
  },
];

const FILTERS = ['TUTTI', 'APERTO', 'IN REVISIONE'];

export default function JobsBetaScreen() {
  const [filter, setFilter] = useState('TUTTI');
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState({});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return JOBS.filter(job => (filter === 'TUTTI' || job.status === filter) && (!q || `${job.title} ${job.category} ${job.location}`.toLowerCase().includes(q)));
  }, [filter, query]);

  const apply = job => {
    setApplied(current => ({ ...current, [job.id]: true }));
    Alert.alert('Candidatura beta registrata', 'La candidatura resta locale a questa beta: non crea contratti, pagamenti o assegnazioni automatiche.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>MYZUBSTER BETA</Text>
      <Text style={styles.title}>Lavori & Bounty</Text>
      <Text style={styles.subtitle}>Trova attività verificabili nel mondo reale o da remoto. Le ricompense MYZ sono contabilità interna; eventuali settlement esterni richiedono verifica separata.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Cerca lavoro, categoria o luogo"
        style={styles.search}
      />

      <View style={styles.filters}>
        {FILTERS.map(item => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Nessun lavoro trovato.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.badge}>{item.status}</Text>
              <Text style={styles.reward}>{item.reward}</Text>
            </View>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.meta}>{item.category} · {item.location}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.settlement}>{item.settlement}</Text>
            <Pressable disabled={applied[item.id]} onPress={() => apply(item)} style={[styles.apply, applied[item.id] && styles.applyDisabled]}>
              <Text style={styles.applyText}>{applied[item.id] ? 'CANDIDATURA REGISTRATA' : 'CANDIDATI'}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  eyebrow: { color: '#5eead4', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#a8b3c7', lineHeight: 20, marginTop: 8, marginBottom: 16 },
  search: { backgroundColor: '#111b2d', color: '#fff', borderColor: '#263550', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 14, flexWrap: 'wrap' },
  filter: { borderColor: '#334155', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  filterText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: '#06131a' },
  list: { paddingBottom: 28 },
  card: { backgroundColor: '#111b2d', borderColor: '#263550', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { color: '#5eead4', fontWeight: '800', fontSize: 11 },
  reward: { color: '#fbbf24', fontWeight: '900' },
  jobTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 12 },
  meta: { color: '#94a3b8', marginTop: 5 },
  description: { color: '#d7dfeb', lineHeight: 20, marginTop: 12 },
  settlement: { color: '#93c5fd', fontSize: 12, marginTop: 12 },
  apply: { backgroundColor: '#14b8a6', borderRadius: 10, alignItems: 'center', paddingVertical: 12, marginTop: 14 },
  applyDisabled: { backgroundColor: '#334155' },
  applyText: { color: '#06131a', fontWeight: '900' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
});
