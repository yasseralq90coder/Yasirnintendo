package com.yasir.nintendo;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;
final class SecureVault implements NintendoClient.Store {
 private static final String ALIAS="yasir_nintendo_v1";
 private final Context context;
 SecureVault(Context context){this.context=context.getApplicationContext();}
 private SecretKey key() throws Exception {
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  if(!store.containsAlias(ALIAS)){
   KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
   gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setRandomizedEncryptionRequired(true).build());gen.generateKey();
  }
  return (SecretKey)store.getKey(ALIAS,null);
 }
 public synchronized JSONObject read() throws Exception {
  String value=context.getSharedPreferences("nintendo_secure",0).getString("vault",null);if(value==null)return new JSONObject();
  JSONObject box=new JSONObject(value);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(box.getString("iv"),Base64.NO_WRAP)));
  return new JSONObject(new String(c.doFinal(Base64.decode(box.getString("data"),Base64.NO_WRAP)),java.nio.charset.StandardCharsets.UTF_8));
 }
 public synchronized void write(JSONObject value) throws Exception {
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());
  JSONObject box=new JSONObject().put("iv",Base64.encodeToString(c.getIV(),Base64.NO_WRAP)).put("data",Base64.encodeToString(c.doFinal(value.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP));
  if(!context.getSharedPreferences("nintendo_secure",0).edit().putString("vault",box.toString()).commit())throw new Exception("secure_storage_failed");
 }
}
