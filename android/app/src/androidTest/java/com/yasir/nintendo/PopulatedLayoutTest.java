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
 private String shell(String command)throws Exception{
  android.os.ParcelFileDescriptor fd=InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand(command);
  try(InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(fd);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] bytes=new byte[1024];for(int n;(n=in.read(bytes))!=-1;)out.write(bytes,0,n);return out.toString("UTF-8");}
 }
 private void screenshot(ActivityScenario<MainActivity> scene,String name)throws Exception{
  CountDownLatch painted=new CountDownLatch(1);Bitmap[] image={null};
  scene.onActivity(a->{WebView w=find(a.getWindow().getDecorView());w.postVisualStateCallback(1,new WebView.VisualStateCallback(){@Override public void onComplete(long id){image[0]=Bitmap.createBitmap(w.getWidth(),w.getHeight(),Bitmap.Config.ARGB_8888);w.draw(new android.graphics.Canvas(image[0]));painted.countDown();}});});
  assertTrue("WebView visual frame ready",painted.await(10,TimeUnit.SECONDS));
  java.util.Set<Integer> colors=new java.util.HashSet<>();
  for(int y=0;y<image[0].getHeight();y+=8)for(int x=0;x<image[0].getWidth();x+=8)colors.add(image[0].getPixel(x,y));
  assertTrue("Reject blank layout evidence",colors.size()>8);
  File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"layout-qa");dir.mkdirs();File file=new File(dir,name+".png");
  try(FileOutputStream out=new FileOutputStream(file)){image[0].compress(Bitmap.CompressFormat.PNG,100,out);}image[0].recycle();
  shell("mkdir -p /data/local/tmp/yasir-layout-qa");shell("cp "+file.getAbsolutePath()+" /data/local/tmp/yasir-layout-qa/");
  assertTrue("Screenshot must exist",shell("ls /data/local/tmp/yasir-layout-qa/"+name+".png").contains(name+".png"));
 }

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
     if(width==360&&zoom==100){screenshot(scene,"home-"+(dark?"dark":"light"));js(scene,"window.scrollTo(0,document.querySelector('.mobile-resume').offsetTop)");screenshot(scene,"card-"+(dark?"dark":"light"));}
     js(scene,"location.hash='stats'");Thread.sleep(180);ready(scene,".year-calendar");
     assertEquals("Stats overflow width="+width+" zoom="+zoom+" dark="+dark,"true",js(scene,"document.documentElement.scrollWidth<=innerWidth+2 && document.querySelectorAll('.year-month').length===12 && document.querySelectorAll('.calendar-day').length>=365 && document.querySelector('#bottom-nav').getBoundingClientRect().right<=innerWidth+2"));
     if(width==360&&zoom==100){screenshot(scene,"stats-"+(dark?"dark":"light"));js(scene,"document.querySelector('.year-calendar').scrollIntoView()");screenshot(scene,"calendar-"+(dark?"dark":"light"));}
    }
   }finally{js(scene,"localStorage.setItem('yasir-nintendo-v1',"+previous+");document.body.classList.toggle('dark',"+theme+");location.hash='home';location.reload();");}
  }
 }
}
