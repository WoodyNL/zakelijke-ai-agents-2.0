import * as React from "react";
import { Container, Eyebrow, H2, Lead, Section } from "./ui";

const DEPLOYMENT_ID = "deployment-76877bbe-77c7-483a-966c-e31250ff4c45";
const SCRIPT_SRC = "https://studio.pickaxe.co/api/embed/bundle.js";
const SCOPE = ".chatbot-host";

/**
 * De Pickaxe-embed injecteert zijn eigen thema-CSS in document.head met zeer
 * brede selectors en !important — onder meer `header`, `button`, `a` en
 * `[class*="card"]`. Daardoor overschreef het de header, alle knoppen en alle
 * links van de site. We laten de styling intact, maar beperken elke regel tot
 * de chatbot-container zodat hij niet meer buiten het widget lekt.
 */
function scopeRulesToWidget(group: CSSStyleSheet | CSSGroupingRule) {
  let rules: CSSRuleList;
  try {
    rules = group.cssRules;
  } catch {
    return;
  }
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (rule.selectorText.includes(SCOPE)) continue;
      rule.selectorText = rule.selectorText
        .split(",")
        .map((part) => `${SCOPE} ${part.trim()}`)
        .join(", ");
    } else if ("cssRules" in rule) {
      scopeRulesToWidget(rule as CSSGroupingRule);
    }
  }
}

function containsVendorTheme(style: HTMLStyleElement) {
  const css = style.textContent ?? "";
  return css.includes('[class*="accent"]') || css.includes(".chat-header");
}

function useScopedVendorStyles() {
  React.useEffect(() => {
    const scopeAll = () => {
      for (const style of document.querySelectorAll("style")) {
        if (style.dataset["widgetScoped"] === "true") continue;
        if (!containsVendorTheme(style)) continue;
        if (style.sheet) scopeRulesToWidget(style.sheet);
        style.dataset["widgetScoped"] = "true";
      }
    };

    scopeAll();
    const observer = new MutationObserver(scopeAll);
    observer.observe(document.head, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
}

/**
 * Client-only mount: the embed replaces its own container DOM, which breaks
 * SSR hydration. We therefore render nothing on the server and inject the
 * vendor script once the page is interactive.
 */
function ChatbotEmbed() {
  const [mounted, setMounted] = React.useState(false);
  useScopedVendorStyles();

  React.useEffect(() => {
    setMounted(true);
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[420px] w-full animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />
    );
  }

  return <div id={DEPLOYMENT_ID} suppressHydrationWarning />;
}

export function ChatbotSection() {
  return (
    <Section id="chat" labelledBy="chat-titel" tinted>
      <Container>
        <div className="flex flex-col items-center text-center">
          <Eyebrow>Praat met onze agent</Eyebrow>
          <H2 id="chat-titel">Probeer het zelf — stel een vraag</H2>
          <Lead>
            Dit is precies zo&apos;n agent als wij bouwen, live op onze eigen site. Vraag hem naar
            de AI-scan, prijzen, doorlooptijd of wat een agent in jouw branche kan doen.
          </Lead>
        </div>

        <div className="chatbot-card card-glass-lg mt-8 overflow-hidden rounded-3xl p-4 sm:p-6">
          <div className="chatbot-host mx-auto w-full max-w-3xl">
            <ChatbotEmbed />
          </div>
        </div>
      </Container>
    </Section>
  );
}
