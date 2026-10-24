import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudCoverAtHour } from '../src/cloud-model.ts';
import {
  RAIN_WINDOWS, groundWetnessAtHour, rainAtHour, rainFrontAtHour,
  rainIntensityAtHour, rainPhase,
} from '../src/rain-model.ts';

test('low cloud cover cannot rain even during a rain front', () => {
  for (const hour of [0, 3, 6, 12, 19, 23]) {
    assert.equal(rainIntensityAtHour(hour, .45, true), 0);
    assert.equal(rainAtHour(hour, .30).amount, 0);
  }
});
test('turning the clouds slider up produces increasing precipitation', () => {
  const hour = 12.5;
  const amounts = [.3,.6,.7,.8,.9,1].map(cover => rainAtHour(hour,cover,true).amount);
  for(let i=1;i<amounts.length;i++) assert.ok(amounts[i]>=amounts[i-1]);
  assert.equal(amounts[0],0);
  assert.equal(rainPhase(amounts[0]),'dry');
  assert.ok(amounts[3]>.10);
  assert.equal(rainPhase(amounts[5]),'downpour');
});
test('automatic rain fronts have varied durations and smoothly start/end', () => {
  assert.ok(new Set(RAIN_WINDOWS.map(x => x.end-x.start)).size>2);
  for (const event of RAIN_WINDOWS) {
    assert.equal(rainFrontAtHour(event.start),0);
    assert.ok(rainFrontAtHour(event.peak)>.4);
    assert.equal(rainFrontAtHour(event.end),0);
    assert.ok(rainFrontAtHour(event.start+.02)<.01);
    assert.ok(rainFrontAtHour(event.end-.02)<.01);
  }
  const dawnCover=cloudCoverAtHour(6.15);
  const dawnRain=rainAtHour(6.15,dawnCover);
  assert.ok(dawnRain.amount>.10);
  assert.ok(dawnRain.amount>rainAtHour(12.5,cloudCoverAtHour(12.5)).amount);
});
test('rain, wetness, and fronts remain continuous over midnight', () => {
  const near=23.99999;
  const early=.00001;
  for (const coverage of [.2,.75,1]) {
    const a=rainAtHour(near,coverage,true);
    const b=rainAtHour(early,coverage,true);
    assert.ok(Math.abs(a.amount-b.amount)<.0001);
    assert.ok(Math.abs(a.wetness-b.wetness)<.0001);
  }
  assert.ok(Math.abs(rainFrontAtHour(near)-rainFrontAtHour(early))<.0001);
});
test('wet ground retains recent precipitation then dries, deterministically', () => {
  const justAfterStorm=groundWetnessAtHour(8.35);
  const dryAfternoon=groundWetnessAtHour(14.5);
  assert.ok(justAfterStorm>dryAfternoon);
  assert.equal(groundWetnessAtHour(8.35),justAfterStorm);
  assert.ok(groundWetnessAtHour(12.5,1)>.5);
  for(let hour=0;hour<=24;hour+=.1){
    const a=rainAtHour(hour,cloudCoverAtHour(hour));
    assert.ok(a.amount>=0&&a.amount<=1);
    assert.ok(a.wetness>=0&&a.wetness<=1);
  }
});
