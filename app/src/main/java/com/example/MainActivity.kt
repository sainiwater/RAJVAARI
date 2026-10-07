package com.example

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
          RajvaariAppScreen(modifier = Modifier.padding(innerPadding))
        }
      }
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun RajvaariAppScreen(modifier: Modifier = Modifier) {
  val context = LocalContext.current
  var webViewInstance by remember { mutableStateOf<WebView?>(null) }
  var canGoBack by remember { mutableStateOf(false) }

  BackHandler(enabled = canGoBack) {
    webViewInstance?.goBack()
  }

  Box(modifier = modifier.fillMaxSize()) {
    AndroidView(
      modifier = Modifier.fillMaxSize(),
      factory = { ctx ->
        WebView(ctx).apply {
          layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
          )

          settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
          }

          webChromeClient = WebChromeClient()

          webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
              view: WebView?,
              request: WebResourceRequest?
            ): Boolean {
              val url = request?.url?.toString() ?: return false
              return handleSpecialUrls(url)
            }

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
              if (url == null) return false
              return handleSpecialUrls(url)
            }

            private fun handleSpecialUrls(url: String): Boolean {
              // 1. UPI Payment Intent Handling (GPay, PhonePe, Paytm, BHIM)
              if (url.startsWith("upi://pay")) {
                try {
                  val upiIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                  val chooser = Intent.createChooser(upiIntent, "Pay with UPI")
                  context.startActivity(chooser)
                } catch (e: Exception) {
                  Toast.makeText(
                    context,
                    "कोई UPI ऐप नहीं मिला। कृपया QR कोड स्कैन करें या UPI ID कॉपी करें।",
                    Toast.LENGTH_LONG
                  ).show()
                }
                return true
              }

              // 2. WhatsApp Integration Handling
              if (url.startsWith("whatsapp://") || url.contains("api.whatsapp.com") || url.contains("wa.me")) {
                try {
                  val waIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                  context.startActivity(waIntent)
                } catch (e: Exception) {
                  try {
                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    context.startActivity(browserIntent)
                  } catch (ex: Exception) {
                    Toast.makeText(
                      context,
                      "WhatsApp खोलने में असमर्थ",
                      Toast.LENGTH_SHORT
                    ).show()
                  }
                }
                return true
              }

              // 3. Telephone dialer
              if (url.startsWith("tel:")) {
                try {
                  val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse(url))
                  context.startActivity(dialIntent)
                } catch (_: Exception) {}
                return true
              }

              // 4. In-page anchors or standard web assets
              if (url.startsWith("file:///android_asset/web/") || url.startsWith("#")) {
                return false
              }

              // Default external link in browser
              return try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(intent)
                true
              } catch (e: Exception) {
                false
              }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
              super.onPageFinished(view, url)
              canGoBack = view?.canGoBack() ?: false
            }
          }

          loadUrl("file:///android_asset/web/index.html")
          webViewInstance = this
        }
      },
      update = { wv ->
        canGoBack = wv.canGoBack()
      }
    )
  }
}
