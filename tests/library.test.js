import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {blankState,validateState,totals,minutes,safeCover,safeURL,challengeValue} from '../core.js';
import {applyLibrarySeed,completionTotals,legacySeedFromBackup} from '../legacy-library.js';
import {mergeNintendo,datedActivity} from '../nintendo-sync.js';
const raw={exportedAt:'2026-01-01',games:[{id:'a',name:'Sample Adventure',platform:'Nintendo Switch',type:'physical',playthroughs:[{date:'2026-07-18',hours:1.5,n:1,kind:'beat'}],sessions:[{minutes:999}],hours:999},{id:'b',name:'Sample Racing',platform:'Nintendo Switch 2',playthroughs:[{date:'2026-07-19',hours:2,n:2,kind:'master'}]},{id:'c',name:'Other',platform:'PC'}],covers:{a:'data:image/jpeg;base64,/9j/2Q=='},misc:{session_token:'must-not-import'}};
const seed=legacySeedFromBackup(raw);
test('local import preserves platforms, completion counts, dates and durations',()=>{
 const s=validateState(applyLibrarySeed(blankState(),seed));assert.equal(s.games.length,2);assert.equal(s.games.filter(g=>g.platform==='Switch 2').length,1);assert.equal(totals(s).beaten,2);assert.deepEqual(completionTotals(s),{count:3,minutes:210});assert.equal(totals(s).total,0);assert.equal(datedActivity(s).length,0);
 const mgs=s.games.find(g=>g.title==='Sample Adventure');assert.equal(mgs.completionHistory[0].date,'2026-07-18');assert.equal(mgs.completionHistory[0].minutes,90);assert.ok(mgs.cover.startsWith('data:image/jpeg;base64,'));
});
test('source import is idempotent across updates and backup restores',()=>{
 const a=validateState(applyLibrarySeed(blankState(),seed));const b=applyLibrarySeed(a,seed);assert.equal(b.games.length,2);assert.deepEqual(completionTotals(b),{count:3,minutes:210});const restored=validateState(JSON.parse(JSON.stringify(b)));assert.equal(applyLibrarySeed(restored,seed).games.length,2);
});
test('Nintendo sync matches a unique exact platform/title and preserves completion history',()=>{
 let s=validateState(applyLibrarySeed(blankState(),seed));const snapshot={version:1,accountId:'test',titles:[{titleId:'0100',titleName:'Sample Adventure',platform:'HAC',totalPlayedMinutes:600,totalPlayedDays:1,days:[{date:'2026-10-20',minutes:60}],imageUrl:'https://img-eshop.cdn.nintendo.net/i/test.jpg'}]};
 s=validateState(mergeNintendo(s,snapshot));assert.equal(s.games.length,2);const g=s.games.find(g=>g.nintendoKey);assert.equal(g.completionHistory.length,1);assert.equal(g.completionHistory[0].minutes,90);assert.equal(minutes(s,g.id),600);assert.equal(g.cover,snapshot.titles[0].imageUrl);assert.ok(g.fallbackCover.startsWith('data:image/jpeg;base64,'));
 s.sessions=[{id:'manual',gameId:g.id,date:'2026-10-21',minutes:999,source:'manual',note:''}];assert.equal(datedActivity(s).length,1);assert.equal(challengeValue({kind:'hours'},s,'2026-10'),60);
});
test('official CDN images survive validation but lookalike hosts and unsafe data URLs do not',()=>{
 assert.ok(safeURL('https://img-eshop.cdn.nintendo.net/i/a.jpg'));assert.equal(safeURL('https://nintendo.net.evil.example/a.jpg'),'');assert.equal(safeURL('https://evilnintendo.net/a.jpg'),'');assert.equal(safeCover('data:image/svg+xml,<svg onload="alert(1)"/>'),'');assert.ok(safeCover('./assets/library/seed_9.jpg'));assert.equal(safeCover('./assets/library/../../private.png'),'');
});
test('bundled source excludes session rows, account configuration and non-Nintendo platforms',()=>{
 const text=JSON.stringify(seed);assert.ok(!text.includes('gamelib:'));assert.ok(seed.items.every(g=>!Object.hasOwn(g,'sessions')));assert.ok(!text.includes('session_token'));assert.ok(seed.items.every(g=>['Switch','Switch 2'].includes(g.platform)));
});

test('local raster cover and completion history survive backup while secrets and manual hours do not',()=>{
 const s=validateState(applyLibrarySeed(blankState(),seed));const copy=validateState(JSON.parse(JSON.stringify(s)));assert.equal(copy.games[0].cover,raw.covers.a);assert.deepEqual(completionTotals(copy),{count:3,minutes:210});assert.equal(totals(copy).total,0);assert.ok(!JSON.stringify(copy).includes('must-not-import'));
});
