import test from 'node:test';
import assert from 'node:assert/strict';
import {replayBodycamVideoDisclosure}
  from '../src/breach-replay-video.ts';

test('Bodycam exports always identify reconstructed camera and mount',()=>{
  for(const mount of ['chest','helmet']){
    const label=replayBodycamVideoDisclosure({observerId:'rook',mount});
    assert.ok(label?.startsWith('RECONSTRUCTED BODYCAM'));
    assert.ok(label?.includes('ROOK'));
    assert.ok(label?.includes(mount.toUpperCase()));
  }
});
test('ordinary tactical exports retain no false Bodycam watermark',()=>{
  assert.equal(replayBodycamVideoDisclosure(null),null);
});
test('untrusted operator names are bounded before drawing on canvas',()=>{
  const label=replayBodycamVideoDisclosure({
    observerId:'rook! <script>alert(1)</script> and others',mount:'helmet'
  });
  assert.ok(!/[<>! ]/.test(label.slice(label.indexOf('·')+1,
    label.lastIndexOf('·')).trim()));
  assert.ok((label??'').length<64);
});
