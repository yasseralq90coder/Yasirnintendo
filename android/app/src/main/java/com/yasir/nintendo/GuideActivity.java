package com.yasir.nintendo;
import android.app.Activity;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.webkit.*;
import android.widget.*;
import android.view.*;
/** External guide content never receives AndroidBridge or account credentials. */
public final class GuideActivity extends Activity {
 private WebView reader;private String key,initial,restoreUrl;private int restoreY;private boolean loading;private android.content.SharedPreferences prefs;private TextView address;
 static boolean allowed(String url){try{Uri u=Uri.parse(url);String h=u.getHost();return "https".equals(u.getScheme())&&h!=null&&h.contains(".")&&!h.matches("[0-9.]+")&&!h.contains(":")&&!h.endsWith(".local")&&!h.endsWith(".localhost")&&!h.endsWith(".internal")&&!"appassets.androidplatform.net".equals(h)&&u.getUserInfo()==null;}catch(Exception e){return false;}}
 @Override public void onCreate(Bundle state){super.onCreate(state);key=getIntent().getStringExtra("gameId");initial=getIntent().getStringExtra("url");if(key==null||key.length()>100||!allowed(initial)){finish();return;}
 prefs=getSharedPreferences("guide_positions",MODE_PRIVATE);String previousSource=prefs.getString(key+":source","");restoreUrl=initial.equals(previousSource)?prefs.getString(key+":url",initial):initial;restoreY=initial.equals(previousSource)?prefs.getInt(key+":y",0):0;if(!allowed(restoreUrl)){restoreUrl=initial;restoreY=0;}
 LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.WHITE);root.setOnApplyWindowInsetsListener((v,i)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets b=i.getInsets(WindowInsets.Type.systemBars());v.setPadding(b.left,b.top,b.right,b.bottom);}else v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});
 LinearLayout toolbar=new LinearLayout(this);Button back=new Button(this);back.setText("رجوع للتطبيق");back.setOnClickListener(v->finish());toolbar.addView(back);Button external=new Button(this);external.setText("متصفح ↗");external.setOnClickListener(v->{save();String url=reader.getUrl();if(allowed(url))try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception ignored){}});toolbar.addView(external);root.addView(toolbar);
 address=new TextView(this);address.setTextColor(Color.DKGRAY);address.setPadding(16,8,16,8);root.addView(address);reader=new WebView(this);root.addView(reader,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
 WebSettings settings=reader.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSupportMultipleWindows(false);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSafeBrowsingEnabled(true);android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(reader,false);
 reader.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){if(!request.isForMainFrame())return !allowed(request.getUrl().toString());save();return !allowed(request.getUrl().toString());}
 @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){loading=true;address.setText(Uri.parse(url).getHost()+" · جارٍ التحميل…");}
 @Override public void onPageFinished(WebView v,String url){loading=false;address.setText(Uri.parse(url).getHost()+" · موضع القراءة يُحفظ تلقائيًا");if(restoreUrl!=null&&url.equals(restoreUrl)){int y=restoreY;restoreUrl=null;v.postDelayed(()->{if(url.equals(v.getUrl()))v.scrollTo(0,y);},500);}else restoreUrl=null;}
 @Override public void onReceivedError(WebView v,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame()){loading=false;address.setText("تعذر عرض الموقع. جرّب فتحه في المتصفح.");}}
 });reader.setOnScrollChangeListener((v,x,y,ox,oy)->{if(!loading&&restoreUrl==null)save();});reader.loadUrl(restoreUrl);
 }
 private void save(){if(reader==null||loading||restoreUrl!=null)return;String url=reader.getUrl();if(allowed(url))prefs.edit().putString(key+":source",initial).putString(key+":url",url).putInt(key+":y",reader.getScrollY()).apply();}
 @Override protected void onPause(){save();super.onPause();}
 @Override public void onBackPressed(){if(reader!=null&&reader.canGoBack()){save();reader.goBack();}else super.onBackPressed();}
 @Override protected void onDestroy(){save();if(reader!=null){reader.stopLoading();reader.destroy();reader=null;}super.onDestroy();}
}
