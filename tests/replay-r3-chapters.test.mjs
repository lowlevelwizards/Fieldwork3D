import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReplayChapters,addReplayBookmark,adjacentReplayChapter}
  from '../src/breach-replay-chapters.ts';
test('chapters represent only recorded visible evidence',()=>{
  const chapters=buildReplayChapters([
    {t:9,kind:'door'},{t:10,kind:'wound'},
    {t:22,kind:'shot'},{t:23,kind:'shot'},
    {t:42,kind:'objective'},{t:45,kind:'not-a-real-kind'}
  ],60);
  assert.deepEqual(chapters.map(c=>c.label),
    ['MISSION START','CASUALTY','GUNFIRE','OBJECTIVE']);
  assert.equal(chapters[1].t,9);
  assert.equal(buildReplayChapters([],60).length,1);
  assert.equal(buildReplayChapters([],0).length,0);
  assert.deepEqual(buildReplayChapters(
    [{t:14,kind:'intel'}],60).map(c=>c.label),
    ['MISSION START','CONTACT']);
});
test('chapter navigation and bookmarks never jump to invented times',()=>{
  const chapters=buildReplayChapters([
    {t:9,kind:'door'},{t:20,kind:'wound'}
  ],60);
  assert.equal(adjacentReplayChapter(chapters,9,true)?.t,20);
  assert.equal(adjacentReplayChapter(chapters,9,false)?.t,0);
  assert.equal(adjacentReplayChapter(chapters,60,true),null);
  let marks=addReplayBookmark([],4.3,60,'b1','Entry');
  marks=addReplayBookmark(marks,70,60,'b2','Final');
  assert.deepEqual(marks.map(x=>x.t),[4.3,60]);
  assert.equal(addReplayBookmark(marks,6,60,'b1','Revised').length,2);
});
