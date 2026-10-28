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
 @Test public void guideReaderRejectsUnsafeOrigins(){assertFalse(GuideActivity.allowed("javascript:alert(1)"));assertFalse(GuideActivity.allowed("file:///data/data/com.yasir.nintendo/"));assertFalse(GuideActivity.allowed("https://127.0.0.1/"));assertFalse(GuideActivity.allowed("https://appassets.androidplatform.net/assets/www/index.html"));assertTrue(GuideActivity.allowed("https://www.nintendolife.com/guides/example"));}
 @Test public void offlineBundledInterfaceAndNativeBridgeWork() throws Exception {
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   boolean loaded=false;
   for(int i=0;i<40&&!loaded;i++){
    CountDownLatch latch=new CountDownLatch(1);String[] value={""};
    scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("!!document.querySelector('#main h1') && typeof AndroidBridge.request==='function'",result->{value[0]=result;latch.countDown();}));
    assertTrue(latch.await(5,TimeUnit.SECONDS));loaded="true".equals(value[0]);if(!loaded)Thread.sleep(250);
   }assertTrue("Bundled interface failed to load",loaded);
   CountDownLatch director=new CountDownLatch(1);String[] adventure={""};
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("!!document.querySelector('#king-director') && document.documentElement.scrollWidth<=window.innerWidth+2",r->{adventure[0]=r;director.countDown();}));assertTrue(director.await(5,TimeUnit.SECONDS));assertEquals("Director must fit mobile viewport","true",adventure[0]);
   CountDownLatch mapRoute=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("location.hash='kingdom'",r->mapRoute.countDown()));assertTrue(mapRoute.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch mapCheck=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelectorAll('.map-island').length===5 && document.documentElement.scrollWidth<=window.innerWidth+2",r->{adventure[0]=r;mapCheck.countDown();}));assertTrue(mapCheck.await(5,TimeUnit.SECONDS));assertEquals("Five interactive zones must fit mobile viewport","true",adventure[0]);
   CountDownLatch campaignRoute=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelector('[data-action=\"k-tab\"][data-id=\"campaigns\"]').click()",r->campaignRoute.countDown()));assertTrue(campaignRoute.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch campaignCheck=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelectorAll('[data-action=\"k-campaign-new\"]').length===7 && document.documentElement.scrollWidth<=window.innerWidth+2",r->{adventure[0]=r;campaignCheck.countDown();}));assertTrue(campaignCheck.await(5,TimeUnit.SECONDS));assertEquals("Seven campaign templates must fit mobile viewport","true",adventure[0]);
   CountDownLatch paperRoute=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelector('[data-action=\"k-tab\"][data-id=\"paper\"]').click()",r->paperRoute.countDown()));assertTrue(paperRoute.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch paperCheck=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("!!document.querySelector('#king-journal-note') && document.documentElement.scrollWidth<=window.innerWidth+2",r->{adventure[0]=r;paperCheck.countDown();}));assertTrue(paperCheck.await(5,TimeUnit.SECONDS));assertEquals("Newspaper must render offline on mobile","true",adventure[0]);
   CountDownLatch seeded=new CountDownLatch(1);String[] imported={""};
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("(function(){var s=JSON.parse(localStorage.getItem('yasir-nintendo-v1'));return s.games.length===0 && !document.querySelector('[data-action=add]') && !document.querySelector('[data-action=start-timer]');})()",r->{imported[0]=r;seeded.countDown();}));
   assertTrue(seeded.await(5,TimeUnit.SECONDS));assertEquals("Fresh app must not contain private library data", "true",imported[0]);
   CountDownLatch latch=new CountDownLatch(1);String[] value={""};
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("(function(){location.hash='settings';return true;})()",r->latch.countDown()));assertTrue(latch.await(5,TimeUnit.SECONDS));
   Thread.sleep(300);
   CountDownLatch ready=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.body.textContent.includes('حساب Nintendo على جوالك') && !document.querySelector('#bridge-key')",r->{value[0]=r;ready.countDown();}));
   assertTrue(ready.await(5,TimeUnit.SECONDS));assertEquals("true",value[0]);
   CountDownLatch statsPage=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("location.hash='stats';",r->statsPage.countDown()));assertTrue(statsPage.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch calendar=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelectorAll('.calendar-day').length>=365 && document.documentElement.scrollWidth<=window.innerWidth+2",r->{value[0]=r;calendar.countDown();}));assertTrue(calendar.await(5,TimeUnit.SECONDS));assertEquals("Annual calendar must render without horizontal page overflow", "true",value[0]);
   CountDownLatch badgePage=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("location.hash='achievements';",r->badgePage.countDown()));assertTrue(badgePage.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch badges=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelectorAll('.trophy-path').length===24 && document.querySelectorAll('.tier-track button').length===96 && document.documentElement.scrollWidth<=window.innerWidth+2",r->{value[0]=r;badges.countDown();}));assertTrue(badges.await(5,TimeUnit.SECONDS));assertEquals("96 tiered badges in 24 compact paths must render on the factory WebView", "true",value[0]);
   CountDownLatch museumPage=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("location.hash='history';",r->museumPage.countDown()));assertTrue(museumPage.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch eras=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelectorAll('.era-rail button').length===17 && document.documentElement.scrollWidth<=window.innerWidth+2",r->{value[0]=r;eras.countDown();}));assertTrue(eras.await(5,TimeUnit.SECONDS));assertEquals("Nintendo museum must load all eras inside the mobile viewport", "true",value[0]);
   CountDownLatch newsPage=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("location.hash='news';",r->newsPage.countDown()));assertTrue(newsPage.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch headlines=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelectorAll('.news-card').length>=3 && document.querySelectorAll('#bottom-nav a').length===4",r->{value[0]=r;headlines.countDown();}));assertTrue(headlines.await(5,TimeUnit.SECONDS));assertEquals("Bundled news and Android navigation must work offline", "true",value[0]);
   CountDownLatch shopPage=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("location.hash='store';",r->shopPage.countDown()));assertTrue(shopPage.await(5,TimeUnit.SECONDS));Thread.sleep(400);
   CountDownLatch offers=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("document.querySelectorAll('.offer-card').length>0 && document.querySelectorAll('.offer-card').length<=24 && document.documentElement.scrollWidth<=window.innerWidth+2",r->{value[0]=r;offers.countDown();}));assertTrue(offers.await(5,TimeUnit.SECONDS));assertEquals("Public shop must load a bounded mobile grid offline", "true",value[0]);
   // Request through the exact exposed bridge; reply contains no Nintendo token.
   CountDownLatch called=new CountDownLatch(1);
   scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("window.__nativeSmoke=null;window.__yasirNativeResult=function(id,result){if(id==='smoke')window.__nativeSmoke=result;};AndroidBridge.request('smoke','/status','{}');",r->called.countDown()));assertTrue(called.await(5,TimeUnit.SECONDS));
   boolean returned=false;
   for(int i=0;i<20&&!returned;i++){CountDownLatch check=new CountDownLatch(1);scenario.onActivity(activity->find(activity.getWindow().getDecorView()).evaluateJavascript("!!window.__nativeSmoke && window.__nativeSmoke.data.linked===false && !JSON.stringify(window.__nativeSmoke).includes('session_token')",r->{value[0]=r;check.countDown();}));assertTrue(check.await(5,TimeUnit.SECONDS));returned="true".equals(value[0]);if(!returned)Thread.sleep(100);}assertTrue("Native status bridge did not reply",returned);
  }
 }
}
