import {cleanChronicle} from './chronicle.js';
import {datedActivity,nintendoTitle} from './nintendo-sync.js';
import {titleKey,mergeCompletionHistory} from './legacy-library.js';
const dayMs=86400000;
export const dayShift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*dayMs).toISOString().slice(0,10);
export const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const defaults=()=>({version:1,hardwareSince:'2025-08-01',weeklyDays:3,focus:[],favorites:[],runs:[],plans:{}});
export function cleanJourney(raw,ids){
 const j={...defaults(),...cleanChronicle(raw,ids),bookmarks:[]};if(!raw)return j;j.bookmarks=Array.isArray(raw.bookmarks)?[...new Set(raw.bookmarks.filter(x=>typeof x==='string'&&/^[a-f0-9]{16}$/.test(x)))].slice(0,200):[];
 const date=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(date(raw.hardwareSince)&&raw.hardwareSince<=todayKey())j.hardwareSince=raw.hardwareSince;
 if(Number.isInteger(raw.weeklyDays)&&raw.weeklyDays>=1&&raw.weeklyDays<=7)j.weeklyDays=raw.weeklyDays;
 for(const key of ['focus','favorites'])j[key]=Array.isArray(raw[key])?[...new Set(raw[key].filter(x=>ids.has(x)))].slice(0,key==='focus'?3:1000):[];
 if(raw.runs!==undefined&&!Array.isArray(raw.runs))throw Error('سجل الرحلات غير صالح.');
 const seen=new Set(),active=new Set();j.runs=(raw.runs||[]).map(r=>{
  if(!r||typeof r.id!=='string'||r.id.length>100||seen.has(r.id)||!ids.has(r.gameId)||!date(r.startedAt)||r.startedAt>todayKey()||!['active','beaten','complete','abandoned'].includes(r.status)||!Number.isInteger(r.baselineMinutes)||r.baselineMinutes<0||r.baselineMinutes>6000000||(![null,undefined].includes(r.minutes)&&(!Number.isInteger(r.minutes)||r.minutes<0||r.minutes>6000000)))throw Error('رحلة تختيم غير صالحة.');
  if(r.status==='active'){if(active.has(r.gameId))throw Error('يوجد مساران نشطان للعبة نفسها.');active.add(r.gameId);}else if(!date(r.endedAt)||r.endedAt<r.startedAt||r.endedAt>todayKey())throw Error('تاريخ نهاية الرحلة غير صالح.');
  seen.add(r.id);return {id:r.id,gameId:r.gameId,startedAt:r.startedAt,endedAt:r.status==='active'?'':r.endedAt,status:r.status,baselineMinutes:r.baselineMinutes,minutes:r.minutes??null,source:'player-declared',timeSource:r.timeSource==='nintendo-delta'?'nintendo-delta':'unavailable'};
 });if(j.runs.length>10000)throw Error('عدد الرحلات أكبر من الحد المدعوم.');
 for(const [key,p] of Object.entries(raw.plans||{}).slice(-240)){
  if(!/^(month|week):\d{4}-\d{2}(?:-\d{2})?$/.test(key)||!p||!date(p.start)||!date(p.end)||p.end<p.start||!Array.isArray(p.items)||p.items.length>10)throw Error('لوحة مهمات غير صالحة.');
  j.plans[key]={start:p.start,end:p.end,libraryReady:p.libraryReady===true,items:p.items.map(q=>{if(!q||!['minutes','days','games','game','finish','replay','nso'].includes(q.type)||typeof q.id!=='string'||q.id.length>150||typeof q.title!=='string'||q.title.length>250||!Number.isInteger(q.target)||q.target<1||q.target>12000||!Number.isInteger(q.stars)||q.stars<1||q.stars>5)throw Error('مهمة غير صالحة.');return {id:q.id,title:q.title,type:q.type,target:q.target,stars:q.stars,gameId:ids.has(q.gameId)?q.gameId:'',unit:q.type==='minutes'||q.type==='game'||q.type==='nso'?'دقيقة':q.type==='days'?'أيام':q.type==='games'?'ألعاب':'تختيمة'};})};
 }return j;
}
export function isNSO(g){return g.ownership==='nso'||/nintendo classics|nintendo switch online|entertainment system|game boy.*(?:advance|nintendo)|nintendo 64|sega.*genesis|gamecube.*classics/i.test(g.title);}
export function family(g){const t=g.title.toLowerCase();for(const [key,re,icon] of [['Zelda',/zelda|hyrule/,'🔺'],['Mario',/mario|luigi|yoshi|toad/,'🍄'],['Pokémon',/pok[eé]mon/,'🔴'],['Metroid',/metroid/,'🚀'],['Donkey Kong',/donkey kong/,'🍌'],['Kirby',/kirby/,'🌸'],['Sonic',/sonic/,'💨'],['Fire Emblem',/fire emblem/,'⚔️'],['Final Fantasy',/final fantasy/,'💎'],['Dragon Quest',/dragon quest/,'🐉']])if(re.test(t))return {name:key,icon};return isNSO(g)?{name:'Nintendo Classics',icon:'🕹️'}:{name:'عوالم أخرى',icon:'✦'};}
export function genreOf(g){if(g.genre&&g.genre!=='أخرى')return g.genre;const t=g.title.toLowerCase();if(/kart|racing|f-zero/.test(t))return 'سباقات';if(/zelda|metroid|bioshock|metal gear/.test(t))return 'مغامرات';if(/final fantasy|dragon quest|xenoblade|pok[eé]mon|fire emblem|diablo|ni no kuni/.test(t))return 'تقمص أدوار';if(/animal crossing|stardew/.test(t))return 'محاكاة';if(/mario|donkey kong|sonic|kirby|crash/.test(t))return 'منصات';return 'أخرى';}
export function hardwareOn(state,g,date){return date>=(state.journey?.hardwareSince||'2025-08-01')||g.platform==='Switch 2'?'Switch 2':'Switch';}
export function playedHardware(state,g){const t=nintendoTitle(state,g);const dates=[...(t?.days.filter(d=>d.minutes>0).map(d=>d.date)||[]),t?.lastPlayedAt?.slice(0,10),...events(state).filter(e=>e.gameId===g.id).map(e=>e.date),g.completedAt].filter(Boolean);const last=dates.sort().pop();return last?hardwareOn(state,g,last):['Switch','Switch 2'].includes(g.platform)?g.platform:'غير مسجل';}

