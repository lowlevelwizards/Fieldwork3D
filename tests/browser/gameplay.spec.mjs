import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {newSession} from '../../src/breach-game.ts';
import {MissionRecorder} from '../../src/breach-replay.ts';
import {captureReplayArchive} from '../../src/breach-replay-archive.ts';
import {exportPortableReplay} from '../../src/breach-replay-portable.ts';
import {captureRuntimeErrors,startMission,openMissionSettings} from './helpers.mjs';

test('production Quick Play supports orders, pause, exact restart and portable replay',async({page},testInfo)=>{
  const errors=captureRuntimeErrors(page);
  await startMission(page);
  // WAIT is an actual authored order, independent of screen projection or map furnishing.
  await page.locator('#moreOrders').click();
  await page.locator('#wait').click();
  await expect(page.locator('#breachCanvas')).toHaveAttribute('data-plan-nodes','1');
  await page.locator('#play').click();
  await expect(page.locator('#phase')).toHaveText('EXECUTING');
  await expect(page.locator('#clock')).not.toHaveText('00:00',{timeout:30000});
  await page.locator('#play').click();
  await expect(page.locator('#phase')).toHaveText('PAUSED');
  const clock=await page.locator('#clock').textContent();
  await expect.poll(async()=>page.locator('#clock').textContent()).toBe(clock);
  await openMissionSettings(page);
  await page.locator('#restart').click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('alertdialog').getByRole('button',{name:'RESTART MISSION',exact:true}).click();
  if(await page.locator('#briefingPanel').isVisible())await page.locator('#briefingClose').click();
  await expect(page.locator('#clock')).toHaveText('00:00');
  await expect(page.locator('#breachCanvas')).toHaveAttribute('data-plan-nodes','0');
  await expect(page.locator('#siteIdentity')).toHaveAttribute('data-site-seed','23');
  // Create a real portable film in Node, then import using the supported browser UI.
  // Production bundles never import developer source URLs or receive internal state hooks.
  const session=newSession(0,23),recorder=new MissionRecorder();
  recorder.capture(session,true);session.seconds=.1;recorder.capture(session,true);
  const archive=captureReplayArchive(recorder,'verification-browser-film',1);
  const blob=await exportPortableReplay(archive);
  const fixture=testInfo.outputPath('fixture.fieldwork-replay.json.gz');
  await mkdir(path.dirname(fixture),{recursive:true});
  await writeFile(fixture,Buffer.from(await blob.arrayBuffer()));
  await openMissionSettings(page);
  await page.locator('#openReplayLibrary').click();
  await page.locator('#replayImportInput').setInputFiles(fixture);
  await expect(page.locator('.replay-library-row')).toHaveCount(1);
  await page.locator('.replay-library-row').getByRole('button',{name:'WATCH',exact:true}).click();
  await expect(page.locator('#phase')).toHaveText('REPLAY');
  await expect(page.locator('#replayPanel')).toBeVisible();
  await page.locator('#replayExit').click();
  await expect(page.locator('#phase')).toHaveText('PLANNING');
  await expect(page.locator('#siteIdentity')).toHaveAttribute('data-site-seed','23');
  await page.reload();
  await expect(page.locator('#phase')).toHaveText('PLANNING',{timeout:60000});
  await openMissionSettings(page);
  await page.locator('#openReplayLibrary').click();
  await expect(page.locator('.replay-library-row')).toHaveCount(1);
  expect(errors).toEqual([]);
});
