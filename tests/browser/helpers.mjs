import {expect} from '@playwright/test';
export function captureRuntimeErrors(page) {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  return errors;
}
export async function startMission(page) {
  // External fonts are decorative and must not make offline verification nondeterministic.
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort());
  await page.goto('/?quick=1&seed=23&quality=performance');
  await expect(page.locator('#phase')).toHaveText('PLANNING',{timeout:60000});
  if(await page.locator('#briefingPanel').isVisible())await page.locator('#briefingClose').click();
  await expect(page.locator('#breach3dCanvas')).toBeVisible();
  await expect(page.locator('#siteIdentity')).toHaveAttribute('data-site-seed','23');
}
export async function openMissionSettings(page) {
  if(await page.locator('#siteSettings').isVisible())return;
  if(!await page.locator('#siteSettingsToggle').isVisible())await page.locator('#moreOrders').click();
  await page.locator('#siteSettingsToggle').click();
  await expect(page.locator('#siteSettings')).toBeVisible();
}
export async function openStudio(page) {
  if(!await page.locator('#operationsBoard').isVisible())await page.locator('#operationsBoardToggle').click();
  const rook=page.locator('[data-squad-card="rook"]');
  if(!await rook.evaluate(e=>e.open))await rook.locator(':scope > summary').click();
  await rook.locator('.fw-squad-actions button').filter({hasText:'APPEARANCE'}).click();
  const studio=page.frameLocator('#operatorStudioOverlay iframe');
  await expect(studio.locator('#studioCanvas')).toHaveAttribute('data-ready','true',{timeout:60000});
  return studio;
}
