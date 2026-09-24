# CB Puig-Reig Staff

PWA per a l'staff tècnic del CB Puig-Reig: passar llista, registrar què s'ha
treballat a cada entrenament i consultar els partits. Les dades viuen en un
Google Sheet; l'app només és la cara bonica.

Tot són fitxers plans (HTML/JS/CSS), sense npm ni compilació: es pot editar
directament des de GitHub i publicar-ho amb GitHub Pages.

```
index.html             tota l'app (HTML + CSS + JS en un sol fitxer)
manifest.json          perquè es pugui instal·lar al mòbil
service-worker.js      còpia local per obrir-la sense cobertura
icon-192 / 512 / 512-maskable.png   icones generades des del logo
logo-club.png          logo original (font de les icones)
Codi_AppsScript.gs     el backend, per enganxar al Apps Script del Sheet
```

---

## Muntatge (un sol cop)

### 1 · El Google Sheet

Crea un full de càlcul nou a Drive (o fes servir'n un que ja tinguis).
**No cal crear les pestanyes a mà** — ho fa sol el pas següent.

### 2 · L'Apps Script

1. Dins del Sheet: **Extensions → Apps Script**.
2. Esborra el que hi hagi i enganxa-hi tot el contingut de `Codi_AppsScript.gs`. Desa.
3. A dalt, tria la funció **`setup`** i clica ▶ **Executar**.
   La primera vegada Google demanarà permisos: accepta-ho.
   Això crea les 6 pestanyes amb les capçaleres i hi posa els conceptes inicials.
4. **Desplega → Nou desplegament → Aplicació web**:
   - Executa com: **Jo** (el teu compte)
   - Qui hi té accés: **Qualsevol persona**
5. Copia la URL que acaba en **`/exec`**.

### 3 · Connectar l'app

Obre `index.html`, busca a baix de tot:

```js
const CONFIG = {
  API_URL: ""
};
```

i enganxa-hi la URL entre les cometes. És l'única línia que cal tocar.

### 4 · Publicar-ho

1. Repo nou a GitHub (per exemple `puigreig-staff`) amb tots aquests fitxers a l'arrel.
2. **Settings → Pages →** branca principal, carpeta `/ (root)`.
3. Al mòbil, obre la URL que et dona GitHub Pages i fes
   **Afegir a la pantalla d'inici**. Ja la tens com una app.

### 5 · La plantilla

Omple la pestanya **Jugadors** del Sheet: un nom per fila, i `SI` a la columna
`Actiu`. Només els actius surten a la llista d'assistència.

---

## Les pestanyes del Sheet

| Pestanya | Columnes | Qui hi escriu |
|---|---|---|
| `Jugadors` | Nom · Equip · Actiu (SI/NO) | tu, a mà |
| `Assistencia` | Data · Jugador · Assistit · Comentari · Timestamp | l'app |
| `Entrenaments_exercicis` | Data · Concepte · Minuts · Comentari · Timestamp | l'app |
| `Conceptes` | Concepte · Descripcio · Treballat_SI_NO · Ordre | tots dos |
| `Partits` | Data · Rival · Resultat_propi · Resultat_rival · Local_Visitant | **tu, a mà** |
| `Partits_jugadors` | Data · Jugador · Minuts_jugats · Plus_minus · Punts · Comentari | **tu, a mà** |

Els partits i les estadístiques individuals s'introdueixen **directament al
Sheet**; l'app només els llegeix. Es lliguen entre ells per la columna `Data`.

Pots afegir, treure o reordenar conceptes quan vulguis: l'app els llegeix cada
cop que s'obre.

---

## Com funciona per dins

**Assistència.** En triar un dia, l'app mira si aquell dia ja té llista. Si en
té, la carrega tal com estava i avisa que desar-la la substituirà (esborra les
files velles d'aquell dia i n'escriu de noves) — així no es dupliquen mai.
Per defecte tothom surt com a present; en marcar una absència s'obre sol el
camp de comentari.

**Entrenaments.** Igual: un dia només pot tenir una sessió, i tornar-la a desar
la substitueix. En desar, els conceptes que hi surten es marquen sols com a
treballats a la pestanya `Conceptes` (marcar-los sí, desmarcar-los mai — un
concepte treballat un altre dia ha de continuar comptant).

**Els 404 d'Apps Script.** El web app de Google respon 404 de tant en tant, i
quan ho fa sovint ja ha escrit les files igualment. Per això l'app no reintenta
mai a cegues: entre intent i intent rellegeix el full i comprova si les dades ja
hi són, també just abans de rendir-se. És el mateix truc que fan servir les
apps del Manresa.

**Sense login.** Qualsevol que tingui l'enllaç pot entrar i editar. És un grup
petit i de confiança; si algun dia cal, s'hi pot afegir.

---

## Fer canvis més endavant

- **A l'app** (colors, textos, pantalles): edita `index.html` i puja'l. Puja
  també el número de `VERSIO` a `service-worker.js` perquè els mòbils que ja la
  tinguin instal·lada n'agafin la versió nova en comptes de la còpia guardada.
- **Al backend**: edita l'Apps Script i fes
  **Desplega → Gestiona desplegaments → llapis → Versió: Nova versió**.
  Així la URL `/exec` no canvia i no cal tocar l'`index.html`.
- **Les icones**: es generen des de `logo-club.png`. Si canvia el logo, cal
  tornar a generar `icon-192.png`, `icon-512.png` i `icon-512-maskable.png`.
