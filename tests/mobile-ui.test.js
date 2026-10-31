import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,validateState} from '../core.js';
import {prepareJourney} from '../journey.js';
import {mergeNintendo} from '../nintendo-sync.js';
import {timelineModel,createMobileUI} from '../mobile-ui.js';
function fixture(){let s=mergeNintendo(blankState(),{version:1,accountId:'test',titles:[{titleId:'one',titleName:'Mario',platform:'HAC',imageUrl:'',totalPlayedMinutes:600,totalPlayedDays:3,days:[{date:'2026-09-30',minutes:20},{date:'2026-10-01',minutes:40},{date:'2026-10-02',minutes:60}]}]});s=prepareJourney(validateState(s),'2026-10-31');s.journey.records.push({id:'f',gameId:s.games[0].id,date:'2026-10-02',count:2,minutes:999});return s;}
test('timeline totals only dated Nintendo play, never adds completion durations or lifetime totals',()=>{const s=fixture(),before=JSON.stringify(s),m=timelineModel(s,{month:'2026-10'});assert.equal(m.minutes,100);assert.equal(m.flags,2);assert.equal(m.days[0][0],'2026-10-02');assert.equal(JSON.stringify(s),before);});
test('month, day, game and event filters operate together without changing state',()=>{const s=fixture();assert.equal(timelineModel(s,{month:'2026-10',day:'2026-10-02',kind:'play',query:'mAR'}).minutes,60);assert.equal(timelineModel(s,{month:'2026-10',kind:'finish'}).minutes,0);assert.equal(timelineModel(s,{month:'2026-09'}).minutes,20);assert.equal(timelineModel(s,{month:'2026-10',query:'Zelda'}).days.length,0);});
test('empty account renders honest empty home and working calendar without fabricated play',()=>{const s=prepareJourney(validateState(blankState()),'2026-10-31');const ui=createMobileUI({getState:()=>s,esc:String,fmt:String,hours:String,heading:()=>'',btn:()=>'',render:()=>{}});assert.match(ui.home(),/مكتبتك تبدأ/);assert.match(ui.journal(),/mobile-history-filter/);assert.match(ui.journal(),/لا سجلات مطابقة/);assert.doesNotMatch(ui.home(),/data-action="start-timer"/);});
