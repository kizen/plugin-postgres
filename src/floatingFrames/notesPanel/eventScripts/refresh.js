// Notes Panel renderer (event-script copy). Re-runs when the Quick Note toolbar
// item calls runFrameScript("notes_panel", "refresh", { notesJson }) after a
// save, so the open frame updates live.
//
// When a notes object is configured it re-queries the object (the toolbar writes
// the record before triggering this, so the new note is present); otherwise it
// renders the session list passed in. This is intentionally identical to
// script.js — the entry can't call its own event script, so both hold the same
// render. Keep them in sync.

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Optional notes object (plugin setup). custom_object → { objectId }, field → { fieldId }.
const config = this.config ?? {};
const objectId = config.notesObjectId?.objectId;
const titleFieldId = config.noteTitleField?.fieldId;
const bodyFieldId = config.noteBodyField?.fieldId;
const urgentFieldId = config.noteUrgentField?.fieldId;

// Unwrap a record's field value (Kizen sometimes nests it as { value }).
const fieldScalar = (record, fieldId) => {
  if (!record || !fieldId) return null;
  let v = record.fields?.[fieldId];
  for (let i = 0; i < 2 && v && typeof v === "object" && "value" in v; i++)
    v = v.value;
  return v ?? null;
};

// Notes captured this session, or the list passed in on a live refresh.
const sessionNotes = () => {
  if (typeof this.args?.notesJson === "string") {
    try {
      return JSON.parse(this.args.notesJson);
    } catch (e) {
      return [];
    }
  }
  return this.sessionData?.quickNotes ?? [];
};

let notes;
if (objectId) {
  // Restore persisted notes from the mapped object. Best-effort: fall back to
  // session notes on error so the frame still renders.
  const [data, error] = await this.postWithErrors(
    `/records/${objectId}/search`,
    {},
  );
  if (error) {
    this.console.log(
      "notesPanel: failed to load notes from object:",
      JSON.stringify(error),
    );
    notes = sessionNotes();
  } else {
    notes = (data?.results ?? []).map((r) => ({
      title: fieldScalar(r, titleFieldId) ?? r.name ?? "",
      body: bodyFieldId ? (fieldScalar(r, bodyFieldId) ?? "") : "",
      urgent: urgentFieldId ? Boolean(fieldScalar(r, urgentFieldId)) : false,
    }));
  }
} else {
  notes = sessionNotes();
}
notes = (Array.isArray(notes) ? notes : []).filter((n) => n && n.title);

const list =
  notes.length === 0
    ? `<div class="np-empty">
         <p>No notes yet.</p>
         <p class="np-empty-hint">Use the <strong>Quick Note</strong> toolbar button to add one.</p>
       </div>`
    : `<ul class="np-list">
         ${notes
           .map(
             (n) => `
           <li class="np-item${n.urgent ? " is-urgent" : ""}">
             <span class="np-item-title">${escapeHtml(n.title)}</span>
             ${n.body ? `<span class="np-item-body">${escapeHtml(n.body)}</span>` : ""}
           </li>`,
           )
           .join("")}
       </ul>`;

this.outputUI(`
  <div class="np-root">
    <div class="np-scroll">${list}</div>
    <div class="np-footer">
      <button class="np-btn" type="button" data-script="collapse">Collapse</button>
    </div>
  </div>
`);
