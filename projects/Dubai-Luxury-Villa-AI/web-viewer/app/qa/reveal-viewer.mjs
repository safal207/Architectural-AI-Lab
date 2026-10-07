/** Reveal a disclosure or hidden descendant through the same summary controls a visitor uses. */
export async function revealDetails(page, targetSelector) {
  const target = page.locator(targetSelector).first();
  await target.waitFor({ state: 'attached' });
  const disclosures = target.locator('xpath=ancestor-or-self::details');
  const count = await disclosures.count();
  for (let index = 0; index < count; index += 1) {
    const disclosure = disclosures.nth(index);
    if (!await disclosure.evaluate((element) => element.open)) {
      await disclosure.locator(':scope > summary').click();
      if (!await disclosure.evaluate((element) => element.open)) {
        throw new Error(`Disclosure did not open for ${targetSelector}`);
      }
    }
  }
  await target.waitFor({ state: 'visible' });
}

/** Bring the studio into view so its deferred 3D scene is requested by the page. */
export async function revealViewer(page) {
  await revealDetails(page, '#viewer .viewer-panel');
  await page.locator('#viewer .viewer-panel').scrollIntoViewIfNeeded();
}
