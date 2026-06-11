// Color Palette — opens an interactive palette generator in a frameless modal.
//
// Frameless means the host renders no title bar or buttons: the view owns the
// entire surface and closes itself (or via backdrop click). Great for views
// that bring their own chrome and theming.
// accentColor is a per-user preference (userSetupAssistant). The view resolves
// the { label, value } select option (or a plain string) and defaults to indigo.
const seed = this.userConfig?.accentColor ?? "#4f46e5";

const result = await this.showViewInModal("colorpalette", {
  args: { seed },
  options: {
    frameless: true,
    size: "medium",
  },
});

this.console.log("Color Palette modal closed:", JSON.stringify(result));
