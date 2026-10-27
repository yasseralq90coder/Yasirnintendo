package com.yasir.nintendo;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import org.json.*;
import java.net.*;
import java.io.*;
import java.time.Instant;
public final class DealAlertService extends JobService {
 private volatile boolean stopped;private Thread worker;private static final int JOB=4081;
 static void configure(Context c,boolean enabled,JSONArray watches){c.getSharedPreferences("deal_alerts",MODE_PRIVATE).edit().putBoolean("enabled",enabled).putString("watches",watches.toString()).apply();JobScheduler scheduler=(JobScheduler)c.getSystemService(JOB_SCHEDULER_SERVICE);if(enabled)scheduler.schedule(new JobInfo.Builder(JOB,new ComponentName(c,DealAlertService.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(60*60*1000L).setPersisted(true).build());else scheduler.cancel(JOB);}
 @Override public boolean onStartJob(JobParameters params){stopped=false;worker=new Thread(()->{try{check();}catch(Exception ignored){}if(!stopped)jobFinished(params,false);},"public-deal-check");worker.start();return true;}
 @Override public boolean onStopJob(JobParameters params){stopped=true;if(worker!=null)worker.interrupt();return true;}
 private void check() throws Exception {android.content.SharedPreferences p=getSharedPreferences("deal_alerts",MODE_PRIVATE);if(!p.getBoolean("enabled",false))return;if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;JSONArray watches=new JSONArray(p.getString("watches","[]"));if(watches.length()==0)return;
 HttpURLConnection connection=(HttpURLConnection)new URL("https://yasseralq90coder.github.io/Yasirnintendo/store-data.json").openConnection();connection.setConnectTimeout(15000);connection.setReadTimeout(15000);String body;try{if(connection.getResponseCode()!=200)return;try(InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(stopped||out.size()+n>3000000)return;out.write(buffer,0,n);}body=out.toString("UTF-8");}}finally{connection.disconnect();}
 JSONObject data=new JSONObject(body);if(data.optInt("version")!=1)return;JSONArray offers=data.getJSONArray("offers");NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);nm.createNotificationChannel(new NotificationChannel("price_targets","أسعار الألعاب المراقبة",NotificationManager.IMPORTANCE_DEFAULT));int emitted=0;
 for(int i=0;i<offers.length()&&!stopped&&emitted<3;i++){JSONObject o=offers.getJSONObject(i);for(int j=0;j<watches.length();j++){JSONObject w=watches.getJSONObject(j);if(!qualifies(o,w,Instant.now().toEpochMilli()))continue;String id=o.getString("id"),stamp=id+":"+o.getDouble("price");if(stamp.equals(p.getString("sent:"+id,"")))continue;Intent open=new Intent(this,MainActivity.class).putExtra("openStore",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);PendingIntent pi=PendingIntent.getActivity(this,id.hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);Notification note=new Notification.Builder(this,"price_targets").setSmallIcon(android.R.drawable.star_on).setContentTitle("وصلت صيدتك إلى السعر المستهدف ✦").setContentText(o.optString("title")+" · "+o.optDouble("price")+" "+o.optString("currency")).setContentIntent(pi).setAutoCancel(true).build();if(!p.getBoolean("enabled",false))return;nm.notify(id.hashCode(),note);p.edit().putString("sent:"+id,stamp).apply();emitted++;break;}}
 }
 static boolean qualifies(JSONObject o,JSONObject w,long now){try{if(!o.getString("id").equals(w.getString("id"))||w.isNull("target")||!o.getString("currency").equals(w.getString("currency")))return false;long checked=Instant.parse(o.getString("checkedAt")).toEpochMilli();String end=o.optString("endsAt");double price=o.getDouble("price"),target=w.getDouble("target");return checked<=now+300000&&now-checked<=86400000&&price>=0&&target>=0&&price<=target&&(end.isEmpty()||Instant.parse(end).toEpochMilli()>now);}catch(Exception e){return false;}}
}
