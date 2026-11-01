import test from 'node:test';import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {equipmentTrainingSite} from '../src/equipment-training-range.ts';
import {activeRangeDiagnostic,rangeDiagnosticLabel}
 from '../src/equipment-training-diagnostics.ts';
test('25.01 live-only diagnostics read actual weapon state',()=>{
 const s=newSession(0,undefined,'floor-plan','small',undefined,equipmentTrainingSite());
 const a=s.operators.find(o=>o.id==='rook');
 a.shots=9;a.magazine=6;a.reserve=90;a.aim=.75;a.recoil=.39;a.stability=.68;
 const d=activeRangeDiagnostic(s,'rook');
 assert.equal(d.shots,9);assert.equal(d.magazine,6);
 assert.equal(d.reserve,90);assert.equal(d.aim,75);
 assert.equal(d.recoil,39);assert.equal(d.stability,68);
 assert.match(rangeDiagnosticLabel(d),/FIRED 9/);
 assert.match(rangeDiagnosticLabel(d),/MAG 6 \/ RES 90/);
});
test('25.01 no range readout in regular missions',()=>{
 const s=newSession();
 assert.equal(activeRangeDiagnostic(s,'rook'),null);
 const range=newSession(0,undefined,'floor-plan','small',undefined,equipmentTrainingSite());
 assert.equal(activeRangeDiagnostic(range,'guard0'),null);
});
