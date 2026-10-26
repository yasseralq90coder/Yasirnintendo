// Personal local launcher. Nintendo credentials are never embedded in this file.
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const windows=process.platform==='win32';
const home=process.env.LOCALAPPDATA||process.env.XDG_DATA_HOME||join(process.env.HOME||root,'.local','share');
const folder=join(home,'YasirNintendo');
const secretPath=join(folder,windows?'bridge-secrets.dpapi':'bridge-secrets.json');
const powershell=(command,input)=>execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input,encoding:'utf8',windowsHide:true,maxBuffer:16384});
function protect(text){return powershell("Add-Type -AssemblyName System.Security; $bytes=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))",text).trim();}
function unprotect(text){return powershell("Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()); [Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))",text).trim();}
if(Number(process.versions.node.split('.')[0])<22){console.error('Node.js 22 or newer is required. Install Node.js LTS from https://nodejs.org/ then run Start-Windows.cmd again.');process.exit(1);}
await mkdir(folder,{recursive:true,mode:0o700});
let secrets;
try{const text=await readFile(secretPath,'utf8');secrets=JSON.parse(windows?unprotect(text):text);}
catch(error){
 if(error.code!=='ENOENT'){console.error('Cannot open existing private configuration. It was not overwritten. Use the same Windows account that created it.');process.exit(1);}
 secrets={bridgeKey:randomBytes(32).toString('hex'),vaultKey:randomBytes(32).toString('base64')};
 const text=JSON.stringify(secrets);await writeFile(secretPath,windows?protect(text):text,{mode:0o600,flag:'wx'});
}
if(typeof secrets.bridgeKey!=='string'||secrets.bridgeKey.length<32||Buffer.from(secrets.vaultKey||'','base64').length!==32)throw Error('Invalid private configuration; preserved without overwriting.');
const origin='https://yasseralq90coder.github.io';
const url=origin+'/Yasirnintendo/#settings';
const env={...process.env,BRIDGE_KEY:secrets.bridgeKey,VAULT_KEY:secrets.vaultKey,VAULT_PATH:join(folder,'vault.json'),APP_ORIGIN:origin,PORT:'8787'};
async function status(){const r=await fetch('http://127.0.0.1:8787/status',{headers:{Origin:origin,Authorization:'Bearer '+secrets.bridgeKey},signal:AbortSignal.timeout(1000)});if(!r.ok)throw Error('bridge_unavailable');return r.json();}
let child=null,existing=false;
try{await status();existing=true;}catch{}
if(!existing){child=spawn(process.execPath,[join(root,'server','start.js')],{cwd:root,env,stdio:['ignore','inherit','inherit']});
 let ready=false;
 for(let i=0;i<40;i++){try{await status();ready=true;break;}catch{}if(child.exitCode!==null)break;await new Promise(r=>setTimeout(r,250));}
 if(!ready){console.error('The local bridge could not start. Port 8787 may already be in use. No private configuration was deleted.');child.kill();process.exit(1);}
}
if(windows){try{powershell('Set-Clipboard -Value ([Console]::In.ReadToEnd())',secrets.bridgeKey);console.log('Your private bridge key is copied to the clipboard. Paste it ONLY into your website bridge settings.');}catch{console.log('Clipboard unavailable. Use the manual setup instructions in server/README.md.');}}
else console.log('Bridge started. Use manual environment setup in server/README.md to access your configured key.');
console.log('Open Settings > Nintendo Store. Address: http://127.0.0.1:8787');
console.log('Paste the copied key, click Connect, then Link Nintendo Account. Keep this window open for periodic sync.');
console.log('Nintendo login happens on Nintendo itself. Never paste your Nintendo password into the tracker.');
try{
 const opener=windows?spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,stdio:'ignore'}):spawn(process.platform==='darwin'?'open':'xdg-open',[url],{detached:true,stdio:'ignore'});
 opener.on('error',()=>console.log('Open your website manually: '+url));opener.unref();
}catch{console.log('Open your website manually: '+url);}
if(child){process.on('SIGINT',()=>{child.kill();process.exit(0);});process.on('SIGTERM',()=>{child.kill();process.exit(0);});child.on('exit',code=>{process.exitCode=code||0;});}
