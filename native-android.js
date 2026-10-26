export const isAndroid=typeof window!=='undefined'&&typeof window.AndroidBridge?.request==='function';
const pending=new Map();
if(isAndroid)window.__yasirNativeResult=(id,result)=>{const entry=pending.get(id);if(!entry)return;pending.delete(id);clearTimeout(entry.timer);if(result.error)entry.reject(new Error(result.error));else entry.resolve(result.data);};
export function nativeRequest(path,body={}){
 if(!isAndroid)return Promise.reject(new Error('Android only'));
 return new Promise((resolve,reject)=>{const id=crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join("-");const timer=setTimeout(()=>{pending.delete(id);reject(new Error('انتهت مهلة الطلب؛ تحقق من الحالة قبل إعادة المحاولة.'));},30*60*1000);pending.set(id,{resolve,reject,timer});try{window.AndroidBridge.request(id,path,JSON.stringify(body));}catch(e){clearTimeout(timer);pending.delete(id);reject(e);}});
}
