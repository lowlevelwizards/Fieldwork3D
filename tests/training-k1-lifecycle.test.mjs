import test from 'node:test';
import assert from 'node:assert/strict';
import {createBreachAppFlow} from '../src/breach-app-flow.ts';
import {debriefPrimaryActionLabel} from '../src/ui/fieldwork-vocabulary.ts';
test('training mounts and resumes as tactical mode, not campaign/quick',()=>{
 const app=createBreachAppFlow('menu');
 app.setMode('training');app.missionMounted();
 assert.equal(app.surface,'tactical');
 assert.equal(app.mode,'training');
 app.observePhase('running');assert.equal(app.surface,'tactical');
 app.setMode('menu');assert.equal(app.surface,'menu');
});
test('training labels are distinct and reversible',()=>{
 assert.equal(debriefPrimaryActionLabel('training'),'RETRY TRAINING');
 assert.equal(debriefPrimaryActionLabel('mission'),'RETURN TO BASE');
});
test('title menu contains a dedicated Training destination',async()=>{
 const {readFile}=await import('node:fs/promises');
 const text=await readFile(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 assert.match(text,/TRAINING · KILLHOUSE/);
 assert.match(text,/this\.handlers\.training/);
});
