// Feedback — opens the feedback form in a frameless modal and logs the result.
//
// The view id is the lowercased view directory name (src/views/feedbackForm).
// showViewInModal resolves to { values, canceled }: `values` is whatever the
// view passed to closeModal(...) on submit, and `canceled` is its second arg.
const result = await this.showViewInModal("feedbackform", {
  options: { frameless: true, size: "medium" },
});

if (!result || result.canceled) {
  this.console.log("Feedback cancelled.");
  return;
}

this.console.log("Received feedback:", JSON.stringify(result.values?.feedback));
