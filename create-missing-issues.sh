#!/bin/bash

echo "📝 Creazione issue mancanti..."
echo ""

# Issue 1: Transparency Statement
echo "🔹 Creazione issue: Transparency Statement..."
gh issue create --repo MyZubster-Ecosystem/myzubster-docs \
  --title "[Docs] Add transparency statement about automation usage" \
  --body "## 📋 Obiettivo
Aggiungere una dichiarazione di trasparenza sull'uso dell'automazione nel progetto MyZubster.

## 🎯 Tasks
- [ ] Aggiungere sezione '🤖 Transparency & Automation' nel README.md
- [ ] Dichiarare l'uso di automazione per issue/PR/bounty
- [ ] Spiegare il processo di revisione umana
- [ ] Elencare i bot utilizzati (@myzubster-bot)
- [ ] Aggiungere link alla issue #209 (automated label)

**Labels:** documentation,transparency,free,good-first-issue"
echo "✅ Issue Transparency Statement creata"
echo ""

# Issue 2: Animal Registry Documentation
echo "🔹 Creazione issue: Animal Registry Documentation..."
gh issue create --repo MyZubster-Ecosystem/myzubster-animal-registry \
  --title "[Docs] Complete animal registry documentation and API reference" \
  --body "## 📋 Obiettivo
Completare la documentazione per il sistema di registrazione animali, inclusa l'API reference.

## 🎯 Tasks
- [ ] Documentare endpoint API per registrazione animali
- [ ] Documentare flusso di registrazione NFC
- [ ] Aggiungere esempi di richieste/risposte
- [ ] Documentare modelli dati
- [ ] Aggiungere guida all'integrazione

**Labels:** documentation,animals,nfc,free,good-first-issue"
echo "✅ Issue Animal Registry creata"
echo ""

# Issue 3: Contributing Guide Update
echo "🔹 Creazione issue: Contributing Guide Update..."
gh issue create --repo MyZubster-Ecosystem/myzubster-docs \
  --title "[Docs] Update CONTRIBUTING.md with automation guidelines" \
  --body "## 📋 Obiettivo
Aggiornare la guida per i contributor per includere informazioni sull'automazione.

## 🎯 Tasks
- [ ] Aggiungere sezione 'Automation in this project'
- [ ] Spiegare come vengono gestite issue/PR automaticamente
- [ ] Documentare come riconoscere commenti automatizzati
- [ ] Spiegare il processo di review umana

**Labels:** documentation,community,free,good-first-issue"
echo "✅ Issue Contributing Guide creata"
echo ""

# Issue 4: Master README
echo "🔹 Creazione issue: Master README..."
gh issue create --repo MyZubster-Ecosystem/myzubster-docs \
  --title "[Docs] Create master README with project overview and status" \
  --body "## 📋 Obiettivo
Creare un README principale per myzubster-docs che fornisca una panoramica completa del progetto.

## 🎯 Tasks
- [ ] Creare README.md con overview del progetto
- [ ] Aggiungere tabella di stato aggiornata
- [ ] Aggiungere link a tutti i repository
- [ ] Aggiungere sezione 'Getting Started'
- [ ] Aggiungere sezione 'Project Status'

**Labels:** documentation,free,good-first-issue"
echo "✅ Issue Master README creata"
echo ""

echo "🎉 Tutte le 4 issue mancanti sono state create!"
