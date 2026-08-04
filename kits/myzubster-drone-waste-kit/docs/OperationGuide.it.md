# Guida operativa — Kit Drone per Rifiuti (IT)

Questa guida descrive l'uso del software di controllo e della missione demo
per il kit drone per la raccolta dei rifiuti (issue #51). Il kit è lo strato
software; il prototipo fisico e i test su campo sono eseguiti separatamente
dall'integratore.

## Ciclo di missione

La macchina a stati `DroneWasteMission` in `index.js` gestisce il ciclo:

IDLE -> TAKEOFF -> SURVEY -> DETECTED -> APPROACH -> COLLECT -> LOADED
-> RETURN -> LAND -> RECHARGE

- **SURVEY** esplora i waypoint; le rilevazioni YOLOv8s sono post-elaborate
  (NMS, mappa classi, distanza pinhole) e viene selezionato il bersaglio più
  vicino disponibile.
- **APPROACH** si avvicina; raggiunta la soglia di avvicinamento, il
  collettore afferra.
- **COLLECT** pesa la preda (soffitto 1 kg). Raggiunto il soffitto passa a
  **LOADED**.
- **RETURN** torna alla base; all'arrivo atterra e pianifica la ricarica solare.
- Una batteria bassa durante il survey interrompe e torna in **RETURN**.

## Esecuzione della demo

Dall'app, apri la schermata **DroneKit** e premi "Esegui missione demo". La
schermata chiama `runDroneMissionSimulation` con un sensore scriptato che
percorre l'intero ciclo e riporta massa raccolta, distanza e stato finale.

Nel codice:

```js
import { runMissionSequence } from './index';

const result = runMissionSequence({
  base: { lat: 45.4642, lng: 9.19 },
  geofence: { center: { lat: 45.4642, lng: 9.19 }, radiusKm: 5 },
  targets: [/* punti GPS */],
  script: [/* snapshot sensore */],
});
// result.summary.completed, result.summary.collectedKg ...
```

## Autonomia e energia

`power/autonomyBudget.js` impone il budget di 30 minuti, il raggio di 5 km e
una riserva di rientro del 15 %, e stima la durata di ricarica solare. Usa
`canCompleteMission(distanceKm)` prima del decollo per confermare che il
percorso pianificato rientri nel budget utilizzabile.

## Sicurezza

- Non superare il carico di 1 kg (`firmware/collector.abort` in caso di sovraccarico).
- Mantieni il raggio <= 5 km; i bersagli fuori portata sono limitati al limite.
- Una batteria bassa interrompe il survey e torna alla base.
- I test su campo sono responsabilità dell'integratore; questo kit è solo software.
