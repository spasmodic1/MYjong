import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {standardTileCount,standardName,standardImageUrl} from './standard-tiles.js';
import {seasons,seasonalImageUrl} from './seasonal.js';
test('every traditional and seasonal identity has bundled painted artwork',()=>{
 assert.equal(standardTileCount,35);
 const urls=Array.from({length:35},(_,i)=>standardImageUrl(i));assert.equal(new Set(urls).size,35);
 for(const url of urls)assert.ok(existsSync(new URL(url)),url);
 for(const theme of seasons)for(let i=0;i<7;i++)assert.ok(existsSync(new URL(seasonalImageUrl(theme,i))),theme.id+' '+i);
 assert.equal(standardName(10),'Dots 6');assert.equal(standardName(14),'Bamboo 6');assert.equal(standardName(18),'Characters 1');assert.equal(standardName(34),'Red rabbit');
});
