import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import {
  acceptSkillExchangeApplication,
  applyToSkillExchangeOffer,
  confirmSkillExchangeCompletion,
  confirmSkillExchangeStart,
  createSkillExchangeOffer,
  listMySkillExchanges,
  listSkillExchangeOffers,
  reviewSkillExchange,
} from '../services/skillExchangeService';

const FILTERS = [
  { label: 'TUTTI', value: '' },
  { label: 'REMOTO', value: 'remote' },
  { label: 'LOCALE', value: 'local' },
  { label: 'IBRIDO', value: 'hybrid' },
];

const STATUS_LABELS = {
  open: 'APERTO',
  matched: 'MATCH',
  active: 'IN CORSO',
  completed: 'COMPLETATO',
  cancelled: 'ANNULLATO',
};

const APPLICATION_LABELS = {
  pending: 'IN ATTESA',
  accepted: 'ACCETTATA',
  rejected: 'NON SELEZIONATA',
  withdrawn: 'RITIRATA',
};

const errorMessage = (error, fallback) => (
  error.response?.data?.error || error.response?.data?.message || error.message || fallback
);

export default function JobsBetaScreen() {
  const { user } = useContext(AuthContext);
  const userId = String(user?.id || user?._id || '');
  const [tab, setTab] = useState('discover');
  const [offers, setOffers] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [busy, setBusy] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [ratings, setRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    offeredSkill: '',
    requestedSkill: '',
    location: '',
    mode: 'remote',
  });

  const loadDiscover = useCallback(async ({ silent = false } = {}) => {
    setLoadingDiscover(true);
    try {
      setOffers(await listSkillExchangeOffers({ status: 'open' }));
    } catch (error) {
      if (!silent) Alert.alert('Servizio non disponibile', errorMessage(error, 'Impossibile caricare gli scambi di competenze.'));
    } finally {
      setLoadingDiscover(false);
    }
  }, []);

  const loadMine = useCallback(async ({ silent = false } = {}) => {
    setLoadingMine(true);
    try {
      setMyOffers(await listMySkillExchanges());
    } catch (error) {
      if (!silent) Alert.alert('I miei scambi', errorMessage(error, 'Impossibile caricare i tuoi scambi.'));
    } finally {
      setLoadingMine(false);
    }
  }, []);

  const refreshAll = useCallback(async ({ silent = true } = {}) => {
    await Promise.all([loadDiscover({ silent }), loadMine({ silent })]);
  }, [loadDiscover, loadMine]);

  useEffect(() => {
    loadDiscover();
    loadMine({ silent: true });
  }, [loadDiscover, loadMine]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter(offer => {
      const matchesMode = !filter || offer.mode === filter;
      const haystack = `${offer.title || ''} ${offer.offeredSkill || ''} ${offer.requestedSkill || ''} ${offer.location || ''}`.toLowerCase();
      return matchesMode && (!q || haystack.includes(q));
    });
  }, [offers, filter, query]);

  const appliedOfferIds = useMemo(() => new Set(
    myOffers
      .filter(offer => (offer.applications || []).some(application => String(application.applicantId) === userId))
      .map(offer => String(offer._id || offer.id)),
  ), [myOffers, userId]);

  const runAction = async (key, action, successTitle, successMessage) => {
    setBusy(current => ({ ...current, [key]: true }));
    try {
      await action();
      await refreshAll({ silent: true });
      if (successTitle) Alert.alert(successTitle, successMessage || 'Operazione completata.');
    } catch (error) {
      Alert.alert('Operazione non riuscita', errorMessage(error, 'Riprova tra poco.'));
    } finally {
      setBusy(current => ({ ...current, [key]: false }));
    }
  };

  const publish = async () => {
    if (!draft.title.trim() || !draft.description.trim() || !draft.offeredSkill.trim() || !draft.requestedSkill.trim()) {
      Alert.alert('Campi mancanti', 'Titolo, descrizione, competenza offerta e competenza cercata sono obbligatori.');
      return;
    }
    await runAction('publish', async () => {
      await createSkillExchangeOffer(draft);
      setDraft({ title: '', description: '', offeredSkill: '', requestedSkill: '', location: '', mode: 'remote' });
      setShowCreate(false);
      setTab('mine');
    }, 'Offerta pubblicata', 'Lo scambio è aperto alle candidature.');
  };

  const apply = async offer => {
    const id = String(offer._id || offer.id);
    if (String(offer.ownerId) === userId) return;
    await runAction(
      `apply:${id}`,
      () => applyToSkillExchangeOffer(id, 'Candidatura inviata da MyZubster Lavori.'),
      'Candidatura inviata',
      'La candidatura è registrata. Non crea pagamenti, contratti o settlement automatici.',
    );
  };

  const baseCard = item => (
    <>
      <View style={styles.row}>
        <Text style={styles.badge}>{String(item.mode || 'remote').toUpperCase()}</Text>
        <Text style={styles.status}>{STATUS_LABELS[item.status] || String(item.status || '').toUpperCase()}</Text>
      </View>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.skill}>Offro: {item.offeredSkill}</Text>
      <Text style={styles.skill}>Cerco: {item.requestedSkill}</Text>
      {!!item.location && <Text style={styles.meta}>{item.location}</Text>}
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.settlement}>Scambio di competenze: nessun MYZ, wallet, pagamento o settlement automatico.</Text>
    </>
  );

  const renderDiscoverItem = ({ item }) => {
    const id = String(item._id || item.id);
    const own = String(item.ownerId) === userId;
    const alreadyApplied = appliedOfferIds.has(id);
    const actionBusy = busy[`apply:${id}`];
    return (
      <View style={styles.card}>
        {baseCard(item)}
        {own ? (
          <View style={styles.infoPill}><Text style={styles.infoPillText}>È una tua offerta</Text></View>
        ) : (
          <Pressable disabled={alreadyApplied || actionBusy} onPress={() => apply(item)} style={[styles.apply, (alreadyApplied || actionBusy) && styles.applyDisabled]}>
            <Text style={styles.applyText}>{actionBusy ? 'INVIO…' : alreadyApplied ? 'CANDIDATURA GIÀ INVIATA' : 'CANDIDATI'}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderMyItem = ({ item }) => {
    const id = String(item._id || item.id);
    const isOwner = String(item.ownerId) === userId;
    const isParticipant = isOwner || String(item.participantId || '') === userId;
    const myApplication = (item.applications || []).find(application => String(application.applicantId) === userId);
    const startConfirmed = (item.startConfirmedBy || []).map(String).includes(userId);
    const completionConfirmed = (item.completionConfirmedBy || []).map(String).includes(userId);
    const myReview = (item.reviews || []).find(review => String(review.reviewerId) === userId);

    return (
      <View style={styles.card}>
        {baseCard(item)}
        <Text style={styles.role}>{isOwner ? 'RUOLO: HAI PUBBLICATO TU' : isParticipant ? 'RUOLO: PARTECIPANTE SELEZIONATO' : 'RUOLO: CANDIDATO'}</Text>

        {!!myApplication && !isOwner && (
          <View style={styles.infoPill}><Text style={styles.infoPillText}>Candidatura: {APPLICATION_LABELS[myApplication.status] || myApplication.status}</Text></View>
        )}

        {isOwner && item.status === 'open' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Candidature ({(item.applications || []).length})</Text>
            {(item.applications || []).length === 0 ? <Text style={styles.muted}>Nessuna candidatura ricevuta.</Text> : (item.applications || []).map(application => {
              const applicationId = String(application._id || application.id);
              const key = `accept:${id}:${applicationId}`;
              return (
                <View key={applicationId} style={styles.applicationCard}>
                  <Text style={styles.applicationTitle}>Candidato {String(application.applicantId).slice(-6)}</Text>
                  {!!application.message && <Text style={styles.muted}>{application.message}</Text>}
                  <Text style={styles.applicationStatus}>{APPLICATION_LABELS[application.status] || application.status}</Text>
                  {application.status === 'pending' && (
                    <Pressable
                      disabled={busy[key]}
                      onPress={() => runAction(key, () => acceptSkillExchangeApplication(id, applicationId), 'Match creato', 'Entrambe le persone devono confermare l’inizio.')}
                      style={[styles.secondaryAction, busy[key] && styles.applyDisabled]}
                    >
                      <Text style={styles.secondaryActionText}>{busy[key] ? 'ACCETTO…' : 'ACCETTA CANDIDATURA'}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {isParticipant && item.status === 'matched' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avvio dello scambio</Text>
            <Text style={styles.muted}>Servono due conferme indipendenti.</Text>
            <Pressable
              disabled={startConfirmed || busy[`start:${id}`]}
              onPress={() => runAction(`start:${id}`, () => confirmSkillExchangeStart(id), 'Conferma registrata', 'Lo scambio parte quando confermano entrambe le persone.')}
              style={[styles.apply, (startConfirmed || busy[`start:${id}`]) && styles.applyDisabled]}
            >
              <Text style={styles.applyText}>{startConfirmed ? 'TU HAI CONFERMATO · ATTESA ALTRA PERSONA' : 'CONFERMA INIZIO'}</Text>
            </Pressable>
          </View>
        )}

        {isParticipant && item.status === 'active' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scambio in corso</Text>
            <Text style={styles.muted}>Quando il lavoro è davvero concluso, conferma il completamento.</Text>
            <Pressable
              disabled={completionConfirmed || busy[`complete:${id}`]}
              onPress={() => runAction(`complete:${id}`, () => confirmSkillExchangeCompletion(id), 'Conferma registrata', 'Lo scambio si completa quando confermano entrambe le persone.')}
              style={[styles.apply, (completionConfirmed || busy[`complete:${id}`]) && styles.applyDisabled]}
            >
              <Text style={styles.applyText}>{completionConfirmed ? 'TU HAI CONFERMATO · ATTESA ALTRA PERSONA' : 'CONFERMA COMPLETAMENTO'}</Text>
            </Pressable>
          </View>
        )}

        {isParticipant && item.status === 'completed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scambio completato</Text>
            {myReview ? <Text style={styles.reviewDone}>Hai lasciato {myReview.rating}/5 ★</Text> : (
              <>
                <Text style={styles.muted}>Valuta l’esperienza.</Text>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map(value => (
                    <Pressable key={value} onPress={() => setRatings(current => ({ ...current, [id]: value }))} style={[styles.ratingButton, Number(ratings[id] || 5) === value && styles.ratingButtonActive]}>
                      <Text style={[styles.ratingText, Number(ratings[id] || 5) === value && styles.ratingTextActive]}>{value}★</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput value={reviewComments[id] || ''} onChangeText={comment => setReviewComments(current => ({ ...current, [id]: comment }))} placeholder="Commento opzionale" placeholderTextColor="#64748b" style={styles.input} />
                <Pressable
                  disabled={busy[`review:${id}`]}
                  onPress={() => runAction(`review:${id}`, () => reviewSkillExchange(id, Number(ratings[id] || 5), reviewComments[id] || ''), 'Recensione inviata', 'Grazie per il feedback sullo scambio.')}
                  style={[styles.apply, busy[`review:${id}`] && styles.applyDisabled]}
                >
                  <Text style={styles.applyText}>{busy[`review:${id}`] ? 'INVIO…' : 'INVIA RECENSIONE'}</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const header = (
    <View>
      <Text style={styles.eyebrow}>MYZUBSTER</Text>
      <Text style={styles.title}>Lavori & Scambio competenze</Text>
      <Text style={styles.subtitle}>Pubblica, candidati, crea il match, conferma insieme inizio e completamento e lascia una recensione. Le azioni restano separate da pagamenti e contratti automatici.</Text>

      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('discover')} style={[styles.tab, tab === 'discover' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'discover' && styles.tabTextActive]}>ESPLORA</Text>
        </Pressable>
        <Pressable onPress={() => { setTab('mine'); loadMine({ silent: true }); }} style={[styles.tab, tab === 'mine' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>I MIEI SCAMBI</Text>
        </Pressable>
      </View>

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
          <Pressable disabled={busy.publish} style={[styles.publish, busy.publish && styles.applyDisabled]} onPress={publish}>
            <Text style={styles.applyText}>{busy.publish ? 'PUBBLICO…' : 'PUBBLICA'}</Text>
          </Pressable>
        </View>
      )}

      {tab === 'discover' && (
        <>
          <TextInput value={query} onChangeText={setQuery} placeholder="Cerca competenza o luogo" placeholderTextColor="#64748b" style={styles.search} />
          <View style={styles.filters}>
            {FILTERS.map(item => (
              <Pressable key={item.label} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );

  const data = tab === 'discover' ? visible : myOffers;
  const loading = tab === 'discover' ? loadingDiscover : loadingMine;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={data}
      keyExtractor={item => String(item._id || item.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Caricamento…' : tab === 'discover' ? 'Nessuno scambio aperto.' : 'Non hai ancora scambi o candidature.'}</Text>}
      renderItem={tab === 'discover' ? renderDiscoverItem : renderMyItem}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refreshAll({ silent: false })} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 16, paddingBottom: 48, flexGrow: 1 },
  eyebrow: { color: '#5eead4', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#a8b3c7', lineHeight: 20, marginTop: 8, marginBottom: 12 },
  tabs: { flexDirection: 'row', backgroundColor: '#111b2d', borderRadius: 12, padding: 4, marginBottom: 10 },
  tab: { flex: 1, borderRadius: 9, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#14b8a6' },
  tabText: { color: '#94a3b8', fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#06131a' },
  createToggle: { borderColor: '#14b8a6', borderWidth: 1, borderRadius: 10, padding: 11, alignItems: 'center', marginBottom: 12 },
  createToggleText: { color: '#5eead4', fontWeight: '900' },
  form: { backgroundColor: '#111b2d', borderRadius: 14, padding: 12, marginBottom: 14 },
  input: { backgroundColor: '#0b1220', color: '#fff', borderColor: '#263550', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  search: { backgroundColor: '#111b2d', color: '#fff', borderColor: '#263550', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 10, flexWrap: 'wrap' },
  filter: { borderColor: '#334155', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterActive: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  filterText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: '#06131a' },
  publish: { backgroundColor: '#14b8a6', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  card: { backgroundColor: '#111b2d', borderColor: '#263550', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { color: '#5eead4', fontWeight: '800', fontSize: 11 },
  status: { color: '#fbbf24', fontWeight: '900', fontSize: 11 },
  jobTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 12 },
  skill: { color: '#d7dfeb', marginTop: 6, fontWeight: '700' },
  meta: { color: '#94a3b8', marginTop: 6 },
  description: { color: '#d7dfeb', lineHeight: 20, marginTop: 12 },
  settlement: { color: '#93c5fd', fontSize: 12, marginTop: 12 },
  role: { color: '#c4b5fd', fontWeight: '800', fontSize: 11, marginTop: 14 },
  section: { borderTopWidth: 1, borderTopColor: '#263550', marginTop: 14, paddingTop: 14 },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15, marginBottom: 8 },
  muted: { color: '#94a3b8', lineHeight: 18, marginBottom: 6 },
  infoPill: { backgroundColor: '#18243a', borderRadius: 10, padding: 10, marginTop: 12 },
  infoPillText: { color: '#bfdbfe', fontWeight: '800' },
  applicationCard: { backgroundColor: '#0b1220', borderRadius: 10, padding: 10, marginTop: 8 },
  applicationTitle: { color: '#fff', fontWeight: '800' },
  applicationStatus: { color: '#fbbf24', fontWeight: '900', fontSize: 11, marginTop: 6 },
  secondaryAction: { borderColor: '#14b8a6', borderWidth: 1, borderRadius: 9, alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  secondaryActionText: { color: '#5eead4', fontWeight: '900', fontSize: 12 },
  apply: { backgroundColor: '#14b8a6', borderRadius: 10, alignItems: 'center', paddingVertical: 12, marginTop: 14 },
  applyDisabled: { backgroundColor: '#334155', borderColor: '#334155' },
  applyText: { color: '#06131a', fontWeight: '900', textAlign: 'center', paddingHorizontal: 6 },
  ratingRow: { flexDirection: 'row', gap: 6, marginVertical: 10 },
  ratingButton: { flex: 1, borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  ratingButtonActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
  ratingText: { color: '#cbd5e1', fontWeight: '800' },
  ratingTextActive: { color: '#211a00' },
  reviewDone: { color: '#86efac', fontWeight: '800' },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 32, marginBottom: 32 },
});
