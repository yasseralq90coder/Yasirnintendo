import {titleKey} from './legacy-library.js';
import {uid,safeURL} from './core.js';
export function validateSnapshot(data){
 if(!data||data.version!==1||typeof data.accountId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(data.accountId)||!Array.isArray(data.titles)||data.titles.length>10000)throw Error('ملف نينتندو غير صالح.');
 const keys=new Set();
 const text=(x,n)=>typeof x==='string'&&x.length<=n;
 const date=x=>text(x,10)&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
 const titles=data.titles.map(t=>{
  if(!t||!text(t.titleId,100)||!t.titleId||!text(t.titleName,200)||!t.titleName||!['HAC','BEE'].includes(t.platform)||!Number.isInteger(t.totalPlayedMinutes)||t.totalPlayedMinutes<0||t.totalPlayedMinutes>6000000||!Array.isArray(t.days)||t.days.length>20000)throw Error('بيانات لعبة نينتندو غير صالحة.');
  const k=t.titleId+'|'+t.platform;if(keys.has(k))throw Error('لعبة مكررة في المصدر.');keys.add(k);
  const dates=new Set();const days=t.days.map(d=>{if(!d||!date(d.date)||dates.has(d.date)||!Number.isInteger(d.minutes)||d.minutes<0||d.minutes>1440)throw Error('بيانات يومية غير صالحة.');dates.add(d.date);return {date:d.date,minutes:d.minutes};});
  return {titleId:t.titleId,titleName:t.titleName,platform:t.platform,imageUrl:safeURL(t.imageUrl),totalPlayedMinutes:t.totalPlayedMinutes,totalPlayedDays:Number.isInteger(t.totalPlayedDays)?t.totalPlayedDays:0,firstPlayedAt:text(t.firstPlayedAt,50)?t.firstPlayedAt:'',lastPlayedAt:text(t.lastPlayedAt,50)?t.lastPlayedAt:'',lastUpdatedAt:text(t.lastUpdatedAt,50)?t.lastUpdatedAt:'',historyComplete:t.historyComplete===true,historyCheckedAt:text(t.historyCheckedAt,50)?t.historyCheckedAt:'',days};
 });
 return {version:1,accountId:data.accountId,syncedAt:text(data.syncedAt,50)?data.syncedAt:'',lastFullSync:text(data.lastFullSync,50)?data.lastFullSync:'',listCheckedAt:text(data.listCheckedAt,50)?data.listCheckedAt:'',sourceUpdatedAt:text(data.sourceUpdatedAt,50)?data.sourceUpdatedAt:'',titles};
}
export function mergeNintendo(state,data){
 const snapshot=validateSnapshot(data),next=structuredClone(state);
 for(const t of snapshot.titles){
  const key=snapshot.accountId+'|'+t.titleId+'|'+t.platform;
  let g=next.games.find(g=>g.nintendoKey===key);
  if(!g){const platform=t.platform==='BEE'?'Switch 2':'Switch';const sameOfficial=snapshot.titles.filter(x=>x.platform===t.platform&&titleKey(x.titleName)===titleKey(t.titleName));const candidates=next.games.filter(x=>(x.legacyId||x.ownershipConfirmed===true)&&!x.isCollection&&x.ownership!=='nso'&&!x.nintendoKey&&x.platform===platform&&titleKey(x.title)===titleKey(t.titleName));if(sameOfficial.length===1&&candidates.length===1){g=candidates[0];g.nintendoKey=key;}}
  if(!g){g={id:uid(),catalogId:'',title:t.titleName,platform:t.platform==='BEE'?'Switch 2':'Switch',genre:'أخرى',ownership:'digital',ownershipConfirmed:false,status:'backlog',baseMinutes:0,baseSource:'import',rating:0,progress:0,notes:'',completedAt:'',tier:'owned',sourceUrl:'',cover:t.imageUrl,nintendoKey:key};next.games.push(g);}
  // Existing native IDs stay separate; the unique exact legacy match preserves its completion history.
  g.title=t.titleName;if(t.imageUrl){if(!g.fallbackCover&&g.cover?.startsWith('data:image/'))g.fallbackCover=g.cover;g.cover=t.imageUrl;}
 }
 next.nintendo=snapshot;return next;
}
export function nintendoTitle(state,g){if(!g?.nintendoKey||!state.nintendo)return null;return state.nintendo.titles.find(t=>state.nintendo.accountId+'|'+t.titleId+'|'+t.platform===g.nintendoKey)||null;}
export function datedActivity(state){
 const rows=[];for(const g of state.games){const t=nintendoTitle(state,g);if(t)for(const d of t.days)rows.push({id:g.nintendoKey+'|'+d.date,gameId:g.id,date:d.date,minutes:d.minutes,source:'nintendo',aggregate:true});}return rows;
}
