import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('P1.0 protects authoritative vision and pins a conservative renderer-only scope',()=>{
 const sourceGame=source('src/breach-game.ts');
 assert.match(sourceGame,/export function liveVisibility\(s:Session,p:Pt\)/);
 assert.match(sourceGame,/export function observerPointVisible/);
 // Authoritative ground visibility still uses the same physical LOS
 // primitive, but lowers the eye test when cover stance bends the knees.
 assert.match(sourceGame,/unobstructed\\(a\\.p,p,s,a\\.posture==='crouch'\\|\\|\\s*effectiveEyeHeight\\(a\\)<25\\)/);
 assert.match(sourceGame,/unobstructed\\(observer\\.p,p,s,observer\\.posture==='crouch'\\|\\|\\s*effectiveEyeHeight\\(observer\\)<25\\)/);
 assert.match(source('src/rendering/breach-3d-disclosure-presenter.ts'),/recordedReplayKnowledge/);
 assert.match(source('src/breach-3d.ts'),/const directlyObserved=!personal&&this\.presentationSight\.query/);
});
