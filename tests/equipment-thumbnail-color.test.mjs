import test from 'node:test';
import assert from 'node:assert/strict';
import {linearByteToSrgb,copyLinearRgbaToSrgbFlipped}
 from '../src/equipment-thumbnail-color.ts';
test('linear WebGL shadow bytes become legible sRGB instead of crushed blacks',()=>{
 assert.equal(linearByteToSrgb(0),0);
 assert.equal(linearByteToSrgb(255),255);
 assert.ok(linearByteToSrgb(18)>=72);
 assert.ok(linearByteToSrgb(64)>130);
 assert.ok(linearByteToSrgb(128)>180);
});
test('flip pixel rows, encode color, and preserve opaque thumbnails',()=>{
 const pixels=new Uint8Array([16,32,64,0, 64,32,16,128]);
 const out=copyLinearRgbaToSrgbFlipped(pixels,1,2);
 assert.equal(out[0],linearByteToSrgb(64));
 assert.equal(out[4],linearByteToSrgb(16));
 assert.equal(out[3],255);
 assert.equal(out[7],255);
 assert.throws(()=>copyLinearRgbaToSrgbFlipped(pixels,3,3),/buffer/);
});
