// Color Palette view — frameless modal that renders a palette derived from a
// seed color (passed by the opening toolbar item via args.seed).
//
// Everything renders in this one pass. The "Done" button uses data-script,
// which routes to eventScripts/close.js on click — the supported way to react
// to user interaction from a view.

// The seed (accent color) may arrive as a plain string or as a setup-assistant
// `select` value — a { label, value } option object (or an array of them for
// multi-select). Resolve any of these to a hex string.
const resolveColor = (raw) => {
  let v = Array.isArray(raw) ? raw[0] : raw;
  if (v && typeof v === "object") v = v.value;
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

const seed = resolveColor(this.args?.seed) ?? "#4f46e5";

// Parse "#rrggbb" (or "rgb") into {r,g,b}, falling back to indigo if malformed.
const parseHex = (hex) => {
  let h = String(hex).replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return { r: 79, g: 70, b: 229 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const toHex = ({ r, g, b }) =>
  "#" +
  [r, g, b]
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

// Mix a color toward white (amount > 0) or black (amount < 0).
const mix = ({ r, g, b }, amount) => {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return {
    r: r + (target - r) * t,
    g: g + (target - g) * t,
    b: b + (target - b) * t,
  };
};

const base = parseHex(seed);

// A 5-stop scale from light tint to dark shade of the seed.
const stops = [
  { color: mix(base, 0.6), name: "Lightest" },
  { color: mix(base, 0.3), name: "Light" },
  { color: base, name: "Base" },
  { color: mix(base, -0.25), name: "Dark" },
  { color: mix(base, -0.5), name: "Darkest" },
];

// Pick readable text color per swatch via perceived luminance.
const textOn = ({ r, g, b }) =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#0f172a" : "#ffffff";

const swatches = stops
  .map((s) => {
    const hex = toHex(s.color);
    return `
      <div class="pal-swatch" style="background:${hex};color:${textOn(s.color)}">
        <span class="pal-swatch-name">${s.name}</span>
        <span class="pal-swatch-hex">${hex}</span>
      </div>`;
  })
  .join("");

this.outputUI(`
  <div class="pal-root">
    <div class="pal-header">
      <h2 class="pal-title">Color Palette</h2>
      <p class="pal-subtitle">A scale generated from <code>${toHex(base)}</code>.</p>
    </div>
    <div class="pal-swatches">${swatches}</div>
    <div class="pal-footer">
      <button class="pal-btn" type="button" data-script="close">Done</button>
    </div>
  </div>
`);
