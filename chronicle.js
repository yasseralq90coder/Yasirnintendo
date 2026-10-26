import {activity,events,completions,todayKey,dayShift,hardwareOn} from './journey.js';
import {nintendoTitle} from './nintendo-sync.js';
export const isDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
const daysBetween=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/86400000);
export function cleanChronicle(raw,ids){
 const records=[],overrides={},hidden=[];const seen=new Set();
 if(raw?.records&&!Array.isArray(raw.records))throw Error('سجل الرايات غير صالح.');
 for(const r of raw?.records||[]){if(!r||typeof r.id!=='string'||!r.id||r.id.length>150||seen.has(r.id)||!ids.has(r.gameId)||!isDate(r.date)||r.date>todayKey()||!Number.isInteger(r.count)||r.count<1||r.count>100||(r.startedAt&&(!isDate(r.startedAt)||r.startedAt>r.date))||typeof(r.note||'')!=='string'||(r.note||'').length>1000)throw Error('تحقق من تاريخ التختيمة وعددها واللعبة.');seen.add(r.id);records.push({id:r.id,gameId:r.gameId,date:r.date,startedAt:r.startedAt||'',count:r.count,note:r.note||''});}
 for(const [id,r] of Object.entries(raw?.overrides||{})){if(id.length>200||!r||!isDate(r.date)||r.date>todayKey()||!Number.isInteger(r.count)||r.count<1||r.count>100||(r.startedAt&&(!isDate(r.startedAt)||r.startedAt>r.date))||typeof(r.note||'')!=='string'||(r.note||'').length>1000)throw Error('تعديل تختيمة غير صالح.');overrides[id]={date:r.date,startedAt:r.startedAt||'',count:r.count,note:r.note||''};}
 for(const id of raw?.hiddenEvents||[])if(typeof id==='string'&&id.length<=200)hidden.push(id);
 if(records.length>10000||Object.keys(overrides).length>10000||hidden.length>10000)throw Error('سجل الرايات أكبر من الحد المدعوم.');
 return {records,overrides,hiddenEvents:[...new Set(hidden)]};
}
export function saveCompletion(state,{gameId,id='',date,startedAt='',count=1,note='',runId=''},newId){
 const g=state.games.find(g=>g.id===gameId);if(!g||g.isCollection||g.nintendoKey&&/nintendo classics|nintendo switch online|entertainment system/i.test(g.title))throw Error('اختر لعبة فردية، وليس تطبيق منصة أو مجموعة.');
 if(!isDate(date)||date>todayKey()||startedAt&&(!isDate(startedAt)||startedAt>date)||!Number.isInteger(count)||count<1||count>100)throw Error('اختر تاريخًا صحيحًا لا يتجاوز اليوم وعددًا من 1 إلى 100.');
 const j=state.journey;
 if(id){if(!events(state).some(e=>e.id===id&&e.gameId===gameId))throw Error('التختيمة غير موجودة.');j.overrides[id]={date,startedAt,count,note};}
 else if(runId){const r=j.runs.find(r=>r.id===runId&&r.gameId===gameId&&r.status==='active');if(!r||date<r.startedAt)throw Error('تاريخ الختم يسبق بداية الرحلة؛ استخدم إضافة تختيمة سابقة.');r.status='beaten';r.endedAt=date;r.minutes=null;r.timeSource='unavailable';j.overrides[r.id]={date,startedAt:startedAt||r.startedAt,count,note};}
 else {if(!newId)throw Error('معرّف التختيمة مطلوب.');j.records.push({id:newId,gameId,date,startedAt,count,note});}
 cleanChronicle(j,new Set(state.games.map(g=>g.id)));return state;
}
export function hideCompletion(state,id){if(!events(state).some(e=>e.id===id))throw Error('التختيمة غير موجودة.');state.journey.hiddenEvents=[...new Set([...state.journey.hiddenEvents,id])];return state;}
export function completionLedger(state,gameId){
 const g=state.games.find(g=>g.id===gameId),t=nintendoTitle(state,g);if(!g)return [];
 const list=events(state).filter(e=>e.gameId===gameId).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),dateCount=new Map();for(const e of list)if(e.date)dateCount.set(e.date,(dateCount.get(e.date)||0)+e.count);
 let previous=null,number=0;return list.map(e=>{const from=e.startedAt||previous?.date||t?.firstPlayedAt?.slice(0,10)||'',sameDay=(dateCount.get(e.date)||0)>1,valid=!!t&&!!from&&!!e.date&&from<=e.date&&!sameDay;
 const minutes=valid?t.days.filter(d=>(e.startedAt||!previous?d.date>=from:d.date>from)&&d.date<=e.date).reduce((n,d)=>n+d.minutes,0):null;
 const row={...e,number:number+1,lastNumber:number+e.count,previousDate:previous?.date||'',gapDays:previous?.date&&e.date?daysBetween(previous.date,e.date):null,from,dailyMinutes:minutes,timeComplete:valid&&t.historyComplete,sameDay,sourceMinutes:e.imported?e.minutes:null};number+=e.count;if(e.date)previous=e;return row;});
}
export const totalOfficial=state=>(state.nintendo?.titles||[]).reduce((n,t)=>n+t.totalPlayedMinutes,0);
export function periodStats(state,from,to){
 if(!isDate(from)||!isDate(to)||from>to)throw Error('نطاق الإحصائيات غير صالح.');
 const all=activity(state),rows=all.filter(r=>r.date>=from&&r.date<=to),calendarDays=daysBetween(from,to)+1,previousFrom=dayShift(from,-calendarDays),previousTo=dayShift(from,-1),previousMinutes=all.filter(r=>r.date>=previousFrom&&r.date<=previousTo).reduce((n,r)=>n+r.minutes,0),byDay=new Map(),byGame=new Map(),devices={'Switch':0,'Switch 2':0},weekdays=Array(7).fill(0);
 for(const r of rows){byDay.set(r.date,(byDay.get(r.date)||0)+r.minutes);byGame.set(r.gameId,(byGame.get(r.gameId)||0)+r.minutes);const g=state.games.find(g=>g.id===r.gameId);devices[hardwareOn(state,g,r.date)]+=r.minutes;weekdays[new Date(r.date+'T00:00:00Z').getUTCDay()]+=r.minutes;}
 const total=rows.reduce((n,r)=>n+r.minutes,0),ev=events(state).filter(e=>e.date>=from&&e.date<=to),count=ev.reduce((n,e)=>n+e.count,0),finished=new Set(ev.map(e=>e.gameId));
 return {from,to,rows,total,previousMinutes,previousFrom,previousTo,change:previousMinutes?((total-previousMinutes)/previousMinutes*100):null,activeDays:byDay.size,calendarDays,averageActive:byDay.size?total/byDay.size:0,averageCalendar:total/calendarDays,byDay,top:[...byGame].sort((a,b)=>b[1]-a[1]),devices,weekdays,completions:count,finished:finished.size,replays:Math.max(0,count-[...finished].filter(id=>!events(state).some(e=>e.gameId===id&&e.date&&e.date<from)).length)};
}
export const SYSTEMS=[{id:'nes',name:'NES',platforms:['NES'],tier:'standard',color:'#d52a35',pattern:/\bNES\b|^Nintendo Entertainment System/i},{id:'snes',name:'SNES',platforms:['SNES'],tier:'standard',color:'#7850ad',pattern:/super nintendo|\bSNES\b/i},{id:'gb',name:'Game Boy',platforms:['Game Boy','Game Boy Color'],tier:'standard',color:'#718447',pattern:/game boy(?!.*advance)/i},{id:'n64',name:'Nintendo 64',platforms:['Nintendo 64'],tier:'expansion',color:'#278d68',pattern:/nintendo 64/i},{id:'gba',name:'Game Boy Advance',platforms:['Game Boy Advance'],tier:'expansion',color:'#5259b3',pattern:/game boy advance/i},{id:'gc',name:'GameCube',platforms:['GameCube'],tier:'expansion',color:'#64509d',pattern:/gamecube/i},{id:'md',name:'SEGA Genesis',platforms:['SEGA Genesis'],tier:'expansion',color:'#246fa8',pattern:/sega.*(genesis|mega drive)/i},{id:'vb',name:'Virtual Boy',platforms:['Virtual Boy'],tier:'expansion',color:'#bd3244',pattern:/virtual boy/i}];
export function systemOf(g){if(!g)return null;if(!g.nintendoKey)return SYSTEMS.find(s=>s.platforms.includes(g.platform))||null;return SYSTEMS.find(s=>s.pattern.test(g.title))||null;}
export function nsoStats(state,id){
 const sys=SYSTEMS.find(s=>s.id===id);if(!sys)return null;const containers=state.games.filter(g=>g.nintendoKey&&systemOf(g)?.id===id),keys=new Set(containers.map(g=>g.nintendoKey)),classics=state.games.filter(g=>!g.nintendoKey&&sys.platforms.includes(g.platform)),ids=new Set(classics.map(g=>g.id)),ev=events(state).filter(e=>ids.has(e.gameId)),rows=activity(state).filter(r=>keys.has(state.games.find(g=>g.id===r.gameId)?.nintendoKey));
 return {...sys,containers,classics,minutes:containers.reduce((n,g)=>n+(nintendoTitle(state,g)?.totalPlayedMinutes||0),0),activeDays:new Set(rows.map(r=>r.date)).size,completions:ev.reduce((n,e)=>n+e.count,0),finished:new Set(ev.map(e=>e.gameId)).size,events:ev,rows};
}
