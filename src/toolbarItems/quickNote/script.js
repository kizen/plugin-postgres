// Quick Note — captures a short note using a dynamic prompt.
//
// dynamicPrompt resolves to { canceled, values }, where `values` is keyed by
// each field's `key` and cleaned by field type: text → string, boolean → bool,
// and select → a { label, value } option object (NOT a bare string).
//
// Honors the `enableQuickNote` setup-assistant toggle.
if (this.config?.enableQuickNote === false) {
  this.showToast("Quick Note is turned off in this plugin's setup.", {
    variant: "alert",
  });
  this.console.log("Quick Note is disabled via config; aborting.");
  return;
}

const result = await this.dynamicPrompt({
  title: "Quick Note",
  confirmButton: { label: "Save Note", variant: "standard" },
  cancelButton: { label: "Cancel", variant: "text" },
  size: "medium",
  content: [
    {
      type: "description",
      content: "Jot down a quick note. It'll be saved for this session.",
    },
    {
      type: "text",
      label: "Title",
      key: "title",
      required: true,
      placeholder: "e.g. Follow up with Acme",
    },
    {
      type: "select",
      label: "Category",
      key: "category",
      required: true,
      placeholder: "Choose a category…",
      options: [
        { label: "Task", value: "task" },
        { label: "Idea", value: "idea" },
        { label: "Reminder", value: "reminder" },
      ],
    },
    {
      type: "text",
      label: "Details",
      key: "body",
      placeholder: "Optional details…",
    },
    {
      type: "boolean",
      label: "Mark as urgent",
      key: "urgent",
      default: false,
      tooltip: "Urgent notes are highlighted in the notes list.",
    },
  ],
});

if (!result || result.canceled) {
  this.console.log("Quick Note cancelled.");
  return;
}

// Flatten the cleaned values into a plain note. A select value is a
// { label, value } object — keep the human-readable label for display.
const values = result.values ?? {};
const note = {
  title: values.title ?? "",
  category: values.category?.label ?? "",
  body: values.body ?? "",
  urgent: Boolean(values.urgent),
  createdAt: new Date().toISOString(),
};

if (!note.title) {
  this.console.log("Quick Note had no title; skipping.");
  return;
}

const existing = this.sessionData?.quickNotes ?? [];
const quickNotes = [note, ...existing];
this.setSessionData({ quickNotes });

// Optionally persist to a Kizen object, if one was mapped in plugin setup.
// custom_object cleans to { objectId }, field to { fieldId }. We do this BEFORE
// refreshing the frame so the frame's re-query sees the new record.
const objectId = this.config?.notesObjectId?.objectId;
const titleFieldId = this.config?.noteTitleField?.fieldId;
const bodyFieldId = this.config?.noteBodyField?.fieldId;
const categoryFieldId = this.config?.noteCategoryField?.fieldId;
const urgentFieldId = this.config?.noteUrgentField?.fieldId;

if (objectId) {
  // The record's primary field is "name"; set it to the title so records are
  // identifiable. If a dedicated title field is mapped, write it too (by id).
  const fields = [{ name: "name", value: note.title }];
  if (titleFieldId) fields.push({ id: titleFieldId, value: note.title });
  if (bodyFieldId && note.body)
    fields.push({ id: bodyFieldId, value: note.body });
  if (categoryFieldId && note.category)
    fields.push({ id: categoryFieldId, value: note.category });
  if (urgentFieldId) fields.push({ id: urgentFieldId, value: note.urgent });

  const [, error] = await this.postWithErrors(`/records/${objectId}/add`, {
    fields,
  });

  if (error) {
    this.console.log("Failed to save note to object:", JSON.stringify(error));
    this.showToast(
      "Note saved for this session, but couldn't be stored to your notes object.",
      {
        variant: "alert",
      },
    );
  } else {
    this.showToast("Note saved.", { variant: "success" });
  }
}

// Live-refresh the Notes Panel floating frame if it's open. The frame re-queries
// the object when one is configured (the write above has completed by now), and
// otherwise renders this session list passed via args. No-op if not mounted.
this.communicate.runFrameScript("notes_panel", "refresh", {
  notesJson: JSON.stringify(quickNotes),
});

this.console.log("Saved quick note:", JSON.stringify(note));