export function events(state){const out=[];for(const g of state.games){const hs=g.completionHistory||[];for(const h of hs)out.push({...h,gameId:g.id,kind:'beaten',imported:true});if(!hs.length&&['beaten','complete'].includes(g.status))out.push({id:'status-'+g.id,gameId:g.id,date:g.completedAt||'',count:1,kind:'beaten',minutes:null,imported:true});}for(const r of state.journey?.runs||[])if(['beaten','complete'].includes(r.status))out.push({id:r.id,gameId:r.gameId,date:r.endedAt,count:1,kind:'beaten',minutes:r.minutes,imported:false,startedAt:r.startedAt});for(const r of state.journey?.records||[])out.push({...r,kind:'beaten',minutes:null,imported:false});const hidden=new Set(state.journey?.hiddenEvents||[]),seen=new Set();return out.filter(e=>{if(hidden.has(e.id)||seen.has(e.id))return false;seen.add(e.id);return true;}).map(e=>({...e,...state.journey?.overrides?.[e.id]}));}

export function completions(state,id){return events(state).filter(e=>!id||e.gameId===id).reduce((n,e)=>n+e.count,0);}
export function activity(state){const seen=new Set();return datedActivity(state).filter(r=>{const key=r.id;if(seen.has(key)||r.minutes<=0)return false;seen.add(key);return true;});}
export function streaks(rows,today=todayKey()){const dates=[...new Set(rows.map(r=>r.date))].sort();let best=0,run=0,previous='';for(const d of dates){run=previous&&dayShift(previous,1)===d?run+1:1;best=Math.max(best,run);previous=d;}let current=0,d=dates.includes(today)?today:dayShift(today,-1),set=new Set(dates);while(set.has(d)){current++;d=dayShift(d,-1);}return {best,current,active:dates.length};}
export function progression(state,today=todayKey()){
 const rows=activity(state).filter(r=>r.date<=today),byDay=new Map();for(const r of rows)byDay.set(r.date,(byDay.get(r.date)||0)+r.minutes);
 const timeXP=[...byDay.values()].reduce((n,m)=>n+Math.floor(Math.min(m,120)/15)*10,0),dayXP=byDay.size*15;
 const ev=events(state).filter(e=>!e.date||e.date<=today);const counts=new Map();let finishXP=0,masteryXP=0;
 for(const e of ev.sort((a,b)=>a.date.localeCompare(b.date))){const n=counts.get(e.gameId)||0;for(let i=n;i<Math.min(n+e.count,3);i++)finishXP+=[300,200,100][i];counts.set(e.gameId,n+e.count);}
 const mastered=new Set();masteryXP=0;
 const xp=timeXP+dayXP+finishXP+masteryXP,level=Math.floor((Math.sqrt(1+8*xp/180)-1)/2)+1,floor=180*(level-1)*level/2,ceiling=180*level*(level+1)/2;
 const rank=level>=40?'أسطورة المملكة':level>=25?'حارس الترايفورس':level>=15?'فارس هايرول':level>=8?'بطل المشروم':'مستكشف العوالم';
 return {xp,level,floor,ceiling,progress:(xp-floor)/(ceiling-floor)*100,rank,timeXP,dayXP,finishXP,masteryXP,completions:[...counts.values()].reduce((a,b)=>a+b,0),finished:counts.size,mastered:mastered.size,streak:streaks(rows,today)};
}
export function achievements(state,today=todayKey()){
 const rows=activity(state).filter(r=>r.date<=today),p=progression(state,today),official=state.nintendo?.titles||[],total=official.reduce((n,t)=>n+t.totalPlayedMinutes,0),ev=events(state),out=[];
 const add=(id,icon,name,desc,value,targets)=>targets.forEach((target,i)=>out.push({id:id+'-'+i,icon,name:name+' · '+['برونزي','فضي','ذهبي','أسطوري'][i],description:desc+' '+target,value,target,tier:i,unlocked:value>=target}));
 add('time','⭐','نجوم ماريو','ساعات Nintendo:',total/60,[1,25,100,500]);add('finish','🏁','رايات المملكة','ألعاب مختومة:',p.finished,[1,5,10,25]);add('replay','🔄','عودة لينك','تختيمات إضافية بعد الأولى:',p.completions-p.finished,[1,3,10,25]);add('master','👑','تاج بييتش','إجمالي الرايات في رحلتك:',p.completions,[3,10,25,50]);
 add('days','🍃','رحلة إيزابيل','أيام نشاط Nintendo:',p.streak.active,[7,30,100,365]);add('explore','🌸','فضول كيربي','عناوين Nintendo لعبتها:',official.filter(t=>t.totalPlayedMinutes>0).length,[3,10,30,100]);
 add('streak','🔥','شعلة باوزر','أفضل تتابع أيام (للذكرى، دون عقوبة):',p.streak.best,[3,7,14,30]);
 const hardware=rows.filter(r=>hardwareOn(state,state.games.find(g=>g.id===r.gameId),r.date)==='Switch 2').reduce((n,r)=>n+r.minutes,0);
 add('switch2','🎮','عصر Switch 2','ساعات الأيام المنسوبة لـSwitch 2:',hardware/60,[5,25,100,300]);
 const nsoMinutes=rows.filter(r=>isNSO(state.games.find(g=>g.id===r.gameId))).reduce((n,r)=>n+r.minutes,0);add('retro','🕹️','بوابة الزمن','ساعات تطبيقات NSO:',nsoMinutes/60,[1,5,20,50]);
 for(const [genre,icon,name] of [['منصات','🍄','قفزة ماريو'],['مغامرات','🔺','رحّالة هايرول'],['تقمص أدوار','🔴','رحلة المدرّب'],['سباقات','🏎️','كأس المشروم']]){const value=state.games.filter(g=>genreOf(g)===genre).reduce((n,g)=>n+(nintendoTitle(state,g)?.totalPlayedMinutes||0),0)/60;add('genre-'+genre,icon,name,'ساعات '+genre+' (تصنيف مكتبتك أو اقتراحي):',value,[5,20,50,100]);}
 const familyTargets=[['Mario','🍄','سفير المشروم'],['Zelda','🔺','حارس هايرول'],['Kirby','🌸','صديق دريم لاند'],['Metroid','🚀','صائد المجرات'],['Pokémon','🔴','وسام المدرّب'],['Donkey Kong','🍌','بطل الأدغال']];
 for(const [name,icon,label] of familyTargets){const ids=new Set(state.games.filter(g=>family(g).name===name).map(g=>g.id));const done=new Set(ev.filter(e=>ids.has(e.gameId)).map(e=>e.gameId)).size;add('family-'+name,icon,label,'ألعاب مختلفة مختومة من '+name+':',done,[1,2,3,5]);}
 add('variety','🌈','قوس قزح يوشي','أنواع مختلفة ختمتها:',new Set(state.games.filter(g=>ev.some(e=>e.gameId===g.id)&&genreOf(g)!=='أخرى').map(genreOf)).size,[2,3,4,5]);
 return out;
}
export function recommendations(state,mode='continue',today=todayKey()){
 const pinned=new Set(state.journey?.focus||[]),fav=new Set(state.journey?.favorites||[]),active=new Set((state.journey?.runs||[]).filter(r=>r.status==='active').map(r=>r.gameId));
 return state.games.filter(g=>!g.isCollection&&!state.companion?.profiles?.[g.id]?.hidden&&!(state.companion?.profiles?.[g.id]?.access==='demo'||(!state.companion?.profiles?.[g.id]?.access&&/\bdemo\b|trial version|体験版|نسخة تجريبية/i.test(g.title)))&&g.status!=='wishlist'&&(mode==='nso'?isNSO(g):true)).map(g=>{const t=nintendoTitle(state,g),count=completions(state,g.id),last=t?.lastPlayedAt?.slice(0,10)||'',gap=last?Math.max(0,(Date.parse(today)-Date.parse(last))/dayMs):9999;let score=pinned.has(g.id)?1000:0;score+=fav.has(g.id)?100:0;let reason='ابدأ عالمًا جديدًا من مكتبتك';if(active.has(g.id)){score+=500;reason='رحلة تختيم نشطة';}if(mode==='replay'){score+=count?300+Math.min(gap,120):-10000;reason='تختيمة جديدة بقواعد مختلفة';}else if(mode==='comeback'){score+=t?.totalPlayedMinutes>0&&gap>=30?300+Math.min(gap,180):-10000;reason='مرّ '+Math.floor(gap)+' يومًا؛ وقت العودة';}else if(mode==='new'){score+=t?.totalPlayedMinutes? -10000:300;}else {score+=!count&&t?.totalPlayedMinutes>0?250-Math.min(gap,200):!count?50:-200;reason=t?.totalPlayedMinutes?'واصل من آخر نقطة؛ '+(Math.round(t.totalPlayedMinutes/60*10)/10)+' ساعة من Nintendo':reason;}return {game:g,score,reason};}).filter(x=>x.score>-5000).sort((a,b)=>b.score-a.score||a.game.title.localeCompare(b.game.title)).slice(0,6);
}
function weekStart(d){const wd=new Date(d+'T00:00:00Z').getUTCDay();return dayShift(d,-((wd+6)%7));}
const hash=t=>[...t].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
export function createBoard(state,period,today=todayKey()){
 const weekly=period==='week',start=weekly?weekStart(today):today.slice(0,7)+'-01',end=weekly?dayShift(start,6):dayShift(dayShift(start,32).slice(0,7)+'-01',-1),key=weekly?'week:'+start:'month:'+start.slice(0,7),items=[];
 const add=(id,type,title,target,stars,gameId='')=>items.push({id:key+':'+id,type,title,target,stars,gameId,unit:['game','minutes','nso'].includes(type)?'دقيقة':type==='days'?'أيام':type==='games'?'ألعاب':'تختيمة'});
 const pool=state.games.filter(g=>g.nintendoKey&&!g.isCollection&&!state.companion?.profiles?.[g.id]?.hidden&&state.companion?.profiles?.[g.id]?.access!=='demo'&&!/\bdemo\b|trial version|体験版|نسخة تجريبية/i.test(g.title)).sort((a,b)=>hash(key+a.id)-hash(key+b.id));const fresh=pool.find(g=>!completions(state,g.id)&&!isNSO(g)),replay=pool.find(g=>completions(state,g.id)>0&&!isNSO(g));
 add('days','days',weekly?'خطوات يوشي':'إيقاع الجزيرة',weekly?(state.journey?.weeklyDays||3):Math.min(12,(state.journey?.weeklyDays||3)*3),2);
 add('time','minutes',weekly?'مغامرة بحجم وقتك':'نجوم الموسم',weekly?Math.min(120,Math.max(30,Math.round(state.profile.monthlyHours*60/4))):state.profile.monthlyHours*60,3);
 if(pool.length>1)add('worlds','games','عبور العوالم',Math.min(weekly?2:4,pool.length),2);
 if(fresh)add('focus','game','ارفع راية: '+fresh.title,weekly?30:90,2,fresh.id);
 if(pool.some(isNSO))add('nso','nso','بوابة Nintendo Classics',weekly?20:60,2);
 if(!weekly){add('finish','finish','راية جديدة: اختم لعبة هذا الشهر',1,4);if(replay)add('replay','replay','عودة البطل: أعد تختيم '+replay.title,1,5,replay.id);}
 return {key,start,end,items};
}
export function prepareJourney(state,today=todayKey()){
 state.journey=cleanJourney(state.journey,new Set(state.games.map(g=>g.id)));const ready=!!state.nintendo?.titles.length;
 for(const period of ['week','month']){const b=createBoard(state,period,today),p=state.journey.plans[b.key];if(!p)state.journey.plans[b.key]={start:b.start,end:b.end,libraryReady:ready,items:b.items};else if(!p.libraryReady&&ready){const existing=new Set(p.items.map(q=>q.id));p.items.push(...b.items.filter(q=>!existing.has(q.id)));p.libraryReady=true;}}
 return state;
}
export function boardFor(state,period,today=todayKey()){const b=createBoard(state,period,today);return state.journey?.plans[b.key]||b;}
export function questValue(state,q,board){const rows=activity(state).filter(r=>r.date>=board.start&&r.date<=board.end);if(q.type==='minutes')return rows.reduce((n,r)=>n+r.minutes,0);if(q.type==='days')return new Set(rows.map(r=>r.date)).size;if(q.type==='games')return new Set(rows.map(r=>r.gameId)).size;if(q.type==='game')return rows.filter(r=>r.gameId===q.gameId).reduce((n,r)=>n+r.minutes,0);if(q.type==='nso')return rows.filter(r=>isNSO(state.games.find(g=>g.id===r.gameId))).reduce((n,r)=>n+r.minutes,0);const ev=events(state).filter(e=>e.date>=board.start&&e.date<=board.end&&(!q.gameId||q.gameId===e.gameId));if(q.type==='finish')return ev.reduce((n,e)=>n+e.count,0);if(q.type==='replay'){const before=events(state).filter(e=>e.gameId===q.gameId&&e.date<board.start).reduce((n,e)=>n+e.count,0);return Math.max(0,before+ev.reduce((n,e)=>n+e.count,0)-Math.max(1,before));}return 0;}
export function startRun(state,id,today=todayKey(),runId='run-'+Date.now()){
 const g=state.games.find(g=>g.id===id);if(!g||g.isCollection||isNSO(g)&&g.nintendoKey)throw Error('تطبيق NSO أو المجموعة لا يمثل لعبة واحدة؛ اختر لعبة كلاسيكية محددة.');
 state.journey=state.journey||defaults();if(state.journey.runs.some(r=>r.gameId===id&&r.status==='active'))throw Error('للعبة رحلة نشطة بالفعل.');state.journey.runs.push({id:runId,gameId:id,startedAt:today,endedAt:'',status:'active',baselineMinutes:nintendoTitle(state,g)?.totalPlayedMinutes||0,minutes:null,source:'player-declared',timeSource:'unavailable'});return state;
}
export function finishRun(state,id,kind='beaten',today=todayKey()){
 const r=state.journey?.runs.find(r=>r.id===id&&r.status==='active');if(!r||!['beaten','complete','abandoned'].includes(kind))throw Error('الرحلة غير متاحة.');if(today<r.startedAt)throw Error('تاريخ النهاية يسبق البداية.');

 const g=state.games.find(g=>g.id===r.gameId),t=nintendoTitle(state,g);r.status=kind==='complete'?'beaten':kind;r.endedAt=today;r.minutes=t?Math.max(0,t.totalPlayedMinutes-r.baselineMinutes):null;r.timeSource=t?'nintendo-delta':'unavailable';return state;
}
export function linkLegacy(state,sourceId,targetId){
 const source=state.games.find(g=>g.id===sourceId),target=state.games.find(g=>g.id===targetId);if(!source?.legacyId||source.nintendoKey||!target?.nintendoKey||target.legacyId)throw Error('اختر سجلًا قديمًا غير مربوط وعنوان حساب لا يحمل سجلًا قديمًا آخر.');
 target.legacyId=source.legacyId;target.completionHistory=mergeCompletionHistory(target.completionHistory,source.completionHistory);target.metadata=source.metadata;target.fallbackCover=source.fallbackCover||source.cover;target.ownership=source.ownership;target.ownershipConfirmed=true;target.parentLegacyId=source.parentLegacyId;target.isCollection=source.isCollection;
 const ranks={backlog:0,paused:0,wishlist:0,playing:1,beaten:2,complete:3};if(ranks[source.status]>ranks[target.status])target.status=source.status;target.completedAt=[source.completedAt,target.completedAt].filter(Boolean).sort().pop()||'';
 if(state.companion)for(const key of ['profiles','guides']){if(state.companion[key]?.[sourceId]&&!state.companion[key][targetId])state.companion[key][targetId]=state.companion[key][sourceId];delete state.companion[key]?.[sourceId];}
 state.games=state.games.filter(g=>g.id!==sourceId);state.sessions=state.sessions.filter(r=>r.gameId!==sourceId);if(state.journey){for(const r of state.journey.records||[])if(r.gameId===sourceId)r.gameId=targetId;for(const k of ['focus','favorites'])state.journey[k]=[...new Set(state.journey[k].map(id=>id===sourceId?targetId:id))];for(const r of state.journey.runs)if(r.gameId===sourceId)r.gameId=targetId;for(const p of Object.values(state.journey.plans))for(const q of p.items)if(q.gameId===sourceId)q.gameId=targetId;}for(const p of Object.values(state.challenges||{}))for(const q of p.items)if(q.gameId===sourceId)q.gameId=targetId;return state;
}
export function matchScore(a,b){const x=titleKey(a),y=titleKey(b);if(x===y)return 100;if(x.length>8&&y.includes(x)||y.length>8&&x.includes(y))return 80;const aw=new Set(a.toLowerCase().split(/\W+/).filter(w=>w.length>2)),bw=new Set(b.toLowerCase().split(/\W+/).filter(w=>w.length>2));return [...aw].filter(w=>bw.has(w)).length/Math.max(1,aw.size,bw.size)*60;}
export function review(state,year=todayKey().slice(0,4)){
 const rows=activity(state).filter(r=>r.date.startsWith(year)),byGame=new Map(),byDay=new Map(),months=Array(12).fill(0),devices={'Switch':0,'Switch 2':0};for(const r of rows){byGame.set(r.gameId,(byGame.get(r.gameId)||0)+r.minutes);byDay.set(r.date,(byDay.get(r.date)||0)+r.minutes);months[Number(r.date.slice(5,7))-1]+=r.minutes;devices[hardwareOn(state,state.games.find(g=>g.id===r.gameId),r.date)]+=r.minutes;}
 return {rows,total:rows.reduce((n,r)=>n+r.minutes,0),activeDays:byDay.size,byDay,top:[...byGame].sort((a,b)=>b[1]-a[1]),months,devices,streak:streaks(rows,year+'-12-31'),completions:events(state).filter(e=>e.date.startsWith(year)).reduce((n,e)=>n+e.count,0)};
}
