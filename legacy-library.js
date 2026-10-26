import {uid,safeCover} from './core.js';
export const titleKey=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('en').replace(/[™®]/g,'').replace(/[^\p{L}\p{N}]/gu,'');
export function mergeCompletionHistory(a=[],b=[]){const out=new Map();for(const p of [...a,...b])out.set(p.id,p);return [...out.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));}
export function applyLibrarySeed(state,seed){
 if(!seed||seed.version!==1||!Array.isArray(seed.items)||typeof seed.seedId!=='string')throw Error('ملف المكتبة المضمّن غير صالح.');
 if(state.appliedSeeds?.includes(seed.seedId))return state;
 const next=structuredClone(state),rank={backlog:0,paused:0,wishlist:0,playing:1,beaten:2,complete:3};
 for(const item of seed.items){
  let game=next.games.find(g=>g.legacyId===item.legacyId);
  if(!game){const matches=next.games.filter(g=>!g.legacyId&&g.platform===item.platform&&titleKey(g.title)===titleKey(item.title));if(matches.length===1)game=matches[0];}
  if(!game){game={id:uid(),title:item.title,platform:item.platform,genre:item.genre,ownership:item.ownership,ownershipConfirmed:true,status:item.status,baseMinutes:0,baseSource:'import',rating:0,progress:item.status==='complete'?100:0,notes:'',completedAt:item.completedAt||'',sourceUrl:'',cover:item.cover,catalogId:'',tier:'owned'};next.games.push(game);}
  game.legacyId=item.legacyId;game.cover=game.cover||item.cover;game.fallbackCover=game.cover===item.cover?'':item.cover;game.metadata=item.metadata;
  game.completionHistory=mergeCompletionHistory(game.completionHistory,item.completionHistory);
  game.isCollection=item.isCollection===true;game.parentLegacyId=item.parentLegacyId||'';
  if((rank[item.status]||0)>(rank[game.status]||0))game.status=item.status;
  const dates=[game.completedAt,item.completedAt,...game.completionHistory.map(p=>p.date)].filter(Boolean).sort();if(dates.length)game.completedAt=dates[dates.length-1];
  if(game.status==='complete')game.progress=100;
  if(game.ownershipConfirmed===false){game.ownership=item.ownership;game.ownershipConfirmed=true;}
 }
 next.appliedSeeds=[...(next.appliedSeeds||[]),seed.seedId];return next;
}
export function completionTotals(state){const history=state.games.flatMap(g=>g.completionHistory||[]);return {count:history.reduce((n,p)=>n+p.count,0),minutes:history.reduce((n,p)=>n+p.minutes,0)};}

export function legacySeedFromBackup(data){
 if(!data||!Array.isArray(data.games)||!data.covers||typeof data.covers!=='object')throw Error('اختر ملف مكتبتك السابق الذي يحتوي games وcovers.');
 const genre=value=>{const text=String(value||'').toLowerCase();for(const [key,label] of [['platform','منصات'],['rpg','تقمص أدوار'],['racing','سباقات'],['puzzle','ألغاز'],['strategy','استراتيجية'],['simulation','محاكاة'],['sport','رياضة'],['adventure','مغامرات'],['action','أكشن']])if(text.includes(key))return label;return 'أخرى';};
 const items=data.games.filter(g=>['Nintendo Switch','Nintendo Switch 2'].includes(g.platform)).map(g=>{
  const id=String(g.id||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('معرّف لعبة غير صالح في الملف السابق.');
  const history=(g.playthroughs||[]).map((p,i)=>({id:'legacy-'+id+'-'+i,date:p.date||'',minutes:Math.round(Number(p.hours||0)*60),count:Number(p.n||1),kind:p.kind==='master'?'complete':'beaten',source:'legacy-json'}));
  const status=history.some(p=>p.kind==='complete')?'complete':history.length||g.status==='completed'?'beaten':g.status==='playing'?'playing':'backlog';
  return {legacyId:id,title:String(g.name||'').trim(),platform:g.platform==='Nintendo Switch 2'?'Switch 2':'Switch',genre:genre(g.genre),ownership:['physical','digital','both'].includes(g.type)?g.type:'digital',status,completedAt:g.dateCompleted||'',cover:safeCover(data.covers[id]),completionHistory:history,metadata:{source:'legacy-json',description:String(g.desc||''),developer:String(g.developer||''),year:String(g.year||''),originalGenre:String(g.genre||'')},isCollection:g.shell===true,parentLegacyId:String(g.parentId||'')};
 });
 if(!items.length)throw Error('لا توجد ألعاب Switch أو Switch 2 في هذا الملف.');
 return {version:1,seedId:'local-legacy-'+String(data.exportedAt||'backup').replace(/[^a-zA-Z0-9-]/g,'').slice(0,70),items};
}
