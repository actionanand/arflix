#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const packageName = 'com.actionanand.arflix.app';
const packagePath = packageName.replaceAll('.', '/');
const javaDir = join('android', 'app', 'src', 'main', 'java', packagePath);
const mainActivityPath = join(javaDir, 'MainActivity.java');

assertAndroidProject();
mkdirSync(javaDir, { recursive: true });

writeFileSync(
  mainActivityPath,
  `package ${packageName};

import android.content.ContentValues;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatDelegate;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.net.URLConnection;

public class MainActivity extends BridgeActivity {
  private static final int SHELL_BAR_COLOR = Color.parseColor("#07080c");

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
    super.onCreate(savedInstanceState);
    disableWebViewDarkening();
    attachAndroidBridge();
    tintSystemBars();
  }

  @Override
  public void onResume() {
    super.onResume();
    tintSystemBars();
  }

  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    tintSystemBars();
  }

  private void attachAndroidBridge() {
    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView == null) return;
    webView.addJavascriptInterface(new AndroidImageSaver(), "ARFlixAndroid");
  }

  private void disableWebViewDarkening() {
    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView == null) return;

    WebSettings settings = webView.getSettings();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      settings.setForceDark(WebSettings.FORCE_DARK_OFF);
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      settings.setAlgorithmicDarkeningAllowed(false);
    }
  }

  private void tintSystemBars() {
    Window window = getWindow();
    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
    window.setStatusBarColor(SHELL_BAR_COLOR);
    window.setNavigationBarColor(SHELL_BAR_COLOR);

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      View decor = window.getDecorView();
      int flags = decor.getSystemUiVisibility();
      flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
      }
      decor.setSystemUiVisibility(flags);
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && window.getInsetsController() != null) {
      window
        .getInsetsController()
        .setSystemBarsAppearance(
          0,
          WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        );
    }
  }

  private class AndroidImageSaver {
    @JavascriptInterface
    public boolean saveImageFromUrl(String imageUrl, String fileName) {
      try {
        if (imageUrl == null || imageUrl.isEmpty()) return false;

        URLConnection connection = new URL(imageUrl).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);

        String mimeType = connection.getContentType();
        if (mimeType == null || !mimeType.startsWith("image/")) {
          mimeType = mimeTypeFromUrl(imageUrl);
        }

        try (InputStream inputStream = connection.getInputStream()) {
          return saveImageBytes(readAllBytes(inputStream), mimeType, fileName);
        }
      } catch (Exception ex) {
        showToast("Unable to save image.");
        return false;
      }
    }

    @JavascriptInterface
    public boolean saveImage(String dataUrl, String fileName) {
      try {
        if (dataUrl == null || dataUrl.isEmpty()) return false;

        String payload = dataUrl;
        int commaIndex = payload.indexOf(',');
        if (commaIndex >= 0) {
          payload = payload.substring(commaIndex + 1);
        }

        byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
        String mimeType = mimeTypeFromDataUrl(dataUrl);
        return saveImageBytes(bytes, mimeType, fileName);
      } catch (Exception ex) {
        showToast("Unable to save image.");
        return false;
      }
    }
  }

  private boolean saveImageBytes(byte[] bytes, String mimeType, String fileName) {
    try {
      String safeMimeType = mimeType == null || !mimeType.startsWith("image/") ? "image/jpeg" : mimeType;
      String safeName = sanitizeFileName(fileName, extensionForMimeType(safeMimeType));

      ContentValues values = new ContentValues();
      values.put(MediaStore.Images.Media.DISPLAY_NAME, safeName);
      values.put(MediaStore.Images.Media.MIME_TYPE, safeMimeType);
      values.put(MediaStore.Images.Media.DATE_ADDED, System.currentTimeMillis() / 1000);
      values.put(MediaStore.Images.Media.DATE_TAKEN, System.currentTimeMillis());

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        values.put(
          MediaStore.Images.Media.RELATIVE_PATH,
          Environment.DIRECTORY_PICTURES + "/ARFlix"
        );
        values.put(MediaStore.Images.Media.IS_PENDING, 1);
      }

      Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
      if (uri == null) return false;

      try (OutputStream outputStream = getContentResolver().openOutputStream(uri)) {
        if (outputStream == null) {
          getContentResolver().delete(uri, null, null);
          return false;
        }
        outputStream.write(bytes);
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ContentValues complete = new ContentValues();
        complete.put(MediaStore.Images.Media.IS_PENDING, 0);
        getContentResolver().update(uri, complete, null, null);
      }

      showToast("Image saved to Pictures/ARFlix.");
      return true;
    } catch (Exception ex) {
      showToast("Unable to save image.");
      return false;
    }
  }

  private String sanitizeFileName(String fileName, String extension) {
    String safe = fileName == null || fileName.isEmpty()
      ? "arflix-image" + extension
      : fileName.replaceAll("[^A-Za-z0-9._-]", "_");
    return safe.toLowerCase().endsWith(extension) ? safe : safe + extension;
  }

  private String mimeTypeFromDataUrl(String dataUrl) {
    if (dataUrl != null && dataUrl.startsWith("data:image/png")) {
      return "image/png";
    }
    if (dataUrl != null && dataUrl.startsWith("data:image/webp")) {
      return "image/webp";
    }
    return "image/jpeg";
  }

  private String mimeTypeFromUrl(String imageUrl) {
    if (imageUrl != null && imageUrl.toLowerCase().contains(".png")) {
      return "image/png";
    }
    if (imageUrl != null && imageUrl.toLowerCase().contains(".webp")) {
      return "image/webp";
    }
    return "image/jpeg";
  }

  private String extensionForMimeType(String mimeType) {
    if ("image/png".equals(mimeType)) return ".png";
    if ("image/webp".equals(mimeType)) return ".webp";
    return ".jpg";
  }

  private byte[] readAllBytes(InputStream inputStream) throws Exception {
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    byte[] data = new byte[8192];
    int read;

    while ((read = inputStream.read(data, 0, data.length)) != -1) {
      buffer.write(data, 0, read);
    }

    return buffer.toByteArray();
  }

  private void showToast(String message) {
    runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_LONG).show());
  }
}
`,
);

console.log('Android shell patched with native ARFlix image saving.');

function assertAndroidProject() {
  if (!existsSync(join('android', 'app'))) {
    throw new Error('Android project was not found. Run `npx cap add android` first.');
  }
}
