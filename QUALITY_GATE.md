# Bandy Quality Gate — första pilotversionen

Kvalitetskontrollerna är avsiktligt separata från den publicerade appen. De här filerna förändrar inte **index.html**.

## Körning på utvecklardator

Kräver Node.js 22+, Python 3 och internet för att installera testberoenden och webbläsarmotorer.

1. `npm install`
2. `npx playwright install chromium webkit`
3. `npm run check:syntax`
4. `npm test`

Testerna startar automatiskt en lokal webbserver på port 4173. `npm run test:smoke` kör endast starttesterna.

## Automatisk kontroll i GitHub Actions

Körs vid pull requests, push till `main` och manuellt. PR-grenar får då inte dubbla körningar. En misslyckad syntaxkontroll eller ett misslyckat webbläsartest gör att jobbkörningen misslyckas. Vid fel sparas skärmbilder, spårningsfiler och HTML-rapport som GitHub Actions-artifakter.

**Obs:** GitHub Actions ger inte automatiskt en blockerande merge-regel. Aktivera en required status check i grenreglerna när första körningen fungerar.

## Testad funktionalitet

- Startsida och tom bandyplan utan ohanterade JavaScript-fel.
- Frihandsritning i Fokusläge utan spelare.
- Färg och streckad linjestil.
- Radera en av två skisser och ångra raderingen.
- Ångra senaste skissen utan att radera den tidigare.
- Mobil kontroll att Fokusverktygsfältet ligger innanför skärmen.
- Diagonal frihandsskiss hamnar på samma position som pekgesten.
- Skissen finns kvar efter byte mellan Fokusläge och vanligt läge.

Testprojekten är Chromium på dator, mobil Chromium-emulering och iPhone-emulering med WebKit. **Emulering motsvarar inte ett praktiskt test på en fysisk iPhone.** Ritgesterna körs tills vidare via Playwrights muspekare, även i mobila viewportar; äkta touchgester är en separat nästa kontroll.

## Releasekriterier (pilot)

1. Syntaxkontrollen godkänd.
2. Alla regressionstester godkända. Ingen poängsättning som döljer kritiska fel.
3. Kända blockerande fel åtgärdade, eller releasen stoppad.
4. Resultat och risker granskade före merge till `main`.

## Planerade tillägg

- Test av importerad/exporterad JSON och bevarande av spelare, linjer och händelser.
- Simulering av passningsordning och bollägande.
- Touchgester och visuella regressionsbilder på iPhone.
- Utökad kodanalys, reproducerbar dependency lockfile och skyddad huvudgren.
