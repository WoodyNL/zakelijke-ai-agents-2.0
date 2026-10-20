import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ } from "@/content/site";
import { Reveal } from "@/hooks/use-reveal";
import { Container, H2, Section } from "./ui";

export function FaqSection() {
  return (
    <Section id="faq" labelledBy="faq-titel">
      <Container>
        <Reveal>
          <div className="mx-auto max-w-3xl">
            <H2 id="faq-titel">{FAQ.h2}</H2>
            <Accordion type="single" collapsible className="mt-6 w-full">
              {FAQ.items.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`item-${i}`}
                  className="faq-row group border-b border-white/10 px-4 transition-colors duration-200 hover:border-violet/45 hover:bg-white/[0.06] data-[state=open]:bg-white/[0.06]"
                >
                  <AccordionTrigger className="text-left font-display text-[15px] font-semibold text-brand transition-colors hover:no-underline group-hover:text-violet [&>svg]:text-ink/72 [&>svg]:transition-colors group-hover:[&>svg]:text-violet">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[15px]/[1.8] text-ink/88">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
