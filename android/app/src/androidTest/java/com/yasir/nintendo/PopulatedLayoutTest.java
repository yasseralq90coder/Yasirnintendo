package com.yasir.nintendo;
import android.view.*;
import android.webkit.WebView;
import android.graphics.Bitmap;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import java.util.concurrent.*;
import java.io.*;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class PopulatedLayoutTest {
 private WebView find(View v){if(v instanceof WebView)return (WebView)v;if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++){WebView w=find(((ViewGroup)v).getChildAt(i));if(w!=null)return w;}return null;}
 private String js(ActivityScenario<MainActivity> scene,String code)throws Exception{CountDownLatch wait=new CountDownLatch(1);String[] out={""};scene.onActivity(a->find(a.getWindow().getDecorView()).evaluateJavascript(code,r->{out[0]=r;wait.countDown();}));assertTrue(wait.await(8,TimeUnit.SECONDS));return out[0];}
 private void ready(ActivityScenario<MainActivity> scene,String selector)throws Exception{for(int i=0;i<60;i++){if("true".equals(js(scene,"!!document.querySelector("+JSONObject.quote(selector)+")")))return;Thread.sleep(150);}fail("UI did not load: "+selector);}
 private void screenshot(String name)throws Exception{Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"layout-qa");dir.mkdirs();try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){bitmap.compress(Bitmap.CompressFormat.PNG,100,out);}bitmap.recycle();}
 @Test public void populatedHomeAndStatsFitSmallScreensAndLargeText()throws Exception{
  String fixture;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("layout-fixture.json")){ByteArrayOutputStream b=new ByteArrayOutputStream();byte[] buf=new byte[4096];for(int n;(n=in.read(buf))!=-1;)b.write(buf,0,n);fixture=b.toString("UTF-8");}
  try(ActivityScenario<MainActivity> scene=ActivityScenario.launch(MainActivity.class)){
   ready(scene,"#main h1");String previous=js(scene,"localStorage.getItem('yasir-nintendo-v1')"),theme=js(scene,"document.body.classList.contains('dark')");
   try{
    js(scene,"localStorage.setItem('yasir-nintendo-v1',"+JSONObject.quote(fixture)+");location.hash='home';location.reload();");ready(scene,".mobile-resume h2");
    for(int width:new int[]{320,360,412})for(int zoom:new int[]{100,130})for(boolean dark:new boolean[]{false,true}){
     scene.onActivity(a->{WebView w=find(a.getWindow().getDecorView());ViewGroup.LayoutParams p=w.getLayoutParams();p.width=(int)(width*a.getResources().getDisplayMetrics().density);w.setLayoutParams(p);w.getSettings().setTextZoom(zoom);});
     js(scene,"document.body.classList.toggle('dark',"+dark+");location.hash='home';");Thread.sleep(180);ready(scene,".mobile-resume h2");
     String checks="(function(){var c=document.querySelector('.mobile-resume .director-copy').getBoundingClientRect(),a=document.querySelector('.mobile-resume .director-cover').getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth+2 && c.width>=innerWidth*.7 && c.top>=a.bottom-2 && document.querySelector('.mobile-resume').getBoundingClientRect().height<1000;})()";
     assertEquals("Home width="+width+" zoom="+zoom+" dark="+dark,"true",js(scene,checks));
     if(width==360&&zoom==100)screenshot("home-"+(dark?"dark":"light"));
     js(scene,"location.hash='stats'");Thread.sleep(180);ready(scene,".year-calendar");
     assertEquals("Stats overflow width="+width+" zoom="+zoom+" dark="+dark,"true",js(scene,"document.documentElement.scrollWidth<=innerWidth+2 && document.querySelectorAll('.year-month').length===12 && document.querySelectorAll('.calendar-day').length>=365 && document.querySelector('#bottom-nav').getBoundingClientRect().right<=innerWidth+2"));
     if(width==360&&zoom==100)screenshot("stats-"+(dark?"dark":"light"));
    }
   }finally{js(scene,"localStorage.setItem('yasir-nintendo-v1',"+previous+");document.body.classList.toggle('dark',"+theme+");location.hash='home';location.reload();");}
  }
 }
}
