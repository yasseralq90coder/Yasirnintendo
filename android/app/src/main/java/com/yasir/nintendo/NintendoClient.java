package com.yasir.nintendo;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.json.*;
final class NintendoClient {
 static final String CLIENT="5c38e31cd085304b",REDIRECT="npf"+CLIENT+"://auth",ACCOUNTS="https://accounts.nintendo.com/connect/1.0.0",API="https://app-api.znej.nintendo.com/api/v2.0/users/me/play_histories";
 private final SecureVault vault;private JSONObject data;private String access="",idToken="";private long expiry=0,nextRequest=0,lastAttempt=0;
 private volatile boolean syncing=false;private volatile String lastError="";
 NintendoClient(SecureVault vault) throws Exception{this.vault=vault;data=vault.read();}
 static String enc(String s){try{return URLEncoder.encode(s,"UTF-8");}catch(Exception e){throw new IllegalArgumentException();}}
 static String random(int n){byte[] b=new byte[n];new SecureRandom().nextBytes(b);return Base64.getUrlEncoder().withoutPadding().encodeToString(b);}
 static String now(){return Instant.now().toString();}
 static Map<String,String> fragment(String callback) throws Exception {
  URI u=new URI(callback.trim());if(!("npf"+CLIENT).equals(u.getScheme())||!"auth".equals(u.getHost()))throw new Exception("invalid_callback");
  Map<String,String> out=new HashMap<>();String f=u.getRawFragment();if(f==null)throw new Exception("invalid_callback");
  for(String part:f.split("&")){String[] a=part.split("=",2);if(a.length==2)out.put(URLDecoder.decode(a[0],"UTF-8"),URLDecoder.decode(a[1],"UTF-8"));}return out;
 }
 static String verifiedCode(String callback,JSONObject pending,long time) throws Exception {
  Map<String,String> p=fragment(callback);String state=p.getOrDefault("state","");String expected=pending.optString("state");String code=p.getOrDefault("session_token_code","");
  if(time>pending.optLong("expires")||state.isEmpty()||!MessageDigest.isEqual(state.getBytes(StandardCharsets.UTF_8),expected.getBytes(StandardCharsets.UTF_8))||code.isEmpty())throw new Exception("invalid_callback");return code;
 }
 JSONObject start() throws Exception {
  if(!data.optString("session").isEmpty())throw new Exception("disconnect_before_linking_another_account");
  String verifier=random(32),state=random(36),challenge=Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.UTF_8)));
  JSONObject pending=new JSONObject().put("verifier",verifier).put("state",state).put("expires",System.currentTimeMillis()+600000);
  JSONObject next=new JSONObject(data.toString()).put("pending",pending);vault.write(next);data=next;
  String url=ACCOUNTS+"/authorize?client_id="+CLIENT+"&redirect_uri="+enc(REDIRECT)+"&scope="+enc("openid user user.mii user.email user.links[].id")+"&response_type=session_token_code&session_token_code_challenge="+challenge+"&session_token_code_challenge_method=S256&state="+state+"&theme=login_form";
  return new JSONObject().put("loginUrl",url).put("expiresAt",pending.getLong("expires"));
 }
 void complete(String callback) throws Exception {
  JSONObject pending=data.optJSONObject("pending");if(pending==null)throw new Exception("invalid_callback");
  String code=verifiedCode(callback,pending,System.currentTimeMillis());
  JSONObject next=new JSONObject(data.toString());next.remove("pending");vault.write(next);data=next;
  String form="client_id="+CLIENT+"&session_token_code="+enc(code)+"&session_token_code_verifier="+enc(pending.getString("verifier"));
  String session=request(ACCOUNTS+"/api/session_token","POST",form,"application/x-www-form-urlencoded",null).optString("session_token");if(session.isEmpty())throw new Exception("missing_session_token");
  next=new JSONObject().put("session",session);vault.write(next);data=next;access="";idToken="";
 }
 private JSONObject request(String url,String method,String body,String contentType,String token) throws Exception {
  for(int retry=0;retry<3;retry++){
   long wait=nextRequest-System.currentTimeMillis();if(wait>0)Thread.sleep(wait);nextRequest=System.currentTimeMillis()+350;
   HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();
   try{
    c.setInstanceFollowRedirects(false);c.setConnectTimeout(20000);c.setReadTimeout(30000);c.setRequestMethod(method);c.setRequestProperty("Accept","application/json");c.setRequestProperty("User-Agent","com.nintendo.znej/3.0.3 (iOS/26.0.1)");
    if(token!=null){c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("Gentry-Locale","en-GB");}
    if(body!=null){c.setDoOutput(true);c.setRequestProperty("Content-Type",contentType);try(OutputStream stream=c.getOutputStream()){stream.write(body.getBytes(StandardCharsets.UTF_8));}}
    int status=c.getResponseCode();
    if(status==429){String h=c.getHeaderField("Retry-After");long delay=2000L*(1L<<retry);try{delay=Long.parseLong(h)*1000;}catch(Exception e){try{delay=ZonedDateTime.parse(h,DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli()-System.currentTimeMillis();}catch(Exception ignored){}}Thread.sleep(Math.min(300000,Math.max(1000,delay)));continue;}
    if(status==401||status==403)throw new AuthError();if(status<200||status>=300)throw new Exception("nintendo_request_failed");
    try(InputStream stream=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=stream.read(b))!=-1){out.write(b,0,n);if(out.size()>20*1024*1024)throw new Exception("response_too_large");}return new JSONObject(out.toString("UTF-8"));}
   }finally{c.disconnect();}
  }throw new Exception("nintendo_rate_limited");
 }
 private void token() throws Exception {
  if(!access.isEmpty()&&expiry>System.currentTimeMillis()+60000)return;
  String session=data.optString("session");if(session.isEmpty())throw new Exception("nintendo_auth_required");
  JSONObject body=new JSONObject().put("client_id",CLIENT).put("session_token",session).put("grant_type","urn:ietf:params:oauth:grant-type:jwt-bearer-session-token");
  JSONObject t=request(ACCOUNTS+"/api/token","POST",body.toString(),"application/json",null);access=t.optString("access_token");idToken=t.optString("id_token");expiry=System.currentTimeMillis()+t.optLong("expires_in")*1000;
  if(access.isEmpty())throw new Exception("missing_access_token");
 }
 private JSONObject api(String url) throws Exception {
  token();try{return request(url,"GET",null,null,access);}catch(AuthError error){if(!idToken.isEmpty())try{return request(url,"GET",null,null,idToken);}catch(AuthError ignored){}access="";token();return request(url,"GET",null,null,access);}
 }
 static JSONObject normalTitle(JSONObject r) throws Exception {
  String platform=r.optString("platform",r.optString("deviceType"));long minutes=r.getLong("totalPlayedMinutes");
  if(r.optString("titleId").isEmpty()||r.optString("titleName").isEmpty()||minutes<0||minutes>6000000)throw new Exception("invalid_history_response");
  JSONObject t=new JSONObject().put("platform",platform).put("totalPlayedMinutes",minutes).put("totalPlayedDays",r.optInt("totalPlayedDays"));
  for(String key:new String[]{"titleId","titleName","firstPlayedAt","lastPlayedAt","lastUpdatedAt","imageUrl"})t.put(key,r.optString(key));return t;
 }
 JSONObject sync(boolean full) throws Exception {
  if(System.currentTimeMillis()-lastAttempt<60000)throw new Exception("wait_one_minute");lastAttempt=System.currentTimeMillis();syncing=true;
  try{
   JSONObject old=data.optJSONObject("snapshot");if(old==null)old=new JSONObject().put("titles",new JSONArray());
   JSONArray raw=api(API).getJSONArray("playHistories");if(raw.length()==0&&old.getJSONArray("titles").length()>0)throw new Exception("unexpected_empty_history");
   Map<String,JSONObject> prior=new HashMap<>();JSONArray oldTitles=old.getJSONArray("titles");for(int i=0;i<oldTitles.length();i++){JSONObject t=oldTitles.getJSONObject(i);prior.put(t.getString("titleId")+"|"+t.getString("platform"),t);}
   JSONArray titles=new JSONArray();
   for(int i=0;i<raw.length();i++){
    JSONObject r=raw.getJSONObject(i);String platform=r.optString("platform",r.optString("deviceType"));if(!platform.equals("HAC")&&!platform.equals("BEE"))continue;
    JSONObject t=normalTitle(r),previous=prior.get(t.getString("titleId")+"|"+platform);
    boolean unchanged=previous!=null&&previous.optBoolean("historyComplete")&&previous.optLong("totalPlayedMinutes")==t.getLong("totalPlayedMinutes")&&previous.optString("lastPlayedAt").equals(t.optString("lastPlayedAt"))&&previous.optString("lastUpdatedAt").equals(t.optString("lastUpdatedAt"));
    if(!full&&unchanged){t.put("days",previous.getJSONArray("days")).put("historyComplete",true).put("historyCheckedAt",previous.optString("historyCheckedAt"));titles.put(t);continue;}
    TreeMap<String,JSONObject> days=new TreeMap<>();boolean complete=false;
    try{
     for(int offset=0;offset<160000;offset+=16){
      JSONArray page=api(API+"/game_titles/"+enc(t.getString("titleId"))+"?limit=16&offset="+offset).getJSONArray("playedDays");
      for(int k=0;k<page.length();k++){JSONObject d=page.getJSONObject(k);String date=d.getString("playedDate").substring(0,10);LocalDate.parse(date);int value=d.getInt("minutesPlayed");if(value<0||value>1440)throw new Exception("invalid_daily_history");days.put(date,new JSONObject().put("date",date).put("minutes",value));}
      if(page.length()<16){complete=true;break;}
     }
    }catch(Exception ignored){complete=false;}
    JSONArray result=new JSONArray();if(complete){for(JSONObject day:days.values())result.put(day);}else if(previous!=null)result=previous.getJSONArray("days");
    t.put("days",result).put("historyComplete",complete).put("historyCheckedAt",now());titles.put(t);
   }
   if(titles.length()==0&&oldTitles.length()>0)throw new Exception("no_supported_titles_returned");
   JSONObject snapshot=new JSONObject().put("version",1).put("accountId",old.optString("accountId",UUID.randomUUID().toString())).put("syncedAt",now()).put("lastFullSync",full?now():old.optString("lastFullSync")).put("titles",titles);
   JSONObject next=new JSONObject(data.toString()).put("snapshot",snapshot);vault.write(next);data=next;lastError="";return snapshot;
  }catch(Exception e){lastError=safeError(e);throw e;}finally{syncing=false;}
 }
 JSONObject status() throws Exception {JSONObject snapshot=data.optJSONObject("snapshot");return new JSONObject().put("linked",!data.optString("session").isEmpty()).put("syncing",syncing).put("lastError",lastError).put("syncedAt",snapshot==null?"":snapshot.optString("syncedAt")).put("titles",snapshot==null?0:snapshot.getJSONArray("titles").length());}
 JSONObject snapshot() throws Exception {JSONObject s=data.optJSONObject("snapshot");if(s==null)throw new Exception("no_successful_sync");return s;}
 void disconnect() throws Exception {vault.write(new JSONObject());data=new JSONObject();access="";idToken="";expiry=0;lastError="";}
 void autoSync(){try{JSONObject s=data.optJSONObject("snapshot");long updated=s==null?0:Instant.parse(s.optString("syncedAt")).toEpochMilli();if(!data.optString("session").isEmpty()&&System.currentTimeMillis()-updated>=6*3600000L){String lastFull=s==null?"":s.optString("lastFullSync");long full=lastFull.isEmpty()?0:Instant.parse(lastFull).toEpochMilli();sync(System.currentTimeMillis()-full>=7*86400000L);}}catch(Exception ignored){}}
 static String safeError(Exception e){String m=e.getMessage();return Arrays.asList("invalid_callback","disconnect_before_linking_another_account","wait_one_minute","no_successful_sync","nintendo_auth_required","nintendo_rate_limited","unexpected_empty_history","no_supported_titles_returned").contains(m==null?"":m)?m:"nintendo_operation_failed";}
 static final class AuthError extends Exception {AuthError(){super("nintendo_auth_required");}}
}
