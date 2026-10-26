import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {resolve} from 'node:path';
import {Nintendo,loginAttempt,callbackCode} from './nintendo.js';
import {readVault,saveVault} from './vault.js';
const origin=process.env.APP_ORIGIN||'https://yasseralq90coder.github.io';
const apiKey=process.env.BRIDGE_KEY||'',key=Buffer.from(process.env.VAULT_KEY||'','base64');
if(apiKey.length<32||key.length!==32)throw Error('Set BRIDGE_KEY (32+ chars) and VAULT_KEY (32 bytes in base64). See server/README.md.');
const path=resolve(process.env.VAULT_PATH||'server/private/vault.json');
let vault=await readVault(path,key),client=new Nintendo(vault.session),pending=null,running=null,lastError='',lastAttempt=0;
async function sync(full=false){
 if(running)return running;
 running=(async()=>{lastAttempt=Date.now();try{const snapshot=await client.sync(vault.snapshot||{titles:[]},full);const next={...vault,snapshot};await saveVault(path,key,next);vault=next;lastError='';}catch(e){lastError=e.message;throw e;}finally{running=null;}})();return running;
}
const interval=setInterval(()=>{if(vault.session&&!running){const full=!vault.snapshot?.lastFullSync||Date.now()-Date.parse(vault.snapshot.lastFullSync)>7*864e5;sync(full).catch(()=>{});}},6*3600e3);interval.unref();
function authorised(value){const a=Buffer.from(value||''),b=Buffer.from('Bearer '+apiKey);return a.length===b.length&&timingSafeEqual(a,b);}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.headers.origin!==origin){res.writeHead(403);res.end();return;}
 res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
 res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Private-Network','true');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 res.setHeader('Content-Type','application/json; charset=utf-8');
 const send=(code,data)=>{res.writeHead(code);res.end(JSON.stringify(data));};
 if(!authorised(req.headers.authorization)){send(401,{error:'bridge_key_required'});return;}
 const route=new URL(req.url,'http://localhost').pathname;
 try{
  let body={};if(req.method==='POST'){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>16384)throw Error('request_too_large');}body=text?JSON.parse(text):{};}
  if(req.method==='GET'&&route==='/status'){send(200,{linked:!!vault.session,syncing:!!running,lastError,lastAttempt,syncedAt:vault.snapshot?.syncedAt||'',titles:vault.snapshot?.titles?.length||0});return;}
  if(req.method==='POST'&&route==='/auth/start'){if(vault.session)throw Error('disconnect_before_linking_another_account');pending=loginAttempt();send(200,{loginUrl:pending.url,expiresAt:pending.expires});return;}
  if(req.method==='POST'&&route==='/auth/complete'){
   const attempt=pending;pending=null;const code=callbackCode(body.callback,attempt);const fresh=new Nintendo();const session=await fresh.exchange(code,attempt.verifier);
   const next={session,snapshot:undefined};await saveVault(path,key,next);vault=next;client=fresh;send(200,{linked:true});return;
  }
  if(req.method==='POST'&&route==='/sync'){if(Date.now()-lastAttempt<60000&&!running){send(429,{error:'wait_one_minute'});return;}sync(body.full===true).catch(()=>{});send(202,{syncing:true});return;}
  if(req.method==='GET'&&route==='/snapshot'){if(!vault.snapshot){send(404,{error:'no_successful_sync'});return;}send(200,vault.snapshot);return;}
  if(req.method==='POST'&&route==='/disconnect'){if(running)throw Error('sync_in_progress');await saveVault(path,key,{});vault={};client=new Nintendo();pending=null;lastError='';send(200,{linked:false});return;}
  send(404,{error:'not_found'});
 }catch(e){send(400,{error:['invalid_callback','nintendo_auth_required','disconnect_before_linking_another_account','sync_in_progress'].includes(e.message)?e.message:'operation_failed'});}
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||8787),'127.0.0.1',()=>console.log('Nintendo bridge listening on loopback. No Nintendo tokens are logged.'));
