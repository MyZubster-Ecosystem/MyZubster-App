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
  { label: 'Tutto', value: '' },
  { label: 'Da remoto', value: 'remote' },
  { label: 'Nella tua zona', value: 'local' },
  { label: 'Misto', value: 'hybrid' },
];

const MODE_LABELS = {
  remote: 'Da remoto',
  local: 'Nella tua zona',
  hybrid: 'Misto',
};

const STATUS_LABELS = {
  open: 'Aperto',
  matched: 'Persona scelta',
  active: 'In corso',
  completed: 'Completato',
  cancelled: 'Annullato',
};

const APPLICATION_LABELS = {
  pending: 'In attesa',
  accepted: 'Accettata',
  rejected: 'Non selezionata',
  withdrawn: 'Ritirata',
};

const errorMessage = (error, fallback) => (
  error.response?.data?.error || error.response?.data?.message || error.message || fallback
);

export default function JobsBetaScreen({ navigation }) {
  const { logout, user } = useContext(AuthContext);
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
  const [showHelp, setShowHelp] = useState(false);
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
        <Text style={styles.badge}>{MODE_LABELS[item.mode] || 'Da remoto'}</Text>
        <Text style={styles.status}>{STATUS_LABELS[item.status] || String(item.status || '')}</Text>
      </View>
      <Text style={styles.jobTitle}>{item.title}</Text>
      <View style={styles.skillBox}>
        <Text style={styles.skillLabel}>Puoi ricevere aiuto con</Text>
        <Text style={styles.skillValue}>{item.offeredSkill}</Text>
      </View>
      <View style={styles.skillBox}>
        <Text style={styles.skillLabel}>In cambio cerca aiuto con</Text>
        <Text style={styles.skillValue}>{item.requestedSkill}</Text>
      </View>
      {!!item.location && <Text style={styles.meta}>Luogo: {item.location}</Text>}
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.settlement}>Nessun pagamento o contratto automatico.</Text>
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
          <View style={styles.infoPill}><Text style={styles.infoPillText}>Questa attività è tua</Text></View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={alreadyApplied || actionBusy}
            onPress={() => apply(item)}
            style={[styles.apply, (alreadyApplied || actionBusy) && styles.applyDisabled]}
          >
            <Text style={styles.applyText}>{actionBusy ? 'Invio…' : alreadyApplied ? 'Candidatura già inviata' : 'Mi interessa'}</Text>
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
        <Text style={styles.role}>{isOwner ? 'Hai pubblicato tu' : isParticipant ? 'Sei la persona scelta' : 'Hai inviato una candidatura'}</Text>

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
                      <Text style={styles.secondaryActionText}>{busy[key] ? 'ACCETTO…' : 'SCEGLI QUESTA PERSONA'}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {isParticipant && item.status === 'matched' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prima di iniziare</Text>
            <Text style={styles.muted}>Entrambe le persone devono confermare prima di iniziare.</Text>
            <Pressable
              disabled={startConfirmed || busy[`start:${id}`]}
              onPress={() => runAction(`start:${id}`, () => confirmSkillExchangeStart(id), 'Conferma registrata', 'Lo scambio parte quando confermano entrambe le persone.')}
              style={[styles.apply, (startConfirmed || busy[`start:${id}`]) && styles.applyDisabled]}
            >
              <Text style={styles.applyText}>{startConfirmed ? 'TU HAI CONFERMATO · ATTESA ALTRA PERSONA' : 'CONFERMO CHE INIZIAMO'}</Text>
            </Pressable>
          </View>
        )}

        {isParticipant && item.status === 'active' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attività in corso</Text>
            <Text style={styles.muted}>Quando il lavoro è davvero concluso, conferma il completamento.</Text>
            <Pressable
              disabled={completionConfirmed || busy[`complete:${id}`]}
              onPress={() => runAction(`complete:${id}`, () => confirmSkillExchangeCompletion(id), 'Conferma registrata', 'Lo scambio si completa quando confermano entrambe le persone.')}
              style={[styles.apply, (completionConfirmed || busy[`complete:${id}`]) && styles.applyDisabled]}
            >
              <Text style={styles.applyText}>{completionConfirmed ? 'TU HAI CONFERMATO · ATTESA ALTRA PERSONA' : 'CONFERMO CHE È COMPLETATA'}</Text>
            </Pressable>
          </View>
        )}

        {isParticipant && item.status === 'completed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attività completata</Text>
            {myReview ? <Text style={styles.reviewDone}>Hai lasciato {myReview.rating}/5 ★</Text> : (
              <>
                <Text style={styles.muted}>Com’è andata? Lascia una valutazione.</Text>
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
                  <Text style={styles.applyText}>{busy[`review:${id}`] ? 'INVIO…' : 'INVIA VALUTAZIONE'}</Text>
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
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.eyebrow}>MYZUBSTER</Text>
          <Text style={styles.greeting}>Ciao {user?.username || user?.name || ''}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Esci</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Cosa vuoi fare?</Text>
      <Text style={styles.subtitle}>Scegli un’azione. Il resto apparirà solo quando serve.</Text>

      <View style={styles.choiceList}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'discover' && !showCreate }}
          onPress={() => { setTab('discover'); setShowCreate(false); }}
          style={[styles.choiceButton, tab === 'discover' && !showCreate && styles.choiceButtonActive]}
        >
          <View style={styles.choiceNumber}><Text style={styles.choiceNumberText}>1</Text></View>
          <View style={styles.choiceText}>
            <Text style={[styles.choiceTitle, tab === 'discover' && !showCreate && styles.choiceTitleActive]}>Trova aiuto</Text>
            <Text style={[styles.choiceDescription, tab === 'discover' && !showCreate && styles.choiceDescriptionActive]}>Scopri chi può aiutarti con ciò che ti serve.</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showCreate }}
          onPress={() => setShowCreate(value => !value)}
          style={[styles.choiceButton, showCreate && styles.choiceButtonActive]}
        >
          <View style={styles.choiceNumber}><Text style={styles.choiceNumberText}>2</Text></View>
          <View style={styles.choiceText}>
            <Text style={[styles.choiceTitle, showCreate && styles.choiceTitleActive]}>Offri una competenza</Text>
            <Text style={[styles.choiceDescription, showCreate && styles.choiceDescriptionActive]}>Spiega cosa sai fare e quale aiuto cerchi.</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: tab === 'mine' && !showCreate }}
          onPress={() => { setTab('mine'); setShowCreate(false); loadMine({ silent: true }); }}
          style={[styles.choiceButton, tab === 'mine' && !showCreate && styles.choiceButtonActive]}
        >
          <View style={styles.choiceNumber}><Text style={styles.choiceNumberText}>3</Text></View>
          <View style={styles.choiceText}>
            <Text style={[styles.choiceTitle, tab === 'mine' && !showCreate && styles.choiceTitleActive]}>Le mie attività</Text>
            <Text style={[styles.choiceDescription, tab === 'mine' && !showCreate && styles.choiceDescriptionActive]}>Segui candidature, conferme e valutazioni.</Text>
          </View>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showHelp }}
        onPress={() => setShowHelp(value => !value)}
        style={styles.helpToggle}
      >
        <Text style={styles.helpToggleText}>{showHelp ? 'Nascondi spiegazione' : 'Come funziona?'}</Text>
        <Text style={styles.helpToggleIcon}>{showHelp ? '−' : '+'}</Text>
      </Pressable>

      {showHelp && (
        <View style={styles.helpPanel}>
          <Text style={styles.helpStep}>1. Trova una competenza utile.</Text>
          <Text style={styles.helpStep}>2. Invia una candidatura oppure pubblica la tua proposta.</Text>
          <Text style={styles.helpStep}>3. Iniziate solo dopo la conferma di entrambe le persone.</Text>
          <Text style={styles.helpNote}>MyZubster non crea pagamenti o contratti automatici.</Text>
        </View>
      )}

      {showCreate && (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <View style={styles.formHeaderText}>
              <Text style={styles.formTitle}>Offri una competenza</Text>
              <Text style={styles.formIntro}>Compila un passaggio alla volta.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setShowCreate(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Chiudi</Text>
            </Pressable>
          </View>

          <Text style={styles.step}>PASSAGGIO 1 DI 3</Text>
          <Text style={styles.label}>Cosa sai fare?</Text>
          <TextInput
            accessibilityLabel="Competenza che offri"
            style={styles.input}
            placeholder="Esempio: creare un logo"
            placeholderTextColor="#64748b"
            value={draft.offeredSkill}
            onChangeText={offeredSkill => setDraft(current => ({ ...current, offeredSkill }))}
          />

          <Text style={styles.step}>PASSAGGIO 2 DI 3</Text>
          <Text style={styles.label}>Di quale aiuto hai bisogno?</Text>
          <TextInput
            accessibilityLabel="Competenza che cerchi"
            style={styles.input}
            placeholder="Esempio: tradurre un testo"
            placeholderTextColor="#64748b"
            value={draft.requestedSkill}
            onChangeText={requestedSkill => setDraft(current => ({ ...current, requestedSkill }))}
          />

          <Text style={styles.step}>PASSAGGIO 3 DI 3</Text>
          <Text style={styles.label}>Dai un titolo alla proposta</Text>
          <TextInput
            accessibilityLabel="Titolo della proposta"
            style={styles.input}
            placeholder="Un titolo breve e chiaro"
            placeholderTextColor="#64748b"
            value={draft.title}
            onChangeText={title => setDraft(current => ({ ...current, title }))}
          />

          <Text style={styles.label}>Spiega cosa vorresti fare</Text>
          <TextInput
            accessibilityLabel="Descrizione della proposta"
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Descrivi il risultato che vuoi ottenere"
            placeholderTextColor="#64748b"
            value={draft.description}
            onChangeText={description => setDraft(current => ({ ...current, description }))}
          />

          <Text style={styles.label}>Dove?</Text>
          <View style={styles.filters}>
            {FILTERS.slice(1).map(item => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: draft.mode === item.value }}
                key={item.value}
                onPress={() => setDraft(current => ({ ...current, mode: item.value }))}
                style={[styles.filter, draft.mode === item.value && styles.filterActive]}
              >
                <Text style={[styles.filterText, draft.mode === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          {draft.mode !== 'remote' && (
            <>
              <Text style={styles.label}>Luogo</Text>
              <TextInput
                accessibilityLabel="Luogo"
                style={styles.input}
                placeholder="Città o zona"
                placeholderTextColor="#64748b"
                value={draft.location}
                onChangeText={location => setDraft(current => ({ ...current, location }))}
              />
            </>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={busy.publish}
            style={[styles.publish, busy.publish && styles.applyDisabled]}
            onPress={publish}
          >
            <Text style={styles.applyText}>{busy.publish ? 'Pubblico…' : 'Pubblica proposta'}</Text>
          </Pressable>
        </View>
      )}

      {!showCreate && tab === 'discover' && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Trova la persona giusta</Text>
          <TextInput
            accessibilityLabel="Cerca una competenza o un luogo"
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca una competenza o un luogo"
            placeholderTextColor="#64748b"
            style={styles.search}
          />
          <View style={styles.filters}>
            {FILTERS.map(item => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === item.value }}
                key={item.label}
                onPress={() => setFilter(item.value)}
                style={[styles.filter, filter === item.value && styles.filterActive]}
              >
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!showCreate && tab === 'mine' && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Le mie attività</Text>
          <Text style={styles.sectionIntro}>Qui trovi tutto ciò che richiede la tua attenzione.</Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Dashboard')}
        style={styles.moreButton}
      >
        <Text style={styles.moreButtonText}>Altre funzioni MyZubster</Text>
      </Pressable>
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
      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{loading ? 'Caricamento…' : tab === 'discover' ? 'Nessuna proposta trovata' : 'Non hai ancora attività'}</Text>
          {!loading && <Text style={styles.emptyText}>{tab === 'discover' ? 'Prova a cambiare ricerca oppure pubblica ciò che sai fare.' : 'Trova una proposta o pubblicane una per iniziare.'}</Text>}
        </View>
      }
      renderItem={tab === 'discover' ? renderDiscoverItem : renderMyItem}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refreshAll({ silent: false })} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07111f' },
  content: { padding: 16, paddingTop: 24, paddingBottom: 56, flexGrow: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  topBarText: { flex: 1, paddingRight: 12 },
  eyebrow: { color: '#5eead4', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  greeting: { color: '#cbd5e1', fontSize: 15, fontWeight: '700', marginTop: 3 },
  logoutButton: { minHeight: 48, minWidth: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#3b4c67' },
  logoutText: { color: '#e2e8f0', fontSize: 15, fontWeight: '800' },
  title: { color: '#ffffff', fontSize: 32, lineHeight: 38, fontWeight: '900' },
  subtitle: { color: '#cbd5e1', fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 18 },
  choiceList: { gap: 10 },
  choiceButton: { minHeight: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111c2e', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#263550' },
  choiceButtonActive: { backgroundColor: '#ccfbf1', borderColor: '#5eead4' },
  choiceNumber: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#14b8a6' },
  choiceNumberText: { color: '#052e2b', fontSize: 17, fontWeight: '900' },
  choiceText: { flex: 1, marginLeft: 14 },
  choiceTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  choiceTitleActive: { color: '#083344' },
  choiceDescription: { color: '#a8b3c7', fontSize: 14, lineHeight: 19, marginTop: 3 },
  choiceDescriptionActive: { color: '#155e75' },
  helpToggle: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 },
  helpToggleText: { color: '#99f6e4', fontSize: 15, fontWeight: '800' },
  helpToggleIcon: { color: '#5eead4', fontSize: 24, fontWeight: '700' },
  helpPanel: { backgroundColor: '#0d1a2c', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#263550' },
  helpStep: { color: '#e2e8f0', fontSize: 15, lineHeight: 22, marginBottom: 8 },
  helpNote: { color: '#93c5fd', fontSize: 13, lineHeight: 19, marginTop: 4 },
  form: { backgroundColor: '#111c2e', borderRadius: 18, padding: 16, marginTop: 12, marginBottom: 18, borderWidth: 1, borderColor: '#2dd4bf' },
  formHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
  formHeaderText: { flex: 1, paddingRight: 8 },
  formTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  formIntro: { color: '#a8b3c7', fontSize: 14, marginTop: 4 },
  closeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  closeButtonText: { color: '#99f6e4', fontWeight: '800' },
  step: { color: '#5eead4', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 6, marginBottom: 6 },
  label: { color: '#e2e8f0', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  input: { minHeight: 52, backgroundColor: '#07111f', color: '#ffffff', borderColor: '#3b4c67', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  search: { minHeight: 52, backgroundColor: '#111c2e', color: '#ffffff', borderColor: '#3b4c67', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, marginTop: 10 },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 10, flexWrap: 'wrap' },
  filter: { minHeight: 44, justifyContent: 'center', borderColor: '#475569', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  filterActive: { backgroundColor: '#5eead4', borderColor: '#5eead4' },
  filterText: { color: '#e2e8f0', fontWeight: '800', fontSize: 13 },
  filterTextActive: { color: '#052e2b' },
  publish: { minHeight: 54, justifyContent: 'center', backgroundColor: '#5eead4', borderRadius: 12, alignItems: 'center', marginTop: 4 },
  sectionHeader: { marginTop: 22, marginBottom: 10 },
  sectionHeading: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  sectionIntro: { color: '#a8b3c7', fontSize: 14, lineHeight: 20, marginTop: 5 },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  moreButtonText: { color: '#94a3b8', fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
  card: { backgroundColor: '#111c2e', borderColor: '#263550', borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  badge: { color: '#99f6e4', fontWeight: '800', fontSize: 13 },
  status: { color: '#fde68a', fontWeight: '900', fontSize: 13 },
  jobTitle: { color: '#ffffff', fontSize: 21, lineHeight: 27, fontWeight: '900', marginTop: 14 },
  skillBox: { backgroundColor: '#0b1628', borderRadius: 12, padding: 12, marginTop: 10 },
  skillLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  skillValue: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginTop: 4 },
  meta: { color: '#cbd5e1', marginTop: 12, fontWeight: '700' },
  description: { color: '#d7dfeb', fontSize: 15, lineHeight: 22, marginTop: 12 },
  settlement: { color: '#93c5fd', fontSize: 12, lineHeight: 18, marginTop: 12 },
  role: { color: '#c4b5fd', fontWeight: '800', fontSize: 13, marginTop: 14 },
  section: { borderTopWidth: 1, borderTopColor: '#263550', marginTop: 14, paddingTop: 14 },
  sectionTitle: { color: '#ffffff', fontWeight: '900', fontSize: 17, marginBottom: 8 },
  muted: { color: '#a8b3c7', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  infoPill: { backgroundColor: '#18243a', borderRadius: 10, padding: 12, marginTop: 12 },
  infoPillText: { color: '#bfdbfe', fontWeight: '800' },
  applicationCard: { backgroundColor: '#07111f', borderRadius: 12, padding: 12, marginTop: 8 },
  applicationTitle: { color: '#ffffff', fontWeight: '800' },
  applicationStatus: { color: '#fde68a', fontWeight: '900', fontSize: 12, marginTop: 6 },
  secondaryAction: { minHeight: 48, justifyContent: 'center', borderColor: '#5eead4', borderWidth: 1, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  secondaryActionText: { color: '#99f6e4', fontWeight: '900', fontSize: 13, textAlign: 'center' },
  apply: { minHeight: 52, justifyContent: 'center', backgroundColor: '#5eead4', borderRadius: 12, alignItems: 'center', marginTop: 14 },
  applyDisabled: { backgroundColor: '#475569', borderColor: '#475569' },
  applyText: { color: '#052e2b', fontSize: 15, fontWeight: '900', textAlign: 'center', paddingHorizontal: 8 },
  ratingRow: { flexDirection: 'row', gap: 6, marginVertical: 10 },
  ratingButton: { flex: 1, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: '#475569', borderRadius: 9, alignItems: 'center' },
  ratingButtonActive: { backgroundColor: '#fde68a', borderColor: '#fde68a' },
  ratingText: { color: '#e2e8f0', fontWeight: '800' },
  ratingTextActive: { color: '#422006' },
  reviewDone: { color: '#86efac', fontWeight: '800' },
  emptyCard: { backgroundColor: '#0d1a2c', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 8, marginBottom: 32 },
  emptyTitle: { color: '#ffffff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: '#a8b3c7', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
});
