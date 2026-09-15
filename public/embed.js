/**
 * Embed-loader voor de AI-assistent van Zakelijke AI Agents.
 *
 * Een klant plakt één regel op zijn site:
 *   <script src="https://zakelijkeaiagents.nl/embed.js" data-agent="slug"></script>
 *
 * Dit script maakt een iframe. Bewust geen elementen of stijlen in de pagina van
 * de klant: een embed die CSS in de gastpagina injecteert kan de hele site
 * overschrijven, en dat is precies wat ons zelf is overkomen met een andere
 * aanbieder. Alles wat wij tekenen blijft binnen het iframe.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;

  var agent = script.getAttribute("data-agent");
  if (!agent || !/^[a-z0-9-]{1,64}$/.test(agent)) {
    console.error("[assistent] data-agent ontbreekt of is ongeldig");
    return;
  }

  var basis = new URL(script.src).origin;
  var positie = script.getAttribute("data-positie") || "rechtsonder";
  var knoplabel = script.getAttribute("data-label") || "Stel een vraag";

  var frame = document.createElement("iframe");
  frame.src = basis + "/embed/" + encodeURIComponent(agent);
  frame.title = "Chat met de assistent";
  frame.setAttribute("loading", "lazy");
  // Alleen wat de chat nodig heeft: eigen scripts draaien en formulieren
  // versturen. Geen toegang tot de pagina van de klant.
  frame.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin");
  frame.style.cssText = [
    "position:fixed",
    positie === "linksonder" ? "left:20px" : "right:20px",
    "bottom:88px",
    "width:min(400px, calc(100vw - 40px))",
    "height:min(620px, calc(100vh - 140px))",
    "border:0",
    "border-radius:24px",
    "box-shadow:0 24px 60px -20px rgba(0,0,0,.45)",
    "z-index:2147483000",
    "display:none",
    "color-scheme:dark",
  ].join(";");

  var knop = document.createElement("button");
  knop.type = "button";
  knop.textContent = knoplabel;
  knop.setAttribute("aria-expanded", "false");
  knop.style.cssText = [
    "position:fixed",
    positie === "linksonder" ? "left:20px" : "right:20px",
    "bottom:20px",
    "padding:14px 22px",
    "border:0",
    "border-radius:999px",
    "background:#6544E0",
    "color:#fff",
    "font:600 14px/1 ui-sans-serif, system-ui, sans-serif",
    "cursor:pointer",
    "box-shadow:0 12px 30px -10px rgba(101,68,224,.8)",
    "z-index:2147483001",
  ].join(";");

  var open = false;
  function wissel() {
    open = !open;
    frame.style.display = open ? "block" : "none";
    knop.setAttribute("aria-expanded", String(open));
    knop.textContent = open ? "Sluiten" : knoplabel;
  }

  knop.addEventListener("click", wissel);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && open) wissel();
  });

  document.body.appendChild(frame);
  document.body.appendChild(knop);
})();
