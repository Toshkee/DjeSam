# ĐeSam

**ĐeSam** je mobilna aplikacija (iOS i Android) koja pamti đe si parkirao, vodi te nazad do auta i podsjeća te prije nego plaćeni parking istekne. Pravljena je prvo za Crnu Goru: interfejs je na crnogorskom (latinica), a cijena se vodi u eurima.

Sve radi lokalno na telefonu. Nema naloga, servera ni sinhronizacije u oblaku.

## Funkcionalnosti

- **Sačuvaj parking**: GPS lokacija sa prikazanom preciznošću. Ako je fiks približan, aplikacija to kaže i nudi ručno podešavanje pina na mapi. Ručno označavanje radi i bez GPS-a ili bez dozvole za lokaciju.
- **Opcioni detalji**: vrsta parkinga (ulica, garaža, plac, privatni, ostalo), sprat, sekcija ili zona, broj mjesta, napomena, fotografija (kamera ili galerija) i plaćeni iznos.
- **Tajmer parkiranja**: 30 min, 1 h, 2 h ili prilagođeno trajanje. Može se produžiti i zaustaviti. Lokalna obavještenja stižu prije isteka (5, 10, 15 ili 30 min, po izboru) i u trenutku isteka.
- **Vrati me do auta**: mapa sa autom i tvojom lokacijom, stvarna udaljenost i pješačka uputstva preko Apple ili Google Mapa (sa rezervom preko pregledača ili dijeljenja lokacije). Za garaže prikazuje sprat, sekciju i fotografiju.
- **Istorija**: lista parkinga po stranicama, sa minijaturama, detaljima, izmjenom, brisanjem i brisanjem cijele istorije.
- **Podešavanja**:
  - tema (sistemska, svijetla ili tamna)
  - podsjetnici i podrazumijevani tajmer
  - status svih dozvola
  - opcione adrese (reverse geocoding)
  - privatnost, verzija aplikacije i brisanje svih podataka

## ĐeSam Premium (jednokratna kupovina)

Osnovne funkcije su besplatne: čuvanje parkinga, „Vrati me do auta”, sprat/sekcija/napomena, tajmer na ekranu i posljednjih 5 parkinga u istoriji.

Premium se otključava **jednom** (Apple tip *Non-Consumable*, bez pretplate) i uključuje:
- podsjetnike na telefonu prije isteka i pri isteku parkinga
- fotografiju parkinga
- neograničenu istoriju (stariji parkinzi se i dalje čuvaju, samo su sakriveni u besplatnoj verziji)
- satelitsku i hibridnu mapu (teren na Androidu)
- sačuvane zone, koje jednim dodirom popune tajmer i vrstu parkinga

Tehnički detalji:
- **Biblioteka:** kupovina ide preko `expo-iap` (StoreKit 2 / Google Play Billing), bez servera.
- **Keš:** stanje otključavanja čuva se lokalno u SQLite-u i osvježava iz prodavnice pri svakom pokretanju, pa radi i offline. Rad sa prodavnicom je u `src/features/premium/`.
- **Expo Go:** in-app kupovina tamo ne postoji. U razvojnom režimu Podešavanja zato imaju prekidač „Premium (test, samo u razvoju)” za isprobavanje zaključanih i otključanih stanja.

### Podešavanje proizvoda u App Store Connect-u
1. U *Agreements, Tax, and Banking* potpiši **Paid Apps Agreement** i unesi bankovne i poreske podatke.
2. Prijavi se u **App Store Small Business Program** (provizija 15% umjesto 30%).
3. U aplikaciji otvori *Monetization → In-App Purchases* i napravi proizvod:
   - tip: **Non-Consumable**
   - Product ID: `com.toshkee.desam.premium` (mora se poklapati sa `PREMIUM_PRODUCT_ID` u `src/features/premium/store.ts`)
   - cijena po izboru (npr. €3,99); aplikacija prikazuje cijenu koju vrati prodavnica, pa se kasnije mijenja bez nove verzije
   - naziv i opis (npr. „ĐeSam Premium”) i screenshot za review
4. Kupovinu testiraj u development buildu ili TestFlight-u, sa Sandbox nalogom.

## Tehnologije

