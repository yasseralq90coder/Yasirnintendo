import {validateSnapshot,nintendoTitle,datedActivity} from './nintendo-sync.js';
export const SCHEMA = 1;
export const STATUSES = {backlog:'لم أبدأ',playing:'ألعب الآن',beaten:'ختمت القصة',complete:'مكتملة 100٪',paused:'متوقفة',wishlist:'أتمناها'};
export const OWNERS = {physical:'فيزكال',digital:'رقمي',both:'فيزكال + رقمي',nso:'اشتراك NSO'};
export const GENRES = ['منصات','مغامرات','أكشن','تقمص أدوار','سباقات','ألغاز','محاكاة','رياضة','استراتيجية','أخرى'];
export const PLATFORMS = ['Switch 2','Switch','NES','SNES','Game Boy','Nintendo 64','Game Boy Advance','GameCube','SEGA Genesis','Virtual Boy'];
export const SOURCES = {manual:'إدخال يدوي',timer:'مؤقت محلي','nintendo-manual':'منقول من نينتندو',import:'ملف مستورد'};
export const uid = () => globalThis.crypto.randomUUID?.() || 'id-'+Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-');
export const localDay = (date=new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const monthKey = (date=new Date()) => localDay(date).slice(0,7);
export const blankState = () => ({schema:SCHEMA,profile:{name:'ياسر',subscription:'none',monthlyHours:12},games:[],sessions:[],challenges:{},timer:null});
export const finished = g => ['beaten','complete'].includes(g.status);
export function minutes(state,id){return nintendoTitle(state,state.games.find(g=>g.id===id))?.totalPlayedMinutes||0;}
export function totals(state){
 const games=state.games.filter(g=>g.status!=='wishlist');
 const total=games.reduce((a,g)=>a+minutes(state,g.id),0), beaten=games.filter(finished).length;
 const xp=Math.floor(total/60)*20+beaten*300+games.filter(g=>g.status==='complete').length*200+new Set(games.filter(g=>minutes(state,g.id)>0).map(g=>g.genre)).size*50;
 const level=Math.floor((Math.sqrt(1+8*xp/150)-1)/2)+1;
 const floor=150*(level-1)*level/2, ceiling=150*level*(level+1)/2;
 return {total,beaten,count:games.length,xp,level,floor,ceiling,progress:(xp-floor)/(ceiling-floor)*100};
}
export function badges(state){
 const t=totals(state), genres=g=>state.games.filter(x=>x.genre===g).reduce((a,x)=>a+minutes(state,x.id),0)/60;
 const done=state.games.filter(finished), nso=done.filter(g=>g.ownership==='nso').length;
 return [
 ['mushroom','🍄','فطر البداية','سجّل أول ساعة لعب',t.total/60,1],
 ['star','⭐','نجمة ماريو','العب 10 ساعات',t.total/60,10],
 ['moon','🌙','قمر الأوديسي','العب 50 ساعة',t.total/60,50],
 ['triforce','🔺','حكمة الترايفورس','العب 100 ساعة',t.total/60,100],
 ['flag','🏁','راية المملكة','اختم أول لعبة',t.beaten,1],
 ['crown','👑','تاج المملكة','اختم 10 ألعاب',t.beaten,10],
 ['diamond','💎','جامع الجواهر','أكمل 3 ألعاب بنسبة 100٪',state.games.filter(g=>g.status==='complete').length,3],
 ['boots','👟','قفزة ماريو','10 ساعات في ألعاب المنصات',genres('منصات'),10],
 ['sword','🗡️','رحّالة هايرول','20 ساعة في ألعاب المغامرات',genres('مغامرات'),20],
 ['kart','🏎️','سائق المشروم','10 ساعات في السباقات',genres('سباقات'),10],
 ['samus','🚀','مهمة ساموس','15 ساعة في ألعاب الأكشن',genres('أكشن'),15],
 ['pokemon','🔴','رحلة المدرّب','20 ساعة في ألعاب تقمص الأدوار',genres('تقمص أدوار'),20],
 ['kirby','🌸','فضول كيربي','جرّب 5 أنواع ألعاب',new Set(state.games.filter(g=>minutes(state,g.id)>0).map(g=>g.genre)).size,5],
 ['retro','🕹️','بوابة الزمن','اختم 3 ألعاب NSO',nso,3],
 ['cube','🧊','كنز المكعب','اختم لعبة GameCube',done.filter(g=>g.platform==='GameCube').length,1],
 ['island','🏝️','حياة الجزيرة','10 ساعات في المحاكاة',genres('محاكاة'),10]
 ].map(([id,icon,name,description,value,target])=>({id,icon,name,description,value,target,unlocked:value>=target}));
}
export function eligible(g,profile){return g.status!=='wishlist' && (g.ownership!=='nso'||profile.subscription==='expansion'||(profile.subscription==='standard'&&g.tier==='standard'));}
function hash(s){return [...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);}
export function generateChallenges(state,catalog,month=monthKey()){
 const available=state.games.filter(g=>eligible(g,state.profile));
 const pool=available.filter(g=>!finished(g)).sort((a,b)=>hash(month+a.id)-hash(month+b.id));
 const nso=pool.find(g=>g.ownership==='nso'); const main=pool.find(g=>g.ownership!=='nso');
 const list=[{id:'hours',kind:'hours',title:'رحلة النجوم',description:'دقائق اللعب من Nintendo لهذا الشهر',target:state.profile.monthlyHours*60}];
 if(main)list.push({id:'finish',kind:'finish',title:'راية جديدة',description:'اختم '+main.title,target:1,gameId:main.id});
 if(nso)list.push({id:'retro',kind:'finish',title:'رحلة عبر الزمن',description:'اختم '+nso.title,target:1,gameId:nso.id});

 if(available.length>1)list.push({id:'variety',kind:'variety',title:'جولة في العوالم',description:'العب أنواعًا مختلفة هذا الشهر',target:Math.min(3,new Set(available.map(g=>g.genre)).size)});
 return {month,createdAt:new Date().toISOString(),items:list};
}
export function challengeValue(ch,state,month){
 const sessions=datedActivity(state).filter(s=>s.date.startsWith(month));
 if(ch.kind==='hours')return sessions.reduce((a,s)=>a+s.minutes,0);
 if(ch.kind==='finish'){const g=state.games.find(g=>g.id===ch.gameId);return g&&finished(g)&&g.completedAt?.startsWith(month)?1:0;}
 if(ch.kind==='discover'){const ids=state.games.filter(g=>g.catalogId===ch.catalogId).map(g=>g.id);return sessions.filter(s=>ids.includes(s.gameId)).reduce((a,s)=>a+s.minutes,0);}
 if(ch.kind==='variety')return new Set(sessions.map(s=>state.games.find(g=>g.id===s.gameId)?.genre).filter(Boolean)).size;
 return 0;
}
export function safeURL(value,image=false){try{const u=new URL(value); const ok=['nintendo.com','nintendo.net','nintendo.co.jp','nintendo.com.au','nintendo.co.uk','nintendo.sa'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));return u.protocol==='https:'&&ok ? u.href : '';}catch{return '';}}
export function safeCover(value){if(typeof value==='string'&&value.length<=500000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return value;if(typeof value==='string'&&/^\.\/assets\/library\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(value))return value;return safeURL(value,true);}
function safeHistory(value){if(!Array.isArray(value))return [];if(value.length>1000)throw new Error('سجل التختيمات أكبر من الحد المدعوم.');const seen=new Set();return value.map(p=>{if(!p||typeof p.id!=='string'||p.id.length>150||seen.has(p.id)||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(p.minutes)||p.minutes<0||p.minutes>6000000||!Number.isInteger(p.count)||p.count<1||p.count>1000||!['beaten','complete'].includes(p.kind)||p.source!=='legacy-json')throw new Error('سجل تختيم مستورد غير صالح.');seen.add(p.id);return {id:p.id,date:p.date,minutes:p.minutes,count:p.count,kind:p.kind,source:'legacy-json'};});}
const fail=m=>{throw new Error(m);};
const str=(x,max=500)=>typeof x==='string'&&x.length<=max;
const num=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
export function validateState(input){
 if(!input||input.schema!==SCHEMA||!Array.isArray(input.games)||!Array.isArray(input.sessions))fail('الملف ليس نسخة متوافقة (schema: 1).');
 if(input.games.length>10000||input.sessions.length>100000)fail('الملف يتجاوز الحدود المدعومة.');
 const p=input.profile;
 if(!p||!str(p.name,80)||!['none','standard','expansion'].includes(p.subscription)||!num(p.monthlyHours,1,200))fail('إعدادات الحساب غير صالحة.');
 const ids=new Set();
 const dateOK=d=>str(d,10)&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d&&d<=localDay();
 const games=input.games.map(g=>{
  if(!g||!str(g.id,100)||!g.id||ids.has(g.id)||!str(g.title,200)||!g.title.trim()||!Object.hasOwn(STATUSES,g.status)||!Object.hasOwn(OWNERS,g.ownership)||!GENRES.includes(g.genre)||!PLATFORMS.includes(g.platform)||!num(g.baseMinutes,0,6000000)||(!num(g.rating,0,5)||!Number.isInteger(g.rating))||!num(g.progress,0,100)||!str(g.notes||'',4000))fail('بيانات إحدى الألعاب غير صالحة أو متكررة.');
  if(g.ownership==='nso'&&!['standard','expansion'].includes(g.tier))fail('حدد فئة اشتراك لعبة NSO.');
  if(g.completedAt&&!dateOK(g.completedAt))fail('تاريخ التختيم غير صالح.');
  ids.add(g.id);
  return {legacyId:str(g.legacyId,100)?g.legacyId:'',fallbackCover:safeCover(g.fallbackCover),metadata:g.metadata&&g.metadata.source==='legacy-json'?{source:'legacy-json',description:str(g.metadata.description,20000)?g.metadata.description:'',developer:str(g.metadata.developer,500)?g.metadata.developer:'',year:str(g.metadata.year,20)?g.metadata.year:'',originalGenre:str(g.metadata.originalGenre,500)?g.metadata.originalGenre:''}:null,completionHistory:safeHistory(g.completionHistory),isCollection:g.isCollection===true,parentLegacyId:str(g.parentLegacyId,100)?g.parentLegacyId:'',nintendoKey:str(g.nintendoKey,310)?g.nintendoKey:'',ownershipConfirmed:g.ownershipConfirmed!==false,id:g.id,catalogId:str(g.catalogId,200)?g.catalogId:'',title:g.title,platform:g.platform,genre:g.genre,ownership:g.ownership,status:g.status,baseMinutes:g.baseMinutes,baseSource:Object.hasOwn(SOURCES,g.baseSource)?g.baseSource:'import',rating:g.rating,progress:g.progress,notes:g.notes||'',completedAt:g.completedAt||'',cover:safeCover(g.cover),sourceUrl:safeURL(g.sourceUrl),tier:['standard','expansion'].includes(g.tier)?g.tier:'owned'};
 });
 const sessionIds=new Set();
 const sessions=input.sessions.map(s=>{if(!s||!str(s.id,100)||!s.id||sessionIds.has(s.id)||!ids.has(s.gameId)||!num(s.minutes,1,1440)||!dateOK(s.date)||!str(s.note||'',2000))fail('جلسة غير صالحة: تحقق من التاريخ والمدة واللعبة.');sessionIds.add(s.id);return {id:s.id,gameId:s.gameId,date:s.date,minutes:s.minutes,note:s.note||'',source:Object.hasOwn(SOURCES,s.source)?s.source:'import'};});
 const challenges={};
 if(input.challenges&&typeof input.challenges==='object')for(const [key,plan]of Object.entries(input.challenges)){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)||!plan||!Array.isArray(plan.items)||plan.items.length>10)fail('خطة شهرية غير صالحة.');
  challenges[key]={month:key,createdAt:str(plan.createdAt,50)?plan.createdAt:'',items:plan.items.map(c=>{
   if(!c||!str(c.id,100)||!str(c.title,200)||!str(c.description,500)||!['hours','finish','discover','variety'].includes(c.kind)||!num(c.target,1,12000))fail('تحدٍ غير صالح.');
   return {id:c.id,title:c.title,description:c.description,kind:c.kind,target:c.target,gameId:str(c.gameId,100)?c.gameId:undefined,catalogId:str(c.catalogId,200)?c.catalogId:undefined};
  })};
 }
 let timer=null;
 if(input.timer){if(!ids.has(input.timer.gameId)||!num(input.timer.startedAt,0,Date.now()))fail('المؤقت غير صالح.');timer={gameId:input.timer.gameId,startedAt:input.timer.startedAt};}
 return {schema:SCHEMA,profile:{name:p.name,subscription:p.subscription,monthlyHours:p.monthlyHours},games,sessions,challenges,timer:null,appliedSeeds:Array.isArray(input.appliedSeeds)?input.appliedSeeds.filter(x=>str(x,100)).slice(0,100):[],...(input.nintendo?{nintendo:validateSnapshot(input.nintendo)}:{})};
}
export function parseCSV(text){
 const rows=[];let row=[],value='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(Boolean))rows.push(row);row=[];value='';}else value+=c;}
 if(quoted)fail('علامات الاقتباس في CSV غير مكتملة.');row.push(value);if(row.some(Boolean))rows.push(row);
 const headers=(rows.shift()||[]).map(x=>x.trim());if(!headers.includes('title'))fail('CSV يحتاج عمود title.');
 return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
}
export function importedGames(rows){return rows.map(r=>({id:uid(),catalogId:'',title:r.title,platform:r.platform||'Switch',genre:r.genre||'أخرى',ownership:r.ownership||'digital',status:r.status||'backlog',baseMinutes:Math.round(Number(r.hours||0)*60),baseSource:'import',rating:Number(r.rating||0),progress:Number(r.progress||0),notes:r.notes||'',completedAt:r.completedAt||'',cover:r.cover||'',sourceUrl:r.sourceUrl||'',tier:r.tier||'owned'}));}
export function mergeGames(state,incoming){
 const keys=new Set(state.games.map(g=>g.title.trim().toLowerCase()+'|'+g.platform));let added=0;
 const next=structuredClone(state);
 for(const g of incoming){const key=g.title.trim().toLowerCase()+'|'+g.platform;if(!keys.has(key)){next.games.push(g);keys.add(key);added++;}}
 return {state:validateState(next),added};
}
