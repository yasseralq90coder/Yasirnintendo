package com.yasir.nintendo;
import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;
public class NintendoProtocolTest {
 @Test public void callbackAcceptsOnlyMatchingStateAndRedirect() throws Exception {
  JSONObject pending=new JSONObject().put("state","expected").put("expires",2000);
  String callback=NintendoClient.REDIRECT+"#state=expected&session_token_code=abc%2B123";
  assertEquals("abc+123",NintendoClient.verifiedCode(callback,pending,1000));
  for(String bad:new String[]{callback.replace("expected","wrong"),callback.replace("://auth","://evil"),"https://example.com/#state=expected&session_token_code=abc"}){
   try{NintendoClient.verifiedCode(bad,pending,1000);fail("Invalid redirect/state accepted");}catch(Exception expected){}
  }
  try{NintendoClient.verifiedCode(callback,pending,3000);fail("Expired attempt accepted");}catch(Exception expected){}
 }
 @Test public void platformAndOriginalMinutesArePreserved() throws Exception {
  JSONObject raw=new JSONObject().put("titleId","01001").put("titleName","Mario").put("platform","BEE").put("totalPlayedMinutes",121);
  JSONObject title=NintendoClient.normalTitle(raw);assertEquals("BEE",title.getString("platform"));assertEquals(121,title.getLong("totalPlayedMinutes"));
  raw.put("totalPlayedMinutes",-1);try{NintendoClient.normalTitle(raw);fail("Negative minutes accepted");}catch(Exception expected){}
 }
 @Test public void authenticationMessagesNeverExposeUnderlyingResponse() {
  assertEquals("nintendo_operation_failed",NintendoClient.safeError(new Exception("private-token-or-response")));
  assertEquals("nintendo_auth_required",NintendoClient.safeError(new NintendoClient.AuthError()));
 }

 static class MemoryStore implements NintendoClient.Store {
  JSONObject value;MemoryStore() throws Exception{value=new JSONObject().put("session","test-only-session");}
  public synchronized JSONObject read() throws Exception{return new JSONObject(value.toString());}
  public synchronized void write(JSONObject v) throws Exception{value=new JSONObject(v.toString());}
 }
 @Test public void totalsArePublishedBeforeSlowDaysAndStatusRemainsResponsive() throws Exception {
  MemoryStore store=new MemoryStore();java.util.concurrent.CountDownLatch dailyStarted=new java.util.concurrent.CountDownLatch(1),finishDays=new java.util.concurrent.CountDownLatch(1);
  NintendoClient.Transport transport=(url,method,body,type,token)->{
   if(url.endsWith("/api/token"))return new JSONObject().put("access_token","test-access").put("expires_in",900);
   if(url.equals(NintendoClient.API))return new JSONObject().put("playHistories",new org.json.JSONArray().put(new JSONObject().put("titleId","01001").put("titleName","Mario").put("platform","HAC").put("totalPlayedMinutes",121)));
   dailyStarted.countDown();if(!finishDays.await(5,java.util.concurrent.TimeUnit.SECONDS))throw new Exception("test_timeout");
   return new JSONObject().put("playedDays",new org.json.JSONArray().put(new JSONObject().put("playedDate","2026-10-20T00:00:00Z").put("minutesPlayed",30)));
  };
  NintendoClient client=new NintendoClient(store,transport,()->{});java.util.concurrent.ExecutorService pool=java.util.concurrent.Executors.newSingleThreadExecutor();
  try{java.util.concurrent.Future<JSONObject> result=pool.submit(()->client.sync(false));assertTrue(dailyStarted.await(5,java.util.concurrent.TimeUnit.SECONDS));
   assertTrue(client.status().getBoolean("syncing"));assertEquals("days",client.status().getString("phase"));assertEquals(1,client.status().getInt("titles"));
   assertEquals(121,client.snapshot().getJSONArray("titles").getJSONObject(0).getInt("totalPlayedMinutes"));
   String accountId=client.snapshot().getString("accountId");finishDays.countDown();JSONObject finished=result.get(5,java.util.concurrent.TimeUnit.SECONDS);assertEquals(accountId,finished.getString("accountId"));assertEquals(1,finished.getJSONArray("titles").getJSONObject(0).getJSONArray("days").length());assertFalse(client.status().getBoolean("syncing"));
  }finally{finishDays.countDown();pool.shutdownNow();}
 }
 @Test public void dailyFailureKeepsOfficialTotalsAndReportsIncompleteHistory() throws Exception {
  NintendoClient client=new NintendoClient(new MemoryStore(),(url,method,body,type,token)->{
   if(url.endsWith("/api/token"))return new JSONObject().put("access_token","test-access").put("expires_in",900);
   if(url.equals(NintendoClient.API))return new JSONObject().put("playHistories",new org.json.JSONArray().put(new JSONObject().put("titleId","01001").put("titleName","Mario").put("platform","BEE").put("totalPlayedMinutes",122)));
   throw new NintendoClient.HttpStatusError(404);
  },()->{});
  JSONObject result=client.sync(false);assertEquals(122,result.getJSONArray("titles").getJSONObject(0).getInt("totalPlayedMinutes"));assertEquals(1,client.status().getInt("dailyFailed"));assertEquals("nintendo_http_404",client.status().getString("dailyError"));
 }
 @Test public void unknownPlatformIsReportedInsteadOfAnEmptySuccess() throws Exception {
  NintendoClient client=new NintendoClient(new MemoryStore(),(url,method,body,type,token)->{
   if(url.endsWith("/api/token"))return new JSONObject().put("access_token","test-access").put("expires_in",900);
   return new JSONObject().put("playHistories",new org.json.JSONArray().put(new JSONObject().put("platform","NEW_PLATFORM")));
  },()->{});
  try{client.sync(false);fail("Unknown platforms accepted as empty library");}catch(Exception expected){assertEquals("unsupported_platforms",client.status().getString("lastError"));assertEquals("NEW_PLATFORM",client.status().getString("platforms"));}
 }
}