| Oblast | Izbor |
| --- | --- |
| Okvir | Expo SDK 57, React Native 0.86, React 19.2, TypeScript (strict, `noUncheckedIndexedAccess`) |
| Navigacija | Expo Router (`src/app`) |
| Mapa | `react-native-maps` (Apple Maps na iOS-u, Google Maps na Androidu) |
| Lokacija | `expo-location` (samo dok je aplikacija otvorena, bez lokacije u pozadini) |
| Podaci | `expo-sqlite` (migracije preko `PRAGMA user_version`) |
| Fotografije | `expo-image-picker`, `expo-file-system` (`<documents>/photos`), `expo-image` |
| Podsjetnici | `expo-notifications` (samo lokalna obavještenja) |
| Testovi | Jest (`jest-expo`) i pravi SQLite preko ugrađenog `node:sqlite` |

## Arhitektura

```
src/
  app/                 Ekrani (Expo Router)
    (tabs)/            Mapa, Istorija, Podešavanja
    save.tsx           Čuvanje parkinga (modal)
    edit/[id].tsx      Izmjena parkinga
    session/[id].tsx   Detalji parkinga
    return/[id].tsx    Vrati me do auta
    timer/[id].tsx     Tajmer (sheet)
  components/
    ui/                Primitivi dizajna (tekst, dugmad, čipovi, liste, baneri, toast)
    parking/           Komponente domena (forma, marker, tajmer, istorija…)
  features/
    parking/           Tipovi, repozitorijum (SQL), servis (komande), hook-ovi (upiti)
    timer/             Čista logika tajmera i planiranja podsjetnika
    notifications/     Zakazivanje i usklađivanje lokalnih obavještenja
    location/          Dozvole, GPS fiks, praćenje, reverse geocoding
    photos/            Čuvanje i čišćenje fotografija
    directions/        URL-ovi za mape i otvaranje eksternih aplikacija
    settings/          Podešavanja (SQLite key/value) i provider
  db/                  Konekcija, migracije, uski `Db` interfejs
  i18n/                Rječnici (`locales/me.ts`), množina, formatiranje datuma, trajanja, udaljenosti i €
  theme/               Tokeni (boje za svijetlu i tamnu temu, razmaci, tipografija), ThemeProvider
  lib/                 Geo matematika, single-flight, useNow
```

Ključne odluke:

- **Slojevi.** Ekrani pozivaju servis (`features/parking/service.ts`). Servis koordiniše repozitorijum, fotografije i podsjetnike. Repozitorijum zavisi samo od uskog `Db` interfejsa, pa se testira nad pravim SQLite-om u Node-u.
- **Jedan aktivan parking.** Pravilo važi na dva nivoa:
  - u bazi: parcijalni `UNIQUE` indeks `WHERE ended_at IS NULL`
  - u kodu: novi parking u istoj transakciji završava stari, a `singleFlight` sprečava duple unose kod brzog dvostrukog tapa.
- **Podsjetnici.** Svaki podsjetnik ima determinističan identifikator (`desam.parking.<id>.<vrsta>`). `syncReminders` otkazuje zastarjele podsjetnike i zakazuje one koji trebaju, pa se ista funkcija koristi i pri svakoj promjeni i za usklađivanje pri pokretanju aplikacije. Tajmer na ekranu je samo prikaz; upozorenja ne zavise od JavaScript tajmera.
- **Putanje fotografija.** Fotografije se čuvaju po imenu fajla, ne po apsolutnoj putanji, jer se putanja kontejnera na iOS-u mijenja između ažuriranja. Fotografija koja nedostaje prikazuje se kao „nije dostupna”. Pri pokretanju se brišu fajlovi bez vlasnika, koji ostanu nakon prekinutih operacija.
- **Lokalizacija.** Svi tekstovi su u `src/i18n/locales/me.ts`, a tip `Strings` je izveden iz tog fajla. Novi jezik se dodaje kao novi objekat istog tipa u `src/i18n/index.tsx`. Formatiranje (datumi, trajanje, udaljenost, €, množina 1, 2–4 i 5+) je ručno i testirano, jer `Intl` podaci za crnogorski nisu pouzdani na svim uređajima.
- **Monetizacija.** Za sada nije implementirana i nema lažnog paywall-a. Kasniji „Premium” bi se dodao kao poseban feature modul, bez promjena u osnovnom toku.

## Pokretanje

Potrebno je:

- Node 22.13+ ili 24.3+
- za iOS: Xcode i iOS Simulator
- za Android: Android Studio i SDK

