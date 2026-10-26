import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
export const CLIENT='5c38e31cd085304b', REDIRECT=`npf${CLIENT}://auth`;
const ACCOUNTS='https://accounts.nintendo.com/connect/1.0.0', API='https://app-api.znej.nintendo.com/api/v2.0/users/me/play_histories';
export function loginAttempt(now=Date.now()){
 const state=randomBytes(36).toString('base64url'),verifier=randomBytes(32).toString('base64url');
 const params=new URLSearchParams({client_id:CLIENT,redirect_uri:REDIRECT,scope:'openid user user.mii user.email user.links[].id',response_type:'session_token_code',session_token_code_challenge:createHash('sha256').update(verifier).digest('base64url'),session_token_code_challenge_method:'S256',state,theme:'login_form'});
 return {state,verifier,expires:now+10*60e3,url:ACCOUNTS+'/authorize?'+params};
}
export function callbackCode(callback,attempt,now=Date.now()){
 const u=new URL(callback),p=new URLSearchParams(u.hash.slice(1));
 const state=Buffer.from(p.get('state')||''),expected=Buffer.from(attempt?.state||'');
 if(!attempt||attempt.expires<now||u.protocol!==`npf${CLIENT}:`||u.hostname!=='auth'||state.length!==expected.length||!timingSafeEqual(state,expected)||!p.get('session_token_code'))throw Error('invalid_callback');
 return p.get('session_token_code');
}
export const pause=ms=>new Promise(r=>setTimeout(r,ms));
export class Nintendo {
 constructor(sessionToken,{fetcher=fetch,delay=pause}={}){this.session=sessionToken;this.fetcher=fetcher;this.delay=delay;this.nextRequest=0;this.token=null;}
 async request(url,options={}){
  for(let attempt=0;attempt<3;attempt++){
   await this.delay(Math.max(0,this.nextRequest-Date.now()));this.nextRequest=Date.now()+350;
   const r=await this.fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
   if(r.status===429){const header=r.headers.get('retry-after');const wait=/^\d+$/.test(header||'')?Number(header)*1000:Date.parse(header)-Date.now();await this.delay(Math.min(300000,Math.max(1000,Number.isFinite(wait)?wait:2000*2**attempt)));continue;}
   if(!r.ok){const e=Error(r.status===401||r.status===403?'nintendo_auth_required':'nintendo_request_failed');e.status=r.status;throw e;}
   return r.json();
  }
  throw Error('nintendo_rate_limited');
 }
 async exchange(code,verifier){const d=await this.request(ACCOUNTS+'/api/session_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT,session_token_code:code,session_token_code_verifier:verifier}).toString()});if(typeof d.session_token!=='string'||!d.session_token)throw Error('missing_session_token');this.session=d.session_token;return this.session;}
 async access(){if(this.token?.expires>Date.now()+60000)return this.token;if(!this.session)throw Error('nintendo_auth_required');const d=await this.request(ACCOUNTS+'/api/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CLIENT,session_token:this.session,grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token'})});if(!d.access_token)throw Error('missing_access_token');this.token={access:d.access_token,id:d.id_token,expires:Date.now()+Math.max(0,Number(d.expires_in)||0)*1000};return this.token;}
 async api(url){
  const token=await this.access();const call=value=>this.request(url,{headers:{Authorization:'Bearer '+value,Accept:'application/json','Gentry-Locale':'en-GB','User-Agent':'com.nintendo.znej/3.0.3 (iOS/26.0.1)'}});
  try{return await call(token.access);}catch(e){if(![401,403].includes(e.status))throw e;if(token.id){try{return await call(token.id);}catch(x){if(![401,403].includes(x.status))throw x;}}this.token=null;const fresh=await this.access();return call(fresh.access);}
 }
 async sync(previous={titles:[]},full=false){
  const list=await this.api(API);if(!Array.isArray(list.playHistories))throw Error('invalid_history_response');
  // A newly empty response never destroys a previously populated snapshot.
  if(!list.playHistories.length&&previous.titles?.length)throw Error('unexpected_empty_history');
  const supported=list.playHistories.filter(t=>['HAC','BEE'].includes(t.platform||t.deviceType));
  if(!supported.length&&previous.titles?.length)throw Error('no_supported_titles_returned');
  const now=new Date().toISOString(),titles=[];
  for(const raw of supported){
   const title=normalTitle(raw),old=previous.titles?.find(x=>x.titleId===title.titleId&&x.platform===title.platform);
   if(old&&!full&&old.historyComplete&&old.totalPlayedMinutes===title.totalPlayedMinutes&&old.lastPlayedAt===title.lastPlayedAt&&old.lastUpdatedAt===title.lastUpdatedAt){titles.push({...title,days:old.days,historyComplete:true,historyCheckedAt:old.historyCheckedAt});continue;}
   const days=new Map();let complete=false;
   try{
    for(let offset=0;offset<160000;offset+=16){
     const data=await this.api(API+'/game_titles/'+encodeURIComponent(title.titleId)+'?limit=16&offset='+offset);
     if(!Array.isArray(data.playedDays))throw Error('invalid_daily_history');
     for(const rawDay of data.playedDays){const d=normalDay(rawDay);days.set(d.date,d);}
     if(data.playedDays.length<16){complete=true;break;}
    }
   }catch{complete=false;}
   titles.push({...title,days:complete?[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)):(old?.days||[]),historyComplete:complete,historyCheckedAt:now});
  }
  return {version:1,excludedPlatforms:list.playHistories.length-supported.length,accountId:previous.accountId||randomBytes(16).toString('hex'),syncedAt:now,lastFullSync:full?now:previous.lastFullSync||'',titles};
 }
}
export function normalTitle(r){
 const platform=r.platform||r.deviceType;if(!r||typeof r.titleId!=='string'||!r.titleId||typeof r.titleName!=='string'||!['HAC','BEE'].includes(platform)||!Number.isInteger(r.totalPlayedMinutes)||r.totalPlayedMinutes<0)throw Error('unsupported_or_invalid_title');
 return {titleId:r.titleId,titleName:r.titleName,platform,imageUrl:typeof r.imageUrl==='string'?r.imageUrl:'',totalPlayedMinutes:r.totalPlayedMinutes,totalPlayedDays:Number.isInteger(r.totalPlayedDays)?r.totalPlayedDays:0,firstPlayedAt:r.firstPlayedAt||'',lastPlayedAt:r.lastPlayedAt||'',lastUpdatedAt:r.lastUpdatedAt||''};
}
export function normalDay(r){const date=String(r.playedDate||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(r.minutesPlayed)||r.minutesPlayed<0||isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('invalid_daily_record');return {date,minutes:r.minutesPlayed};}
