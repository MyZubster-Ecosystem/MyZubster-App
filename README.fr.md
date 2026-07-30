
---

### 🇫🇷 `README.fr.md` (Français)

```markdown
# 📱 MyZubster – App pour l’Échange de Services

**MyZubster** est une application mobile qui met en relation les prestataires de services et les personnes qui en ont besoin. C’est un écosystème complet pour l’échange de services, fondé sur la confidentialité, la sécurité et l’interaction directe peer‑to‑peer – avec des paiements en Monero.

---

## 🎯 Qu’est‑ce que MyZubster App ?

MyZubster n’est pas qu’un simple marché. C’est une plateforme d’**échange de services basée sur la confiance** où vous pouvez :

- Trouver des professionnels et des services près de chez vous grâce à la **géolocalisation**
- Discuter de manière privée et sécurisée via une **messagerie chiffrée de bout en bout**
- Créer et gérer des commandes de service avec un **système de dépôt fiduciaire (escrow)** qui protège les deux parties
- Payer et recevoir des paiements en **Monero (XMR)** – instantanément, en toute confidentialité et sans frontières

---

## ✨ Fonctionnalités Principales

### 📍 Géolocalisation

Trouvez des prestataires de services près de chez vous. Recherchez des professionnels et des freelances en fonction de votre position actuelle ou d’une zone personnalisée. Idéal pour les services locaux, le travail sur site ou les rendez-vous en personne.

- Recherche en temps réel basée sur la localisation
- Filtres par distance, catégorie et évaluation
- Visualisation sur carte des professionnels disponibles

### 💬 Messagerie Privée et Sécurisée

Chaque conversation est **chiffrée de bout en bout**. Personne ne peut lire vos messages – ni nous, ni des tiers. Cela garantit que vos négociations, accords et informations sensibles restent privés.

- Chat en temps réel pour chaque commande
- Partage de fichiers (pièces jointes, images, documents)
- Accusés de lecture et indicateurs de saisie
- Historique des discussions stocké localement et chiffré

### 🛡️ Système Escrow

Le système escrow est le cœur de la confiance dans MyZubster. Lorsqu’un acheteur crée une commande, le paiement est **bloqué en dépôt fiduciaire** jusqu’à ce que le service soit livré et que l’acheteur confirme sa satisfaction. Ce n’est qu’à ce moment que les fonds sont libérés au vendeur.

**Comment fonctionne l’escrow :**

1. **L’acheteur crée une commande** – Le montant convenu est bloqué en escrow (via Monero).
2. **Le vendeur livre le service** – Le vendeur fournit le travail ou le service.
3. **L’acheteur confirme** – Une fois satisfait, l’acheteur libère les fonds.
4. **Le vendeur reçoit le paiement** – Le Monero est transféré au portefeuille du vendeur.

En cas de litige, l’administrateur peut intervenir et décider de l’issue sur la base des preuves et des journaux de communication (tous chiffrés et stockés de manière sécurisée).

### 💰 Paiements en Monero

Tous les paiements sont effectués en **Monero (XMR)** – la cryptomonnaie leader en matière de confidentialité. Cela signifie :

- Pas de banques, pas d’intermédiaires
- Règlement instantané
- Confidentialité totale – personne ne peut voir votre historique de transactions ou votre solde
- Sans frontières – envoyez et recevez de n’importe où dans le monde

### 🔐 Authentification JWT

Connexion et inscription sécurisées via **JSON Web Tokens**. Votre session est protégée et vos données ne sont jamais exposées.

### 📦 Gestion des Commandes

- Créez des commandes de service avec des exigences et des délais clairs
- Suivez l’état de la commande (en attente, en cours, terminée, en litige)
- Recevez des mises à jour en temps réel via des notifications push

### ⭐ Avis et Évaluations

Créez la confiance au sein de la communauté. Après chaque commande, les deux parties peuvent s’évaluer mutuellement et laisser un commentaire. Cela aide tout le monde à prendre des décisions éclairées.

---

## 🏗️ Comment Fonctionne l’Échange de Services (Étape par Étape)
L’acheteur recherche un service (géolocalisation + filtres)
↓

L’acheteur consulte le profil du vendeur et les avis
↓

L’acheteur lance une discussion pour préciser les détails
↓

Ils conviennent du prix, des délais et du périmètre
↓

L’acheteur crée une commande → le paiement est bloqué en escrow
↓

Le vendeur livre le service (ou commence le travail)
↓

L’acheteur vérifie la livraison
↓

L’acheteur confirme sa satisfaction → l’escrow libère les fonds au vendeur
↓

Les deux parties s’évaluent mutuellement

**La confiance est intégrée à chaque étape.**

---

## 🧩 Architecture
┌─────────────────────────────────────────────────────────────┐
│ MYZUBSTER-APP │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ Geolocation │ │ Messaging │ │ Escrow │ │
│ │ (Carte + GPS)│ │ (E2E Enc.) │ │ (Smart Contract)│ │
│ └──────────────┘ └──────────────┘ └──────────────────┘ │
│ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ Monero │ │ JWT Auth │ │ Gestion des │ │
│ │ Paiements │ │ (Sécurisé) │ │ Commandes │ │
│ └──────────────┘ └──────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘

---

## 🔐 Sécurité et Confidentialité

- **Chiffrement de Bout en Bout** – Tous les messages sont chiffrés avant de quitter votre appareil.
- **Aucune Vente de Données** – Vos données vous appartiennent. Nous ne les vendons à personne.
- **Paiements en Monero** – Confidentialité par conception. Personne ne peut tracer votre activité financière.
- **Option Self‑Hosted** – Vous pouvez héberger votre propre instance du backend, ce qui vous donne un contrôle total.

---

## 🚀 Guide de Démarrage Rapide

### Prérequis

- Node.js 18+
- Expo CLI
- Android Studio (pour build APK)
- Appareil Android ou émulateur

### Installation

```bash
git clone https://github.com/DanielIoni-creator/MyZubster-App.git
cd MyZubster-App
npm install
cp .env.example .env
Configurer .env
env

EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
EXPO_PUBLIC_MARKETPLACE_API_URL=http://192.168.1.10:4000/api
NODE_ENV=development

Démarrer le serveur de développement
bash

npx expo start --tunnel

Scannez le QR code avec Expo Go.
🔗 Projets Associés

    MyZubster-Gateway – Core gateway de paiement Monero

    MyZubster-Marketplace – Backend du marketplace

📄 Licence

MIT License
👨‍💻 L’Auteur

Daniel Ioni – Développeur Autodidacte & Monero Advocate

Je suis un développeur italien de 38 ans, basé à Rimini, avec une profonde passion pour la confidentialité, la liberté financière et la technologie open source.

Mon parcours a commencé avec le minage de Bitcoin et a évolué vers un engagement profond avec la communauté Monero. J’ai fondé "Monero Italia" sur Facebook, un groupe dédié à la sensibilisation aux cryptomonnaies axées sur la vie privée en Italie.

Au‑delà du code, j’aime les animaux – j’ai une petite compagne nommée Chanel qui me tient compagnie pendant les sessions de programmation nocturnes. 🐱

Ma vision pour MyZubster est de créer un écosystème libre, ouvert et accessible où chacun peut échanger des services et des compétences sans intermédiaires. La seule règle ? Utilisez‑le pour le bien. Pas d’activités illégales. Tout le reste est permis.

    🌐 Basé à Rimini, Italie

    💻 Développeur Full‑Stack Autodidacte (Node.js, React, React Native, Android)

    🔒 Monero Advocate & Passionné de Vie Privée

    📱 Fondateur de "Monero Italia" (groupe Facebook)

    🐱 Papa de Chanel

    📫 GitHub: DanielIoni-creator

Réalisé avec ❤️ pour la communauté Monero.
Follow the development of MyZubster and connect with me on social media:

- 📖 **Blog & Articles**: [DEV.to - Daniel Ioni](https://dev.to/danielioni)
- 🐦 **X (Twitter)**: [@myzubster](https://x.com/myzubster)
- 💼 **LinkedIn**: [Daniel Ioni](https://www.linkedin.com/in/daniel-ioni-62b2b9423/)
- 🐙 **GitHub**: [DanielIoni-creator](https://github.com/DanielIoni-creator)
- 🎵 **TikTok**: [@h4x0r_23](https://www.tiktok.com/@h4x0r_23)

**Stay updated on the journey!** 🚀

