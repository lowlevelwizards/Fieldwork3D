import test from 'node:test';
import assert from 'node:assert/strict';
import {replayVideoMime,replayVideoSize,QUICK_VIDEO_SECONDS}
  from '../src/breach-replay-video.ts';
test('video export selects only browser-declared supported MIME types',()=>{
  assert.equal(replayVideoMime(type=>type==='video/webm'),'video/webm');
  assert.equal(replayVideoMime(type=>type==='video/mp4'),'video/mp4');
  assert.equal(replayVideoMime(()=>false),null);
});
test('quick video chooses bounded landscape or portrait 720p',()=>{
  assert.deepEqual(replayVideoSize(1920,1080),{width:1280,height:720});
  assert.deepEqual(replayVideoSize(390,844),{width:720,height:1280});
  assert.equal(QUICK_VIDEO_SECONDS,20);
});
