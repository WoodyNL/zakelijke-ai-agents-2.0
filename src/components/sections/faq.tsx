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
                  className="border-b border-white/10"
                >
                  <AccordionTrigger className="text-left font-display text-[15px] font-semibold text-brand hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[13px]/[1.75] text-ink/65">
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
