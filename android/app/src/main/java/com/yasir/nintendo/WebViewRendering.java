package com.yasir.nintendo;
import android.content.pm.PackageInfo;
import android.view.View;
import android.webkit.WebView;
/** Compatibility for the factory Chromium 74 GPU glyph-raster crash observed on API 29. */
final class WebViewRendering {
 private WebViewRendering() {}
 static boolean needsSoftwareLayer(String version) {
  if(version==null)return false;
  try {int major=Integer.parseInt(version.split("\\.",2)[0]);return major>0&&major<=74;}
  catch(NumberFormatException e){return false;}
 }
 static void configure(WebView view) {
  PackageInfo provider=WebView.getCurrentWebViewPackage();
  // Modern providers retain hardware rendering. No browser security setting changes.
  if(provider!=null&&needsSoftwareLayer(provider.versionName))view.setLayerType(View.LAYER_TYPE_SOFTWARE,null);
 }
}
