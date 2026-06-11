// Feedback form view — a frameless modal that owns all of its own chrome.
//
// The <form data-script="submit"> routes submits to eventScripts/submit.js, and
// the Cancel button routes to eventScripts/cancel.js. Each named field's value
// arrives there as this.args.formData[name].
this.outputUI(`
<form class="fb-layout" data-script="submit">
  <div class="fb-header">
    <h2 class="fb-title">Share your feedback</h2>
    <p class="fb-subtitle">Tell us how this plugin is working for you.</p>
  </div>

  <div class="fb-body">
    <div class="fb-field">
      <label class="fb-label" for="fb-rating">How would you rate it?</label>
      <select class="fb-input" id="fb-rating" name="rating" required>
        <option value="" disabled selected>Pick a rating…</option>
        <option value="5">★★★★★ — Love it</option>
        <option value="4">★★★★ — Good</option>
        <option value="3">★★★ — Okay</option>
        <option value="2">★★ — Needs work</option>
        <option value="1">★ — Not for me</option>
      </select>
    </div>

    <div class="fb-field">
      <label class="fb-label" for="fb-topic">Topic</label>
      <select class="fb-input" id="fb-topic" name="topic">
        <option value="general" selected>General</option>
        <option value="bug">Bug report</option>
        <option value="feature">Feature request</option>
        <option value="ux">Design / UX</option>
      </select>
    </div>

    <div class="fb-field">
      <label class="fb-label" for="fb-message">What's on your mind?</label>
      <textarea class="fb-input fb-textarea" id="fb-message" name="message" placeholder="Type your feedback…" required></textarea>
    </div>

    <label class="fb-check">
      <input type="checkbox" name="followUp" value="yes" />
      <span>It's okay to follow up with me about this.</span>
    </label>
  </div>

  <div class="fb-footer">
    <button class="fb-btn fb-btn--cancel" type="button" data-script="cancel">Cancel</button>
    <button class="fb-btn fb-btn--submit" type="submit">Send Feedback</button>
  </div>
</form>
`);