```bash
npm install
```

### Najbrže: Expo Go na telefonu

Projekat je na SDK 57, koji Expo Go iz App Store-a i Google Play-a podržava. Telefon i Mac moraju biti na istoj Wi-Fi mreži.

```bash
npx expo start --go
```

QR kod skeniraj kamerom (iPhone) ili iz Expo Go aplikacije (Android). `--go` je potreban jer je instaliran i `expo-dev-client`. Ako se projekat beskonačno otvara, provjeri da li si na istoj mreži i da macOS firewall dozvoljava dolazne konekcije za `node`.

### Development build

Za build van Expo Go-a: nativni folderi `ios/` i `android/` generišu se automatski (CNG) i nisu dio repozitorijuma.

### iOS (simulator ili uređaj)

```bash
npx expo run:ios
```

Ako `pod install` padne sa greškom `Unicode Normalization not appropriate for ASCII-8BIT`, CocoaPods-u treba UTF-8 lokal:

```bash
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
```

### Android

Android mapi treba Google Maps API ključ (Maps SDK for Android). Ključ se prosljeđuje preko promjenljive okruženja:

```bash
GOOGLE_MAPS_ANDROID_API_KEY=tvoj_kljuc npx expo run:android
```

Bez ključa aplikacija radi, ali mapa na Androidu ostaje prazna. Lokacija, čuvanje, tajmer i uputstva preko Google Mapa i dalje funkcionišu. Ključ treba ograničiti na package `com.toshkee.desam` i SHA-1 sertifikata.

### Razvojni server (nakon instaliranog dev builda)

```bash
npm run start:dev-client
```

### EAS (build u oblaku)

```bash
npx eas-cli@latest build --profile development --platform ios
```

## Testiranje i provjere

```bash
npm test            # Jest: tajmer, podsjetnici, formatiranje, množina, geo, single-flight, URL-ovi mapa, SQLite repozitorijum i migracije
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint (uključuje React Compiler pravila)
npx expo-doctor     # provjera kompatibilnosti zavisnosti
```

## Ograničenja

- **GPS u zatvorenom.** Običan GPS u garažama i zatvorenim prostorima često nije precizan. Aplikacija ne tvrdi da radi navigaciju u zatvorenom, već nudi sprat, sekciju, broj mjesta i fotografiju.
- **Mapa traži internet.** Mapske podloge učitava provajder (Apple ili Google). Sačuvane koordinate, fotografije, napomene i tajmeri rade i bez interneta.
- **Adrese su opcione.** Adresu određuje sistemski servis (Apple ili Google) i za to treba internet. Može se isključiti u Podešavanjima.
- **Tačnost obavještenja na Androidu.** Android 14+ podrazumijevano ne dozvoljava „exact alarm”, pa podsjetnik može stići i nekoliko minuta kasnije. iOS ograničava aplikaciju na 64 zakazana obavještenja, a ĐeSam koristi najviše 2.
- **Plaćanje.** Aplikacija ne plaća i ne produžava parking. Tajmer samo mjeri vrijeme koje korisnik unese.
- **Nema sigurnosne kopije.** Brisanjem aplikacije brišu se i podaci.

### Provjereno na iOS simulatoru (iPhone 18 Pro Max, iOS 27)

- Traženje dozvole za lokaciju, centriranje mape i čuvanje parkinga preko GPS-a (preciznost ±5 m).
- Ručno pomjeranje pina, vrsta parkinga, sprat, fotografija iz galerije i tajmer.
- Objašnjenje prije sistemskog upita za obavještenja.
- Odbrojavanje i produženje tajmera.
- Ekran „Vrati me do auta”: stvarna udaljenost, otvaranje Apple Mapa i dijeljenje lokacije.
- Završavanje i brisanje parkinga, istorija, detalji i svijetla/tamna tema.
- Podaci ostaju sačuvani nakon restarta aplikacije.

### Šta treba testirati na fizičkom uređaju

- Preciznost GPS-a napolju i u garaži, i podešavanje pina.
- Stizanje podsjetnika kad je aplikacija zatvorena i nakon restarta telefona.
- Kamera. iOS Simulator nema kameru.
- Prepoznavanje instalirane Google Maps aplikacije na iOS-u i biranje aplikacije na Androidu.
- Android build sa Google Maps ključem.

## Licenca

Privatni projekat.
