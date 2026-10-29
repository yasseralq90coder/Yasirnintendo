package com.yasir.nintendo;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.webkit.*;
import android.view.*;
import android.widget.FrameLayout;
import androidx.webkit.WebViewAssetLoader;
import java.io.*;
import java.util.concurrent.*;
import org.json.*;
public final class MainActivity extends Activity {
 private WebView web;private final ExecutorService executor=Executors.newSingleThreadExecutor();private volatile NintendoClient client;private volatile boolean secureReady=false;
 private ValueCallback<Uri[]> fileChooser;private String saveText=null,saveId=null;private String initialCallback=null;
 private static final String HOME="https://appassets.androidplatform.net/assets/www/index.html";
 @Override public void onCreate(Bundle state){
  super.onCreate(state);FrameLayout root=new FrameLayout(this);web=new WebView(this);WebViewRendering.configure(web);root.addView(web,new FrameLayout.LayoutParams(-1,-1));setContentView(root);
  root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets b=insets.getInsets(WindowInsets.Type.systemBars());v.setPadding(b.left,b.top,b.right,b.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSupportMultipleWindows(true);
  CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req){return loader.shouldInterceptRequest(req.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){if(isLocal(req.getUrl()))return false;if(req.isForMainFrame())openExternal(req.getUrl());return true;}
   @Override public void onPageFinished(WebView view,String url){if(initialCallback!=null){String callback=initialCallback;initialCallback=null;receiveCallback(callback);}else executor.execute(()->{if(client!=null){client.autoSync();notifyUpdate();}});}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onCreateWindow(WebView view,boolean dialog,boolean gesture,android.os.Message result){
    WebView popup=new WebView(MainActivity.this);popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){openExternal(req.getUrl());v.destroy();return true;}});
    ((WebView.WebViewTransport)result.obj).setWebView(popup);result.sendToTarget();return true;
   }
   @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
    if(fileChooser!=null)fileChooser.onReceiveValue(null);fileChooser=callback;
    Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/csv","text/plain","application/octet-stream"});
    try{startActivityForResult(i,101);}catch(Exception e){fileChooser.onReceiveValue(null);fileChooser=null;}return true;
   }
  });
  web.addJavascriptInterface(new NativeBridge(),"AndroidBridge");
  executor.execute(()->{try{client=new NintendoClient(new SecureVault(this),null,this::notifyUpdate);secureReady=true;}catch(Exception e){secureReady=false;}});
  if(getIntent().getData()!=null)initialCallback=getIntent().getData().toString();
  web.loadUrl(HOME+(getIntent().getBooleanExtra("openStore",false)?"#store":""));
 }
 private boolean isLocal(Uri uri){return "https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&uri.getPath()!=null&&uri.getPath().startsWith("/assets/www/");}
 private void openExternal(Uri uri){if(("npf"+NintendoClient.CLIENT).equals(uri.getScheme())){receiveCallback(uri.toString());return;}if(!"https".equals(uri.getScheme()))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE));}catch(Exception ignored){}}
 private void reply(String id,JSONObject data,String error){runOnUiThread(()->{if(web==null)return;try{JSONObject result=new JSONObject().put("data",data==null?JSONObject.NULL:data).put("error",error==null?JSONObject.NULL:error);web.evaluateJavascript("window.__yasirNativeResult&&window.__yasirNativeResult("+JSONObject.quote(id)+","+result.toString()+")",null);}catch(Exception ignored){}});}
 private void notifyUpdate(){runOnUiThread(()->{if(web!=null)web.evaluateJavascript("window.dispatchEvent(new Event('nintendo-native-update'))",null);});}
 private void receiveCallback(String url){executor.execute(()->{try{if(client==null)throw new Exception();client.complete(url);notifyUpdate();runOnUiThread(()->{android.widget.Toast.makeText(this,"تم ربط Nintendo وبدأ جلب بيانات اللعب.",android.widget.Toast.LENGTH_LONG).show();notifyUpdate();});client.autoSync();}catch(Exception e){runOnUiThread(()->android.widget.Toast.makeText(this,"تعذر إتمام التفويض. أعد محاولة الربط من الإعدادات.",android.widget.Toast.LENGTH_LONG).show());}});}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(intent.getBooleanExtra("openStore",false)&&web!=null)web.evaluateJavascript("location.hash='store'",null);if(intent.getData()!=null)receiveCallback(intent.getData().toString());}
 @Override protected void onResume(){super.onResume();if(executor!=null)executor.execute(()->{if(client!=null){client.autoSync();notifyUpdate();}});}
 public final class NativeBridge {
  @JavascriptInterface public void request(String id,String path,String raw){
   if(id==null||id.length()>100||raw==null||raw.length()>21*1024*1024)return;
   if("/guide/open".equals(path)){try{JSONObject b=new JSONObject(raw);String url=b.getString("url"),gid=b.getString("gameId");if(!GuideActivity.allowed(url)||gid.length()>100){reply(id,null,"invalid_guide");return;}runOnUiThread(()->{startActivity(new Intent(MainActivity.this,GuideActivity.class).putExtra("url",url).putExtra("gameId",gid).putExtra("title",b.optString("title")));reply(id,new JSONObject(),null);});}catch(Exception e){reply(id,null,"invalid_guide");}return;}
   if("/deals/alerts".equals(path)||"/deals/watches".equals(path)){try{JSONObject b=new JSONObject(raw);JSONArray watches=b.optJSONArray("watches");if(watches==null||watches.length()>200){reply(id,null,"invalid_watches");return;}boolean enabled="/deals/alerts".equals(path)?b.optBoolean("enabled"):getSharedPreferences("deal_alerts",MODE_PRIVATE).getBoolean("enabled",false);DealAlertService.configure(MainActivity.this,enabled,watches);if(enabled&&"/deals/alerts".equals(path)&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)runOnUiThread(()->requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},203));reply(id,new JSONObject().put("enabled",enabled),null);}catch(Exception e){reply(id,null,"alerts_failed");}return;}
   // Read-only status/snapshot must remain responsive during long network synchronizations.
   if("/status".equals(path)||"/snapshot".equals(path)){try{if(!secureReady||client==null){reply(id,null,"secure_storage_unavailable");return;}reply(id,"/status".equals(path)?client.status():client.snapshot(),null);}catch(Exception e){reply(id,null,NintendoClient.safeError(e));}return;}
   if("/sync".equals(path)&&client!=null){try{if(client.status().optBoolean("syncing")){reply(id,new JSONObject().put("syncing",true),null);return;}}catch(Exception ignored){}}
   executor.execute(()->{try{
    JSONObject body=new JSONObject(raw);if(!secureReady||client==null){reply(id,null,"secure_storage_unavailable");return;}
    switch(path){
     case "/status":reply(id,client.status(),null);break;
     case "/auth/start":reply(id,client.start(),null);break;
     case "/auth/complete":client.complete(body.getString("callback"));reply(id,new JSONObject().put("linked",true),null);break;
     case "/sync":client.sync(body.optBoolean("full"));reply(id,new JSONObject().put("syncing",false),null);break;
     case "/snapshot":reply(id,client.snapshot(),null);break;
     case "/disconnect":client.disconnect();reply(id,new JSONObject().put("linked",false),null);break;
     case "/export":
      String text=body.getString("text"),name=body.getString("name").replaceAll("[^a-zA-Z0-9._-]","_");if(text.length()>20*1024*1024)throw new Exception();
      runOnUiThread(()->{if(saveId!=null){reply(id,null,"save_in_progress");return;}saveText=text;saveId=id;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(java.util.Arrays.asList("text/csv","text/plain","text/markdown","text/html").contains(body.optString("type"))?body.optString("type"):"application/json").putExtra(Intent.EXTRA_TITLE,name);try{startActivityForResult(i,102);}catch(Exception e){saveText=null;saveId=null;reply(id,null,"save_failed");}});break;
     default:reply(id,null,"unsupported_native_operation");
    }
   }catch(Exception e){reply(id,null,NintendoClient.safeError(e));}});
  }
 }
 @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);
  if(requestCode==101&&fileChooser!=null){fileChooser.onReceiveValue(resultCode==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);fileChooser=null;}
  if(requestCode==102&&saveId!=null){String id=saveId,text=saveText;saveId=null;saveText=null;if(resultCode!=RESULT_OK||data==null){reply(id,null,"save_cancelled");return;}Uri uri=data.getData();executor.execute(()->{try(OutputStream out=getContentResolver().openOutputStream(uri)){if(out==null)throw new IOException();out.write(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));reply(id,new JSONObject().put("saved",true),null);}catch(Exception e){reply(id,null,"save_failed");}});}
 }
 @Override public void onBackPressed(){web.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false;})()",value->{if(!"true".equals(value)){if(web.canGoBack())web.goBack();else finish();}});}
 @Override protected void onDestroy(){if(fileChooser!=null)fileChooser.onReceiveValue(null);if(web!=null){web.removeJavascriptInterface("AndroidBridge");web.destroy();web=null;}executor.shutdown();super.onDestroy();}
}
