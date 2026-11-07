import {test,expect} from '@playwright/test';
import {captureRuntimeErrors,startMission,openStudio} from './helpers.mjs';

test('embedded Studio saves two independent appearances and preserves actual equipment',async({page})=>{
  const errors=captureRuntimeErrors(page);
  await startMission(page);
  await page.locator('#operationsBoardToggle').click();
  const before=await page.locator('[data-squad-card="rook"]').textContent();
  if(await page.locator('#operationsBoard').isVisible())
    await page.locator('#operationsBoard .fw-squad-sheet-header>button').click();
  let studio=await openStudio(page);
  await studio.getByRole('button',{name:'Customize tops'}).click();
  await studio.locator('[data-appearance-item="combat-shirt"]').click();
  await studio.locator('#studioMaterials .solid-swatches button:visible').first().click();
  await studio.locator('#studioOperator').selectOption('moss');
  await studio.locator('[data-appearance-item="combat-shirt"]').click();
  await studio.locator('#studioMaterials .solid-swatches button:visible').nth(1).click();
  await expect(studio.locator('#studioApply')).toHaveText('SAVE 2 LOOKS');
  await studio.locator('#studioApply').click();
  await expect(studio.locator('#studioStatus')).toContainText('SAVED 2 LOOKS');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork3d.quickplay-cosmetics.v1')));
  const rook=stored.members.find(m=>m.id==='rook'),moss=stored.members.find(m=>m.id==='moss');
  expect(rook.wardrobe.styles.top).toBe('combat-shirt');
  expect(moss.wardrobe.styles.top).toBe('combat-shirt');
  expect(rook.wardrobe).not.toEqual(moss.wardrobe);
  expect(rook).not.toHaveProperty('loadout');
  expect(rook).not.toHaveProperty('weapon');
  await studio.locator('#studioBack').click();
  await expect(page.locator('#operatorStudioOverlay')).toBeHidden();
  await expect(page.locator('[data-squad-card="rook"]')).toHaveText(before);
  if(await page.locator('#operationsBoard').isVisible())
    await page.locator('#operationsBoard .fw-squad-sheet-header>button').click();
  await page.reload();
  await expect(page.locator('#phase')).toHaveText('PLANNING',{timeout:60000});
  studio=await openStudio(page);
  await studio.getByRole('button',{name:'Customize tops'}).click();
  await expect(studio.locator('[data-appearance-item="combat-shirt"]')).toHaveAttribute('aria-pressed','true');
  const reopened=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork3d.quickplay-cosmetics.v1')));
  expect(reopened).toEqual(stored);
  expect(errors).toEqual([]);
});
