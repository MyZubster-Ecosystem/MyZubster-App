
---

### 🇪🇸 `README.es.md` (Español)

```markdown
# 📱 MyZubster – App para Intercambio de Servicios

**MyZubster** es una aplicación móvil que conecta a quienes ofrecen servicios con quienes los necesitan. Es un ecosistema completo para el intercambio de servicios, basado en privacidad, seguridad e interacción directa peer‑to‑peer – con pagos en Monero.

---

## 🎯 ¿Qué es MyZubster App?

MyZubster no es solo un marketplace. Es una plataforma de **intercambio de servicios basada en la confianza** donde puedes:

- Encontrar profesionales y servicios cerca de ti gracias a la **geolocalización**
- Chatear de forma privada y segura mediante **mensajería cifrada end‑to‑end**
- Crear y gestionar pedidos de servicio con un **sistema de depósito fiduciario (escrow)** que protege a ambas partes
- Pagar y recibir pagos en **Monero (XMR)** – al instante, de forma privada y sin fronteras

---

## ✨ Funcionalidades Principales

### 📍 Geolocalización

Encuentra proveedores de servicios cerca de ti. Busca profesionales y autónomos según tu ubicación actual o un área personalizada. Perfecto para servicios locales, trabajo presencial o encuentros en persona.

- Búsqueda en tiempo real basada en la ubicación
- Filtros por distancia, categoría y valoración
- Visualización en mapa de profesionales disponibles

### 💬 Mensajería Privada y Segura

Cada chat está **cifrado end‑to‑end**. Nadie puede leer tus mensajes – ni nosotros, ni terceros. Esto garantiza que tus negociaciones, acuerdos e información sensible permanezcan privados.

- Chat en tiempo real para cada pedido
- Compartición de archivos (adjuntos, imágenes, documentos)
- Confirmación de lectura e indicador de escritura
- Historial de chat guardado localmente y cifrado

### 🛡️ Sistema Escrow

El sistema escrow es el corazón de la confianza en MyZubster. Cuando un comprador crea un pedido, el pago se **bloquea en depósito fiduciario** hasta que se entrega el servicio y el comprador confirma su satisfacción. Solo entonces se liberan los fondos al vendedor.

**Cómo funciona el escrow:**

1. **El comprador crea un pedido** – El importe acordado se bloquea en escrow (mediante Monero).
2. **El vendedor entrega el servicio** – El vendedor proporciona el trabajo o servicio.
3. **El comprador confirma** – Una vez satisfecho, el comprador libera los fondos.
4. **El vendedor recibe el pago** – El Monero se transfiere a la cartera del vendedor.

En caso de disputa, el administrador puede intervenir y decidir el resultado basándose en pruebas y registros de comunicación (todos cifrados y almacenados de forma segura).

### 💰 Pagos con Monero

Todos los pagos se realizan en **Monero (XMR)** – la criptomoneda líder en privacidad. Esto significa:

- Sin bancos, sin intermediarios
- Liquidación instantánea
- Privacidad total – nadie puede ver tu historial de transacciones o saldo
- Sin fronteras – envía y recibe desde cualquier parte del mundo

### 🔐 Autenticación JWT

Inicio de sesión y registro seguros mediante **JSON Web Tokens**. Tu sesión está protegida y tus datos nunca se exponen.

### 📦 Gestión de Pedidos

- Crea pedidos de servicio con requisitos y plazos claros
- Realiza un seguimiento del estado del pedido (pendiente, en curso, completado, en disputa)
- Recibe actualizaciones en tiempo real mediante notificaciones push

### ⭐ Reseñas y Valoraciones

Genera confianza en la comunidad. Después de cada pedido, ambas partes pueden valorarse mutuamente y dejar comentarios. Esto ayuda a todos a tomar decisiones informadas.

---

## 🏗️ Cómo Funciona el Intercambio de Servicios (Paso a Paso)
El comprador busca un servicio (geolocalización + filtros)
↓

El comprador visualiza el perfil del vendedor y las reseñas
↓

El comprador inicia un chat para discutir los detalles
↓

Acuerdan precio, plazos y alcance
↓

El comprador crea un pedido → el pago se bloquea en escrow
↓

El vendedor entrega el servicio (o comienza el trabajo)
↓

El comprador verifica la entrega
↓

El comprador confirma la satisfacción → el escrow libera los fondos al vendedor
↓

Ambas partes se valoran mutuamente

**La confianza está integrada en cada paso.**

---

## 🧩 Arquitectura
┌─────────────────────────────────────────────────────────────┐
│ MYZUBSTER-APP │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ Geolocation │ │ Messaging │ │ Escrow │ │
│ │ (Mapa + GPS) │ │ (E2E Enc.) │ │ (Smart Contract)│ │
│ └──────────────┘ └──────────────┘ └──────────────────┘ │
│ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ Monero │ │ JWT Auth │ │ Gestión Pedidos │ │
│ │ Pagos │ │ (Seguro) │ │ (Estado, Chat) │ │
│ └──────────────┘ └──────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘

---

## 🔐 Seguridad y Privacidad

- **Cifrado End‑to‑End** – Todos los mensajes se cifran antes de salir de tu dispositivo.
- **Sin Venta de Datos** – Tus datos son tuyos. No los vendemos a nadie.
- **Pagos con Monero** – Privacidad por diseño. Nadie puede rastrear tu actividad financiera.
- **Opción Self‑Hosted** – Puedes alojar tu propia instancia del backend, dándote el control total.

---

## 🚀 Guía Rápida

### Prerrequisitos

- Node.js 18+
- Expo CLI
- Android Studio (para build APK)
- Dispositivo Android o emulador

### Instalación

```bash
git clone https://github.com/DanielIoni-creator/MyZubster-App.git
cd MyZubster-App
npm install
cp .env.example .env
Configura .env
env

EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
EXPO_PUBLIC_MARKETPLACE_API_URL=http://192.168.1.10:4000/api
NODE_ENV=development

Inicia el servidor de desarrollo
bash

npx expo start --tunnel

Escanea el código QR con Expo Go.
🔗 Proyectos Relacionados

    MyZubster-Gateway – Core gateway de pagos Monero

    MyZubster-Marketplace – Backend del marketplace

📄 Licencia

MIT License
👨‍💻 El Autor

Daniel Ioni – Desarrollador Autodidacta & Monero Advocate

Soy un desarrollador italiano de 38 años, con sede en Rímini, con una profunda pasión por la privacidad, la libertad financiera y la tecnología de código abierto.

Mi viaje comenzó con la minería de Bitcoin y evolucionó hacia una participación profunda con la comunidad Monero. Fundé "Monero Italia" en Facebook, un grupo dedicado a difundir la conciencia sobre las criptomonedas centradas en la privacidad en Italia.

Más allá del código, amo los animales – tengo una pequeña compañera llamada Chanel que me hace compañía durante las sesiones nocturnas de programación. 🐱

Mi visión para MyZubster es crear un ecosistema libre, abierto y accesible donde cualquiera pueda intercambiar servicios y habilidades sin intermediarios. La única regla? Úsalo para el bien. Nada de actividades ilegales. Todo lo demás es válido.

    🌐 Basado en Rímini, Italia

    💻 Desarrollador Full‑Stack Autodidacta (Node.js, React, React Native, Android)

    🔒 Monero Advocate & Entusiasta de la Privacidad

    📱 Fundador de "Monero Italia" (grupo de Facebook)

    🐱 Papá de Chanel

    📫 GitHub: DanielIoni-creator

Hecho con ❤️ para la comunidad Monero.
Follow the development of MyZubster and connect with me on social media:

- 📖 **Blog & Articles**: [DEV.to - Daniel Ioni](https://dev.to/danielioni)
- 🐦 **X (Twitter)**: [@myzubster](https://x.com/myzubster)
- 💼 **LinkedIn**: [Daniel Ioni](https://www.linkedin.com/in/daniel-ioni-62b2b9423/)
- 🐙 **GitHub**: [DanielIoni-creator](https://github.com/DanielIoni-creator)
- 🎵 **TikTok**: [@h4x0r_23](https://www.tiktok.com/@h4x0r_23)

**Stay updated on the journey!** 🚀


