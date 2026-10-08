# AI-kehitystiimi: 4 agenttia (Architect, Coder, Tester, Manager)

Tämä paketti toteuttaa TikTok-videolla (@bengusberg) esitellyn ajatuksen: Claude Code
saa neljä erillistä "agenttia", joilla jokaisella on oma, tarkka toimenkuva. Yhdessä ne
muodostavat pienen kehitystiimin, joka suunnittelee, koodaa, testaa ja arvioi työnsä
itse — sinä vain annat tehtävän ja katsot lopputuloksen.

## Neljä roolia

**Architect — kysyy ensin, ei koodaa**
Ei aloita koodaamista ennen kuin tietää mitä tarkalleen rakennetaan. Kysyy tarkentavia
kysymyksiä (laajuus, kenelle, mikä on "valmis"), rajaa ison idean yhdeksi pieneksi
palaksi, ja kirjoittaa Coderille konkreettisen suunnitelman. Ei koskaan kirjoita
tuotantokoodia itse.

**Coder — toteuttaa suunnitelman**
Rakentaa täsmälleen sen minkä Architect suunnitteli — ei enempää eikä vähempää. Korjaa
suoraan ne asiat, jotka Tester tai Manager nostaa esiin, ja kertoo lyhyesti mitä muutti.

**Tester — ainoa tehtävä on rikkoa se mitä Coder rakensi**
Ei korjaa mitään itse. Etsii aktiivisesti reuna­tapauksia, virheenkäsittelyaukkoja,
rikkinäisiä tiloja ja asioita jotka näyttävät valmiilta mutta pettävät hiljaa. Ajaa
koodia oikeasti (ei vain lue sitä), ja raportoi konkreettiset, toistettavat löydökset.

**Manager — arvioi tiimin työn ja antaa "ship"-päätöksen**
Ei koodaa. Vertaa Architectin suunnitelmaa, Coderin toteutusta ja Testerin löydöksiä
toisiinsa ja alkuperäiseen pyyntöön. Väittelee tiimin kanssa kun jokin ei täsmää,
priorisoi 1–3 tärkeintä asiaa — ei loputonta nillityslistaa — ja antaa lopuksi selkeän
"valmis / vaatii vielä työtä" -päätöksen.

## Miten otat nämä käyttöön

1. Kopioi tämän paketin `.claude/agents/` -kansio sellaisenaan koodausprojektisi
   juureen (samaan paikkaan missä projektisi `.git`-kansiokin on). Claude Code löytää
   agentit automaattisesti sieltä.
2. Voit myös antaa saman ohjeistuksen suoraan promptina, jos et halua erillisiä
   tiedostoja — esim. Cowork/Claude Code -promptin ikkunaan:

   > Create 4 agents with these specific job descriptions: Architect (asks
   > clarifying questions first, writes a plan, never codes), Coder (implements
   > exactly the architect's plan), Tester (only job is trying to break what the
   > coder built, never fixes anything), Manager (reviews plan+code+test findings
   > together, argues with the team, flags the key issues, gives a ship/no-ship call).

3. Kun agentit ovat käytössä, Claude Code osaa kutsua niitä automaattisesti
   tehtävän mukaan, tai voit pyytää nimeltä: "käytä architect-agenttia suunnittelemaan
   tämä" jne.

## Työnkulku (videon mukainen)

1. **Anna tiimille yksi pieni tuote kerrallaan.** Ei ison luokan ideaa
   ("miljardin dollarin idea"), vaan jotain rajattua — esim. "waitlist-sivu",
   yksi lomake, yksi pieni ominaisuus.
2. **Review-kierros.** Kun tiimi on tehnyt version, katso tulos itse — kuin
   asiakas. Kokeile sitä oikeasti. Kerro mikä on väärin tai puuttuu; tiimi
   korjaa. Toista kunnes lopputulos osuu oikeaan.
3. **Manager antaa ship-päätöksen** kun suunnitelma, toteutus ja testit ovat
   linjassa keskenään ja alkuperäisen pyynnön kanssa. Silloin tiimi "shippaa".

Huom: videolla puhuttiin neljästä agentista (Architect, Coder, Tester, Manager) — ei
viidestä. Tämä paketti noudattaa videon jakoa. Jos haluat myöhemmin viidennen roolin
(esim. Designer, DevOps tai Security-reviewer), sen voi lisätä samaan `.claude/agents/`
-kansioon samalla tiedostomallilla.
