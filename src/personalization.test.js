import test from 'node:test';
import assert from 'node:assert/strict';
import {backgroundInk} from './personalization.js';
test('custom backgrounds choose readable black or white text',()=>{
  assert.equal(backgroundInk('#ffffff'),'#000000');assert.equal(backgroundInk('#000000'),'#ffffff');
  for(let value=0;value<=255;value++){
    const color='#'+value.toString(16).padStart(2,'0').repeat(3),v=value/255,luminance=v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
    const contrast=backgroundInk(color)==='#000000'?(luminance+.05)/.05:1.05/(luminance+.05);
    assert.ok(contrast>=4.5);
  }
});
