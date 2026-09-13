# "Wat we doen" hoger op de homepage

## Doel
De diensten-sectie ("Wat we doen" — `ServicesSection`, id `#diensten`) verschuiven zodat bezoekers direct ná de hero zien wat het agency aanbiedt, in plaats van pas na de probleem- en aanpaksecties.

## Huidige volgorde (src/routes/index.tsx)
1. Hero
2. TrustBar
3. ProblemSection (probleem in cijfers)
4. ReasonsSection (waarom het stuklopt / onze aanpak)
5. **ServicesSection (WAT WE DOEN)** ← staat nu te laag
6. MethodSection
7. ScanSection
8. BranchesSection
9. AgentsSection
10. ChatbotSection
11. PricingSection
12. GovernanceSection
13. ProofSection
14. PersonSection
15. FaqSection
16. ContactSection

## Nieuwe volgorde
1. Hero
2. TrustBar
3. **ServicesSection (WAT WE DOEN)** ← verplaatst
4. ProblemSection
5. ReasonsSection
6. MethodSection
7. … (rest ongewijzigd)

## Wijziging
Enkel `src/routes/index.tsx`: de `<ServicesSection />`-regel verplaatsen van na `<ReasonsSection />` naar ná `<TrustBar />`. Geen content- of stijlwijzigingen.

## Na controle
- Playwright-screenshot van de top van de pagina bevestigt dat "Wat we doen" direct onder de hero/vertrouwensbalk zichtbaar is.
