import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, Check as CheckIcon, RefreshCw } from "lucide-react";
import * as React from "react";
import { SITE } from "@/content/site";
import { vraagAssistent } from "@/lib/assistant.functions";

type Bericht = { role: "user" | "assistant"; content: string };

const BEGROETING =
  "Hoi, ik ben de assistent van Zakelijke AI Agents. Vraag me gerust naar de AI-scan, wat iets kost, hoe lang iets duurt, of wat AI in jouw branche zou kunnen doen.";

const VOORBEELDEN = [
  "Wat kost een AI-scan?",
  "Hoe lang duurt een traject?",
  "Wij verzuipen in offerteaanvragen. Kunnen jullie daar iets mee?",
  "Waarom zou ik jullie nemen en niet zelf iets bouwen?",
] as const;

/** Maximale lengte per bericht; de server weigert alles daarboven. */
const MAX_LENGTE = 1500;

export function AssistantChat({
  agent = "website-assistent",
  welkom = BEGROETING,
  volledigeHoogte = false,
}: {
  agent?: string;
  /** Overschrijft de begroeting; komt bij een embed uit de agentinstellingen. */
  welkom?: string;
  /** In een embed vult de chat het hele venster in plaats van een vaste hoogte. */
  volledigeHoogte?: boolean;
}) {
  const vraag = useServerFn(vraagAssistent);
  const [berichten, setBerichten] = React.useState<Bericht[]>([]);
  const [invoer, setInvoer] = React.useState("");
  const [bezig, setBezig] = React.useState(false);
  const [leadVastgelegd, setLeadVastgelegd] = React.useState(false);

  const scrollDoel = React.useRef<HTMLDivElement>(null);
  const invoerveld = React.useRef<HTMLTextAreaElement>(null);

  // Alleen binnen het gespreksvenster scrollen, nooit de pagina meeslepen:
  // een bezoeker die verderop leest wil niet teruggetrokken worden.
  React.useEffect(() => {
    if (berichten.length === 0) return;
    scrollDoel.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [berichten, bezig]);

  async function verstuur(tekst: string) {
    const schoon = tekst.trim();
    if (!schoon || bezig) return;

    const nieuw: Bericht[] = [...berichten, { role: "user", content: schoon }];
    setBerichten(nieuw);
    setInvoer("");
    setBezig(true);

    try {
      const antwoord = await vraag({ data: { messages: nieuw, agent } });
      setBerichten([...nieuw, { role: "assistant", content: antwoord.tekst }]);
      if (antwoord.leadVastgelegd) setLeadVastgelegd(true);
    } catch (err) {
      console.error("assistent: aanroep mislukt", err);
      setBerichten([
        ...nieuw,
        {
          role: "assistant",
          content: `Sorry, er ging iets mis aan mijn kant. Probeer het zo nog eens, of mail je vraag naar ${SITE.email}.`,
        },
      ]);
    } finally {
      setBezig(false);
      invoerveld.current?.focus();
    }
  }

  function bijToets(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter verstuurt, Shift+Enter maakt een nieuwe regel. Op een telefoon
    // verstuurt Enter niet, daar is de knop bedoeld.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void verstuur(invoer);
    }
  }

  const leeg = berichten.length === 0;

  return (
    <div
      className={`card-glass-lg flex flex-col overflow-hidden rounded-3xl ${
        volledigeHoogte ? "h-[calc(100vh-1.5rem)]" : "h-[540px] sm:h-[600px]"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3.5">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-mint" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[13.5px] font-semibold text-brand">
            Assistent van {SITE.name}
          </p>
          <p className="text-[11.5px] text-ink/55">Antwoordt direct, elke dag</p>
        </div>
        {berichten.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setBerichten([]);
              setLeadVastgelegd(false);
              invoerveld.current?.focus();
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[11.5px] font-medium text-ink/65 transition-colors hover:border-violet/40 hover:bg-white/5 hover:text-ink"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Opnieuw
          </button>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 py-5"
        role="log"
        aria-live="polite"
        aria-label="Gesprek met de assistent"
      >
        <Bubbel rol="assistant">{welkom}</Bubbel>

        {berichten.map((b, i) => (
          <Bubbel key={i} rol={b.role}>
            {b.content}
          </Bubbel>
        ))}

        {bezig && <Typt />}

        {leadVastgelegd && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-mint/25 bg-mint/10 px-4 py-3">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
            <p className="text-[12.5px]/[1.6] text-ink/80">
              Je gegevens staan genoteerd. Wouter neemt binnen één werkdag contact op.
            </p>
          </div>
        )}

        <div ref={scrollDoel} />
      </div>

      {leeg && !bezig && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {VOORBEELDEN.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => void verstuur(v)}
              className="rounded-full border border-white/12 bg-white/5 px-3.5 py-2 text-left text-[12px]/[1.4] text-ink/70 transition-all duration-200 hover:border-violet/40 hover:bg-violet/10 hover:text-ink"
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verstuur(invoer);
        }}
        className="border-t border-white/10 px-4 py-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2 transition-colors focus-within:border-violet/50 focus-within:bg-white/[0.06]">
          <label htmlFor="assistent-invoer" className="sr-only">
            Stel je vraag aan de assistent
          </label>
          <textarea
            id="assistent-invoer"
            ref={invoerveld}
            rows={1}
            value={invoer}
            maxLength={MAX_LENGTE}
            onChange={(e) => {
              setInvoer(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={bijToets}
            placeholder="Stel je vraag…"
            disabled={bezig}
            className="max-h-[120px] flex-1 resize-none bg-transparent py-1.5 text-[13.5px]/[1.6] text-ink outline-none placeholder:text-ink/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={bezig || invoer.trim().length === 0}
            aria-label="Verstuur je vraag"
            className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet text-white transition-all duration-200 hover:bg-violet/85 disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10.5px] text-ink/40">
          Dit is een AI-assistent. Voor zekerheid over prijzen en afspraken gaat er altijd een mens
          overheen.
        </p>
      </form>
    </div>
  );
}

function Bubbel({ rol, children }: { rol: "user" | "assistant"; children: React.ReactNode }) {
  const vanBezoeker = rol === "user";
  return (
    <div className={`mb-3.5 flex ${vanBezoeker ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px]/[1.7] whitespace-pre-wrap ${
          vanBezoeker
            ? "rounded-br-md bg-violet text-white"
            : "rounded-bl-md border border-white/10 bg-white/[0.05] text-ink/90"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Typt() {
  return (
    <div className="mb-3.5 flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.05] px-4 py-3.5">
        <span className="sr-only">De assistent typt een antwoord</span>
        {[0, 150, 300].map((vertraging) => (
          <span
            key={vertraging}
            aria-hidden="true"
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40"
            style={{ animationDelay: `${vertraging}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}
