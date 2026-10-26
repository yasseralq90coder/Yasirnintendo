package com.yasir.nintendo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.*;
import android.webkit.WebView;
import android.view.View;
import android.view.ViewGroup;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class AppSmokeTest {
 private WebView find(View view){if(view instanceof WebView)return (WebView)view;if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++){WebView found=find(group.getChildAt(i));if(found!=null)return found;}}return null;}
 @Test public void offlineBundledInterfaceAndNativeBridgeWork() throws Exception {
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   boolean loaded=false;
   for(int i=0;i<40&&!loaded;i++){
    CountDownLatch latch=new CountDownLatch(1);String[] value={""};
    scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("!!document.querySelector('#main h1') && typeof AndroidBridge.request==='function'",result->{value[0]=result;latch.countDown();}));
    assertTrue(latch.await(5,TimeUnit.SECONDS));loaded="true".equals(value[0]);if(!loaded)Thread.sleep(250);
   }assertTrue("Bundled interface failed to load",loaded);
   CountDownLatch latch=new CountDownLatch(1);String[] value={""};
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("(function(){location.hash='settings';return true;})()",r->latch.countDown()));assertTrue(latch.await(5,TimeUnit.SECONDS));
   Thread.sleep(300);
   CountDownLatch ready=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.body.textContent.includes('حساب Nintendo على جوالك') && !document.querySelector('#bridge-key')",r->{value[0]=r;ready.countDown();}));
   assertTrue(ready.await(5,TimeUnit.SECONDS));assertEquals("true",value[0]);
   // Request through the exact exposed bridge; reply contains no Nintendo token.
   CountDownLatch called=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("window.__nativeSmoke=null;window.__yasirNativeResult=function(id,result){if(id==='smoke')window.__nativeSmoke=result;};AndroidBridge.request('smoke','/status','{}');",r->called.countDown()));assertTrue(called.await(5,TimeUnit.SECONDS));
   boolean returned=false;
   for(int i=0;i<20&&!returned;i++){CountDownLatch check=new CountDownLatch(1);scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("!!window.__nativeSmoke && window.__nativeSmoke.data.linked===false && !JSON.stringify(window.__nativeSmoke).includes('session_token')",r->{value[0]=r;check.countDown();}));assertTrue(check.await(5,TimeUnit.SECONDS));returned="true".equals(value[0]);if(!returned)Thread.sleep(100);}assertTrue("Native status bridge did not reply",returned);
  }
 }
}
