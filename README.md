# Het Sintelzegel

Tekst-RPG voor de mobiele browser, geïnspireerd op Elder Scrolls en Divinity: Original Sin. Eén zelfstandig HTML-bestand zonder dependencies of build-stap.

## Spelen

Open `index.html` in een browser, of zet GitHub Pages aan (Settings → Pages → branch `main`, map `/`).

Voortgang (tocht, Boekerij, relikwieën, ontgrendelde moeilijkheden) staat in `localStorage` van de browser en gaat niet mee naar andere apparaten.

## Inhoud

- 7 klassen en 7 spreukscholen (Krijgskunst, Schaduw, Elementen, Alchemie, Storm en Stoom, Necromantie, Oproepen)
- 5 regio's met eindbazen, 4 stadjes met herberg, smid, leermeesters, prikbord en verkenplekken
- Pantser-systeem en element-combinaties (nat + bliksem, olie + vuur, stoom, bevriezen, verbrijzelen)
- Missies met borg, reputatie en straffen bij mislukken of annuleren
- 6 moeilijkheden met 3 verhaallagen en 4 eindes

## Externe bronnen

Alleen Google Fonts (IM Fell English SC, Alegreya). Zonder internet valt het spel terug op systeemlettertypen.

## Balanssimulatie

`sim/` bevat een bot die de spellogica uit `index.html` in Node draait (zonder browser):

```sh
cd sim
python3 -c "import json; json.dump([{'cls':'magier','diff':1,'strat':'slim','build':'focus'}]*50, open('jobs.json','w'))"
node sim.js ../index.html jobs.json out.json
python3 analyse.py out.json
```

Strategieën: `simpel` (sterkste spreuk), `slim` (combinaties, onderbreken, verdedigen, oproepingen), `kruis` (slim + spreuken uit andere scholen). Builds: `focus` (alles in hoofdstat) of `bal` (1 op 3 punten in Vitaliteit).
