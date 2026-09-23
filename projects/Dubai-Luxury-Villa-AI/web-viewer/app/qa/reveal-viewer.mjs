/** Bring the studio into view so its deferred 3D scene is requested by the page. */
export async function revealViewer(page) {
  await page.locator('#viewer .viewer-panel').scrollIntoViewIfNeeded();
}
