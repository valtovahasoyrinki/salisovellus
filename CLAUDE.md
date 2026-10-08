# CLAUDE.md – Salisovellus

Henkilökohtainen salitreenisovellus (PWA). Yksi käyttäjä, suomenkielinen, täysin offline, ei backendiä.
**Lue aina ensin:** [docs/SPEC.md](docs/SPEC.md) (vaatimukset) ja [PLAN.md](PLAN.md) (arkkitehtuuri, tietomalli, vaiheet).

## Komennot

```bash
npm run dev          # Vite dev-palvelin
npm run dev:host     # dev-palvelin LAN:iin (puhelintestaus)
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # oxlint
npm run test         # vitest run
npm run test:watch   # vitest
npm run test:e2e     # playwright test (iPhone 12 + Pixel 5)
npm run build        # vite build (tuottaa dist/)
npm run preview      # tuotantonipun esikatselu
npm run screenshots  # kuvakaappaukset päänäkymistä (vaatii preview-palvelimen)
npm run icons        # rasteroi sovellusikonit public/icons/*.svg:stä
```

Laatuportti ennen jokaista committia: `npm run typecheck && npm run lint && npm run test && npm run build`.

## Kansiorakenne

- `src/domain/` – puhtaat tyypit ja laskenta (e1RM, ennätykset, volyymi, progressio, trendi, junnaus, viikkosarjat, kierto, oivallukset). **Ei React-, ei Dexie-importteja.** Jokaisella tiedostolla on `*.test.ts`.
- `src/db/` – Dexie-skeema, versiointi/migraatiot, repositoriot, liikekirjaston siemendata. **Ainoa paikka, josta tietokantaa kosketetaan.**
- `src/features/<alue>/` – näkymät ja niiden omat komponentit (onboarding, program, exercises, workout, history, analysis, settings, backup).
- `src/components/` – jaetut primitiivit (`ui/`), kaaviot (`charts/`), ikonit (`icons/`), lihaskartta.
- `src/lib/` – date, format, id, haptics, wakeLock, storage, image.
- `src/app/` – sovelluksen runko, reititys, providerit, alapalkki.
- `tests/e2e/` – Playwright.

## Säännöt

1. **Näkymät eivät kutsu Dexietä suoraan.** Luku `useLiveQuery(() => repo...)`, kirjoitus repositoriofunktiolla.
2. **Laskenta on puhdasta ja testattua.** Uusi laskentasääntö = uusi funktio `src/domain/` + testit, ei logiikkaa komponentin sisään.
3. **Historia on pyhä.** Mikään ohjelman muokkaus ei muuta menneitä sessioita. Liikkeen, jolla on sarjoja, voi vain arkistoida.
4. **Autosave.** Jokainen kuittaus kirjoittuu tietokantaan heti; mitään ei pidetä vain muistissa.
5. **Skeemamuutos = uusi `db.version(n)` + `upgrade()` + migraatiotesti.** Vanhoja versiolohkoja ei muokata jälkikäteen.
6. **Ei mitään, mikä hidastaa sarjan kirjaamista** (SPEC §10). Kirjausnäkymän muutoksilta vaaditaan optimistinen UI.
7. **Ei ulkoisia ajonaikaisia kutsuja**, ei netistä haettuja kuvia tai fontteja, ei kielimallikutsuja. Kaikki precachetaan.
8. **Ei TODO-kommentteja, kuollutta koodia eikä mock-dataa tuotantokoodissa.**
9. Tyylit vain Tailwind-luokilla ja `src/styles/tokens.css`:n muuttujilla. Ei kovakoodattuja värejä komponenteissa.
10. Animaatiot vain `transform`/`opacity`, `prefers-reduced-motion` kunnioitetaan.
11. Lint-poikkeukset (`oxlint-disable-next-line`) vaativat yhden rivin perustelun viereen.

## Konventiot

- TypeScript strict; ei `any`, ei `as`-pakotuksia ilman kommentoitua syytä. Tyypit `import type`.
- Komponentit: nimetty export, PascalCase-tiedosto. Hookit `useX.ts`. Puhtaat moduulit camelCase.
- Käyttöliittymän tekstit suomeksi suoraan komponenteissa (yksi kieli, ei i18n-kehystä). Valmentajasävy: lyhyt, faktapohjainen, ei emojeja, ei hehkutusta.
- Muotoilu `src/lib/format.ts`: paino `fi-FI`-desimaalipilkulla (`82,5 kg`), päivämäärä `ma 12.10.`, kaikki painot ja ajat `tabular-nums`.
- Päivämäärät vain `src/lib/date.ts`:n kautta (Europe/Helsinki, ISO-viikot). Ei `new Date(string)`-jäsennystä muualla.
- ID:t `newId()` (`src/lib/id.ts`), ei `crypto.randomUUID()` suoraan.
- Kosketusalue ≥ 48 px, tärkeät toiminnot ruudun alaosassa, safe-area-paddingit `env(safe-area-inset-*)`.
- Testit: `describe`/`it` suomeksi, rajatapaukset nimetään (tyhjä historia, pelkät lämmittelyt, kehonpaino, negatiivinen lisäpaino, DST).

## Git

Pienet kuvaavat commitit, vähintään yksi per valmis vaihe. Vaihe on valmis vasta kun typecheck, lint, yksikkötestit, E2E ja build menevät läpi ja mobiilikuvakaappaukset on tarkistettu.
