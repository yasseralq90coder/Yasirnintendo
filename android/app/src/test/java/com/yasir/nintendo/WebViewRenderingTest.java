package com.yasir.nintendo;
import org.junit.Test;
import static org.junit.Assert.*;
public class WebViewRenderingTest {
 @Test public void onlyLegacyProvidersUseCompatibilityRendering(){
  assertTrue(WebViewRendering.needsSoftwareLayer("74.0.3729.185"));
  assertTrue(WebViewRendering.needsSoftwareLayer("70.0.1"));
  assertFalse(WebViewRendering.needsSoftwareLayer("75.0.0"));
  assertFalse(WebViewRendering.needsSoftwareLayer("156.0.1"));
  assertFalse(WebViewRendering.needsSoftwareLayer(null));
  assertFalse(WebViewRendering.needsSoftwareLayer("unknown"));
  assertFalse(WebViewRendering.needsSoftwareLayer("0"));
 }
}
