// Fixed scenes for screenshots: ?shot=cover renders the cover alone, filling the window;
// ?shot=editor shows the whole studio with a sample scene loaded. Either way the scene is
// built from the query (layout, grade, style, size, photos, caption, subtitle) so a capture
// is deterministic, and window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, applyScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await applyScene(query);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
