import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
export function seal(data,key){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv),body=Buffer.concat([c.update(JSON.stringify(data),'utf8'),c.final()]);return JSON.stringify({v:1,iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),data:body.toString('base64')});}
export function unseal(text,key){const r=JSON.parse(text);if(r.v!==1)throw Error('vault_version');const d=createDecipheriv('aes-256-gcm',key,Buffer.from(r.iv,'base64'));d.setAuthTag(Buffer.from(r.tag,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(r.data,'base64')),d.final()]).toString('utf8'));}
export async function readVault(path,key){try{return unseal(await readFile(path,'utf8'),key);}catch(e){if(e.code==='ENOENT')return {};throw Error('vault_unreadable');}}
export async function saveVault(path,key,data){await mkdir(dirname(path),{recursive:true,mode:0o700});await writeFile(path+'.tmp',seal(data,key),{mode:0o600});await rename(path+'.tmp',path);}
