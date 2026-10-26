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
}
