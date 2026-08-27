# FamilyHub

**Eure Familie. Euer Alltag. Alles an einem Ort.**

FamilyHub ist eine zentrale digitale Familienzentrale: Finanzen & Haushaltsbuch, Kalender, Aufgaben mit
Punktesystem für Kinder, Essensplan mit automatischer Einkaufsliste, Familienziele, Geburtstage, Dokumente
und ein Familienchat – mit echter Authentifizierung, einer PostgreSQL-Datenbank und strikter
Datentrennung zwischen Familien (Row Level Security).

## Tech-Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4, eigene UI-Komponenten (shadcn/ui-Stil), Lucide Icons
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, Storage, Realtime)
- **Auth:** Supabase Auth mit Google OAuth + E-Mail/Passwort
- **PWA:** installierbar, mit Offline-Grundfunktionalität (vite-plugin-pwa)
- **Tests:** Vitest

## 1. Projekt installieren

```bash
npm install
```

## 2. Supabase-Projekt erstellen

1. Gehe zu [supabase.com](https://supabase.com) und erstelle ein neues Projekt (Region z. B. Frankfurt).
2. Notiere dir unter **Project Settings → API**:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon public key**

## 3. Environment-Variablen setzen

```bash
cp .env.example .env.local
```

Trage in `.env.local` ein:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<dein-anon-key>
```

`.env.local` wird nie committet (siehe `.gitignore`). Es dürfen **niemals** echte Secrets in den
Quellcode oder nach `.env.example` geschrieben werden.

## 4. Datenbank-Migrationen ausführen

Alle Tabellen, Row-Level-Security-Policies, Trigger und Storage-Buckets liegen als SQL-Migrationen in
`supabase/migrations/`. Mit der [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Das führt alle Migrationen in der richtigen Reihenfolge aus und legt an:

- Alle Tabellen aus dem Datenmodell (Familien, Finanzen, Kalender, Essen, Aufgaben, Ziele, Dokumente, Chat, …)
- Row Level Security auf **jeder** Tabelle: ein Benutzer sieht ausschließlich Daten seiner eigenen Familie,
  private Einträge (`is_private = true`) nur den Besitzer selbst
- Storage-Buckets (`avatars`, `documents`, `receipts`, `recipe-images`, `family-images`) mit passenden Policies
- Standard-Ausgabenkategorien (Wohnen, Lebensmittel, Auto, …)

### Optionale Demo-Daten (nur lokale Entwicklung)

`supabase/seed.sql` enthält eine Beispielfamilie ("Familie Müller") mit Finanzen, Kalender, Rezepten,
Aufgaben und Zielen. **Niemals gegen ein Produktivprojekt ausführen** – sie legt Test-Logins mit
Passwort `FamilyHub123!` an. Für die lokale Entwicklung mit Supabase CLI:

```bash
npx supabase start   # startet lokales Supabase (Docker)
npx supabase db reset  # wendet Migrationen + seed.sql an
```

## 5. Google OAuth einrichten

Google-Login läuft über Supabase Auth – im Frontend ist dafür kein API-Key nötig.

### 5.1 Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → Projekt erstellen/wählen.
2. **APIs & Services → OAuth consent screen** konfigurieren (App-Name "FamilyHub", Support-E-Mail).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized redirect URIs** – trage die Supabase-Callback-URL ein:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
6. Speichere **Client ID** und **Client Secret**.

### 5.2 Supabase Dashboard

1. **Authentication → Providers → Google** aktivieren.
2. Client ID und Client Secret aus Schritt 5.1 eintragen.
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173` (lokal) bzw. eure Produktions-URL
   - Redirect URLs: zusätzlich `http://localhost:5173/**` (und eure Produktions-Domain) freigeben

Damit funktioniert „Mit Google anmelden" ohne weitere Code-Änderungen.

## 6. Development Server starten

```bash
npm run dev
```

Die App läuft unter `http://localhost:5173`.

## 7. Tests ausführen

```bash
npm run test
```

## 8. Production Build erstellen

```bash
npm run build
npm run preview
```

## 9. PWA testen

1. `npm run build && npm run preview`
2. Im Browser öffnen, DevTools → Application → Manifest/Service Worker prüfen
3. Auf dem Smartphone: Seite öffnen → „Zum Startbildschirm hinzufügen"

## Projektstruktur

```
src/
  components/    UI-Bausteine (ui/, layout/, shared/, finance/)
  contexts/      Auth-, Family- und Theme-Context
  hooks/
  lib/           Utilities, Finanzberechnungen, Supabase-Client
  pages/         Eine Datei/Ordner pro Route (auth, dashboard, finances, …)
  services/      Datenzugriffsschicht (ein Service pro Domäne, kapselt Supabase-Queries)
  types/         database.types.ts (Supabase-Datenbanktypen)
supabase/
  migrations/    SQL-Migrationen (Tabellen, RLS, Storage)
  seed.sql       Demo-Daten für die lokale Entwicklung
```

## Sicherheit

- **Row Level Security** ist auf jeder Tabelle aktiv – Berechtigungen werden serverseitig in Postgres
  geprüft, nicht nur im Frontend versteckt.
- Familien sind vollständig voneinander isoliert (`family_id` + RLS-Policy `is_family_member`).
- Private Einträge (Ausgaben, Termine, Dokumente) sind zusätzlich auf den Eigentümer beschränkt.
- Es werden niemals Service-Role-Keys oder andere Secrets im Frontend verwendet – nur der öffentliche
  `anon`-Key, dessen Zugriff vollständig durch RLS eingeschränkt ist.

## Noch erforderlich

Diese App ist vollständig implementiert (Auth, Datenbank, RLS, alle Module), aber folgende Schritte
müsst ihr selbst durchführen, da sie echte, projektspezifische Zugangsdaten erfordern:

1. **Supabase-Projekt anlegen** und `.env.local` mit echter URL + anon key befüllen (Schritt 2–3).
2. **Migrationen ausführen** (Schritt 4) – ohne sie existiert keine einzige Tabelle.
3. **Google OAuth konfigurieren** (Schritt 5) – ohne das funktioniert nur der E-Mail/Passwort-Login.
4. **(Optional) Family Assistant an eine echte KI-API anbinden** – aktuell läuft
   `src/services/family-assistant.service.ts` im Mock-Modus. Für eine echte Anbindung: eine Supabase Edge
   Function anlegen, die den KI-Provider serverseitig aufruft (Secrets dürfen nie ins Frontend), und
   `VITE_AI_PROVIDER` setzen.
5. **(Optional) E-Mail-Templates** in Supabase Dashboard → Authentication → Email Templates auf Deutsch
   anpassen (Registrierung, Passwort zurücksetzen).
