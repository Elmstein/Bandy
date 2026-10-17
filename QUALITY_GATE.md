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

## Quality Gate v2 – beröring, tid och beständighet

Testsviten kompletteras med tre riskområden:

- **Pekskärm:** Playwrights riktiga touch-tap i Android/Chromium och iPhone/WebKit; Android-svep och tvåfingerszoom med Chromium DevTools Protocol (CDP). Testar diagonal skiss, selektiv radering och ångra. CDP är webbläsaremulering – inget fysiskt iPhone-test.
- **Bollhändelser:** deterministiskt pass → pass → skott med tidsordning och fasta mottagningspunkter; en omöjlig passning ska inte stjäla bollägandet. Övningarna laddas via appens ordinarie JSON-import.
- **Data:** JSON-export/import med bevarade punkter och händelseordning, avvisning av ogiltig JSON utan dataförlust, samt spara/ladda lokal övning efter sidomladdning.

Det här är regressionstester av specifika flöden, inte en fullständig simulering av alla möjliga spelrörelser eller en kontroll på fysisk hårdvara. Nya tester måste passera i GitHub Actions innan PR slås samman.

## Quality Gate v3 – kompletta redigeringsflöden

De nya testerna genomför ändringar **genom appens synliga kontroller och pek-/musgester**. Appens snapshot läses bara för att verifiera resultatet, aldrig för att skapa övningsdata.

- **Dator/Chromium:** Lägg till två spelare, dra åkbana i Animera, välj passare/mottagare, skjut och spela upp hela övningen. Verifiera bollkedja och att vägen inte förändras efter uppspelning.
- **Dator/Chromium:** Lägg till spelare, välj frihandsritning i ritmenyn, skapa en bana och ångra utan att förlora spelaren.
- **Mobil/Chromium och iPhone/WebKit-emulering:** Lägg till två spelare med touch, skapa passning och skott med touch och spela upp.

Nyttan är att testerna kontrollerar samspelet mellan UI, pekhantering, datamodell och uppspelning, som tidigare testats mest var för sig. En fysisk iPhone kan inte testas från GitHub Actions; den sista kontrollen kräver manuell provning på en riktig enhet. Inga ändringar i appens produktionkod i denna PR.

## Quality Gate v4 – visuell regression

Playwright jämför nu **faktiska skärmbilder** av den aktuella versionen med en referens hämtad från versionshistoriken. För en Pull Request används den aktuella basgrenen vid teststart; efter merge till main används föregående commit. Baslinjen skapas **inte** från ändrad applikationskod och uppdateras aldrig tyst så att en felaktig ändring passerar.

Skärmbilder jämförs för (1) desktop med två spelare och sidopaneler, (2) halva bandyplanens markeringar, (3) Fokuslägets verktygsfält på alla tre testplattformar och (4) objektmenyn på mobil Android/Chromium respektive iPhone/WebKit-emulering. Mobilmenyn kontrolleras också geometriskt mot skärmens vänstra och högra kant.

Toleransen är max 0,25 % av bildpixlarna, med viss kantutjämningstolerans. Större avvikelser stoppar GitHub-kontrollen och sparar tre felsökningsbilder: tidigare version, aktuell version och pixel-differens. Avsiktliga designändringar kräver kodgranskning och en medveten uppdatering av testerna, inte en automatisk acceptans. Jämförelsen görs i samma CI-webbläsare och behöver därför inga incheckade PNG-bilder.

Kör lokalt med npm test. Då jämförs med HEAD^; sätt miljövariabeln VISUAL_REFERENCE_SHA till en specifik äldre commit om det behövs. Testerna kan inte ersätta en kontroll på en fysisk iPhone.

## Quality Gate v5 – ritpaneler, passningspilar och samtidig animation

Den visuella regressionen omfattar också ritmenyn på dator, Mer → Val på Android och iPhone/WebKit, samt två passningar och ett skott med riktiga SVG-pilar och övningsflödesmarkeringar på samtliga testplattformar. Referensen är samma historiska version som i v4.

Dessutom testas två spelare med parallella åkbanor i samma övning. Uppspelning startas med appens Play-knapp; Playwrights virtuella klocka förs fram 650 ms, därefter pausas spelet. Testet verifierar att båda spelarna faktiskt förflyttats innan skärmbilden jämförs med föregående version.

Testerna gör inga användarsynliga ändringar och kan inte ersätta fysisk iPhone-verifiering.
