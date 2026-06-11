// Feedback submitted — gather the form values and hand them back to whoever
// opened the modal via closeModal(result, cancelled=false).
const { formData } = this.args;

const feedback = {
  rating: Number(formData?.rating?.[0] ?? 0),
  topic: formData?.topic?.[0] ?? "general",
  message: formData?.message?.[0] ?? "",
  followUp: (formData?.followUp?.[0] ?? "") === "yes",
  submittedAt: new Date().toISOString(),
};

this.console.log("Feedback submitted:", JSON.stringify(feedback));

this.closeModal({ feedback }, false);
