import { Reveal } from "@/hooks/use-reveal";
import { AssistantChat } from "./assistant-chat";
import { Container, Eyebrow, H2, Lead, Section } from "./ui";

/**
 * De demo-sectie op de landingspagina. Dit is tegelijk het beste
 * verkoopargument: wat hier draait is precies wat wij voor klanten bouwen,
 * inclusief de kennisbank erachter en het vastleggen van contactgegevens.
 *
 * Voorheen stond hier een Pickaxe-embed. Die injecteerde zijn eigen thema-CSS
 * met !important in document.head, over selectors als `header`, `button` en
 * `a`, waardoor hij de styling van de hele site overschreef. Nu draait alles in
 * eigen huis: geen vreemde CSS, geen vreemd script, en de kennis komt uit
 * dezelfde Supabase-tabel die je in het beheerpaneel onderhoudt.
 */
export function ChatbotSection() {
  return (
    <Section id="chat" labelledBy="chat-titel" tinted>
      <Container>
        <Reveal>
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <Eyebrow>Praat met onze agent</Eyebrow>
            <H2 id="chat-titel">Probeer het zelf, stel een vraag</H2>
            <Lead>
              Deze assistent is er precies zo een als wij bouwen, live op onze eigen site. Hij kent
              onze tarieven, ons proces en onze werkwijze, en hij zegt eerlijk wanneer hij iets niet
              weet. Vraag hem naar de AI-scan, de doorlooptijd, of wat een agent in jouw branche zou
              doen.
            </Lead>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mx-auto mt-8 w-full max-w-3xl">
            <AssistantChat />
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
