// Notes — a routable dashboard page listing quick notes. If a notes object is
// mapped in plugin setup, it lists the persisted records; otherwise it lists the
// notes captured this session (via the Quick Note toolbar item).
//
// Unlike a modal opened from a toolbar item, a routable page is navigated to
// directly, so there's no opener to hand it config — it reads this.config and
// this.userConfig itself. The greeting comes from the signed-in user
// (this.currentUser); userConfig carries the accent preference; the banner
// defaults to shown.

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const config = this.config ?? {};
const userConfig = this.userConfig ?? {};

// The per-user accent preference is a `select` value — a { label, value } option
// object (or an array for multi-select). Resolve it (or a plain string) to hex.
const resolveColor = (raw) => {
  let v = Array.isArray(raw) ? raw[0] : raw;
  if (v && typeof v === "object") v = v.value;
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

const accent = resolveColor(userConfig.accentColor) ?? "#4f46e5";

// Greet the signed-in user by their first name (fall back to full name).
const profile = this.currentUser?.profile ?? {};
const displayName = escapeHtml(
  profile.first_name || profile.full_name || "there",
);
const showBanner = config.showWelcomeBanner !== false;

// Notes come from a mapped Kizen object if one is configured (persistent across
// sessions), otherwise from session state. custom_object cleans to { objectId },
// field to { fieldId }.
const objectId = config.notesObjectId?.objectId;
const titleFieldId = config.noteTitleField?.fieldId;
const bodyFieldId = config.noteBodyField?.fieldId;
const categoryFieldId = config.noteCategoryField?.fieldId;
const urgentFieldId = config.noteUrgentField?.fieldId;

// Unwrap a record's field value (Kizen sometimes nests it as { value }).
const fieldScalar = (record, fieldId) => {
  if (!record || !fieldId) return null;
  let v = record.fields?.[fieldId];
  for (let i = 0; i < 2 && v && typeof v === "object" && "value" in v; i++)
    v = v.value;
  return v ?? null;
};

let notes;
if (objectId) {
  // Load persisted notes from the mapped object. Best-effort: fall back to
  // session notes on any error so the page still renders.
  const [data, error] = await this.postWithErrors(
    `/records/${objectId}/search`,
    {},
  );
  if (error) {
    this.console.log(
      "Failed to load notes from object:",
      JSON.stringify(error),
    );
    notes = this.sessionData?.quickNotes ?? [];
  } else {
    notes = (data?.results ?? []).map((r) => ({
      title: fieldScalar(r, titleFieldId) ?? r.name ?? "",
      body: bodyFieldId ? (fieldScalar(r, bodyFieldId) ?? "") : "",
      category: categoryFieldId ? (fieldScalar(r, categoryFieldId) ?? "") : "",
      urgent: urgentFieldId ? Boolean(fieldScalar(r, urgentFieldId)) : false,
    }));
  }
} else {
  notes = this.sessionData?.quickNotes ?? [];
}

// Defensively drop any malformed/titleless entries so a stray note can't render
// as an empty ghost card.
notes = (Array.isArray(notes) ? notes : []).filter((n) => n && n.title);
const count = notes.length;

const notesMarkup =
  count === 0
    ? `<div class="dash-empty">
         <p>No quick notes yet.</p>
         <p class="dash-empty-hint">Click <strong>Quick Note</strong> in the toolbar to add one — it'll show up here.</p>
       </div>`
    : `<ul class="dash-notes">
         ${notes
           .map(
             (n) => `
           <li class="dash-note${n.urgent ? " is-urgent" : ""}">
             <div class="dash-note-head">
               <span class="dash-note-title">${escapeHtml(n.title)}</span>
               <span class="dash-note-cat">${escapeHtml(n.category ?? "")}</span>
             </div>
             ${n.body ? `<p class="dash-note-body">${escapeHtml(n.body)}</p>` : ""}
           </li>`,
           )
           .join("")}
       </ul>`;

this.outputUI(`
  <div class="dash-root" style="--accent:${accent}">
    ${
      showBanner
        ? `<header class="dash-banner">
            <h1 class="dash-banner-title">Welcome back, ${displayName} 👋</h1>
            <p class="dash-banner-sub">Your quick notes, all in one place.</p>
          </header>`
        : ""
    }

    <section class="dash-section">
      <h2 class="dash-section-title">Quick notes${count ? ` · ${count}` : ""}</h2>
      ${notesMarkup}
    </section>
  </div>
`);
