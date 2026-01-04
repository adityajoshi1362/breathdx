#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_SGP40.h>
#include <DHT.h>
#include <time.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <WebServer.h>
#include <Preferences.h>

// ---------------- OLED Configuration ----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------------- WiFi Configuration ----------------
Preferences preferences;
String ssid = "";
String password = "";
WebServer server(80);
bool wifiConfigMode = false;

// Default WiFi credentials
const char* DEFAULT_SSID = "Wifi_test";
const char* DEFAULT_PASS = "12345678";

// ---------------- Firebase Configuration ----------------
const char* FIREBASE_PROJECT_ID = "breathdx-system";
const char* FIREBASE_API_KEY = "AIzaSyDo--_nMOGCwgN3M6dZUCL3S9P8mgK9Em4";
String FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/" +
                       String(FIREBASE_PROJECT_ID) + "/databases/(default)/documents";

// ---------------- Dynamic Patient, Session & Subsession Configuration ----------------
String CURRENT_PATIENT_ID = "";
String CURRENT_SESSION_ID = "";
String CURRENT_SUBSESSION_ID = "";
bool isMonitoring = false;

// ---------------- Timing Configuration ----------------
unsigned long lastCheckTime = 0;
unsigned long lastSensorReadTime = 0;
const unsigned long CHECK_INTERVAL = 2000;
const unsigned long SENSOR_INTERVAL = 1000;
int recordCounter = 0;

// ---------------- Sensor Pins ----------------
#define DHTPIN 4
#define DHTTYPE DHT11
#define MQ2_PIN 34
#define CONFIG_BUTTON_PIN 0  // Boot button on most ESP32 boards

// ---------------- Sensor Objects ----------------
DHT dht(DHTPIN, DHTTYPE);
Adafruit_SGP40 sgp40;
HTTPClient http;

// ---------------- Subsession Result Storage ----------------
struct SubsessionData {
  float sumTemp;
  float sumHumidity;
  uint16_t lowestSGP40;
  int highestMQ2;
  int readingCount;
  bool hasData;
  String subsessionId;
} subsessionData;

// ---------------- Function Prototypes ----------------
void checkActiveMonitoring();
void readAndUploadSensorData();
void uploadSensorData(float temp, float humid, uint16_t sgp40Val, int mq2Val);
String getCurrentTimestamp();
bool connectToWiFi();
void printSessionInfo();
void setupWiFiConfig();
void startConfigPortal();
void handleRoot();
void handleSave();
void handleReset();
void displayOLED(String line1, String line2 = "", String line3 = "", String line4 = "");
void calculateAndDisplaySubsessionResult();
void resetSubsessionData();
void loadWiFiCredentials();
void saveWiFiCredentials(String ssid, String pass);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize config button
  pinMode(CONFIG_BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize preferences (for storing WiFi credentials)
  preferences.begin("wifi-config", false);
  
  // Initialize OLED
  Serial.print("Initializing OLED... ");
  if (!display.begin(0x3C, true)) {
    Serial.println("✗ OLED FAILED!");
    while (1) delay(1000);
  }
  Serial.println("✓ Done");
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("BreathDx System");
  display.println("v5.0 Subsession");
  display.println("");
  display.println("Hold BOOT for");
  display.println("WiFi Config");
  display.display();
  delay(3000);
  
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║ BreathDx ESP32 Sensor System v5.0 ║");
  Serial.println("║ Subsession Result Calculator       ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  // Check if config button is pressed during boot
  if (digitalRead(CONFIG_BUTTON_PIN) == LOW) {
    Serial.println("Config button pressed - Starting WiFi configuration portal...");
    displayOLED("Config Mode", "Starting AP...");
    delay(1000);
    startConfigPortal();
    return; // Stay in config mode
  }
  
  // Load saved WiFi credentials
  loadWiFiCredentials();
  
  Serial.print("Initializing DHT11... ");
  displayOLED("Initializing", "DHT11...");
  dht.begin();
  Serial.println("✓ Done");
  delay(1000);
  
  Serial.print("Initializing SGP40... ");
  displayOLED("Initializing", "SGP40...");
  if (!sgp40.begin()) {
    Serial.println("✗ FAILED!");
    displayOLED("ERROR!", "SGP40 Failed", "Check I2C");
    while (1) delay(1000);
  }
  Serial.println("✓ Done");
  delay(1000);
  
  Serial.print("Initializing MQ-2... ");
  displayOLED("Initializing", "MQ-2...");
  pinMode(MQ2_PIN, INPUT);
  Serial.println("✓ Done");
  delay(1000);
  
  if (!connectToWiFi()) {
    Serial.println("WiFi connection failed. Hold BOOT button and restart for config.");
    displayOLED("WiFi Failed!", "Hold BOOT &", "Restart for", "Config");
    delay(10000);
    ESP.restart();
  }
  
  Serial.print("Syncing time with NTP... ");
  displayOLED("Syncing Time", "NTP Server...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  delay(2000);
  Serial.println("✓ Done");
  
  // Initialize subsession data
  resetSubsessionData();
  
  displayOLED("System Ready", "Awaiting", "Commands...");
  Serial.println("\n┌─────────────────────────────────────┐");
  Serial.println("│ System Ready - Awaiting Commands │");
  Serial.println("└─────────────────────────────────────┘\n");
  Serial.println("Hold BOOT button for 3 seconds to reconfigure WiFi\n");
}

void loop() {
  // Check for long press on config button (3 seconds)
  static unsigned long buttonPressStart = 0;
  static bool buttonPressed = false;
  
  if (digitalRead(CONFIG_BUTTON_PIN) == LOW) {
    if (!buttonPressed) {
      buttonPressed = true;
      buttonPressStart = millis();
    } else if (millis() - buttonPressStart > 3000) {
      Serial.println("Config button held - Starting WiFi configuration...");
      displayOLED("Config Mode", "Restarting...");
      delay(1000);
      ESP.restart();
    }
  } else {
    buttonPressed = false;
  }
  
  // Handle config portal if in config mode
  if (wifiConfigMode) {
    server.handleClient();
    return;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected. Reconnecting...");
    displayOLED("WiFi Lost", "Reconnecting...");
    if (!connectToWiFi()) {
      delay(5000);
      return;
    }
  }
  
  unsigned long currentTime = millis();
  
  if (currentTime - lastCheckTime >= CHECK_INTERVAL) {
    lastCheckTime = currentTime;
    checkActiveMonitoring();
  }
  
  if (isMonitoring && (currentTime - lastSensorReadTime >= SENSOR_INTERVAL)) {
    lastSensorReadTime = currentTime;
    readAndUploadSensorData();
  }
}

void resetSubsessionData() {
  subsessionData.sumTemp = 0;
  subsessionData.sumHumidity = 0;
  subsessionData.lowestSGP40 = 65535; // Max uint16_t value
  subsessionData.highestMQ2 = 0;
  subsessionData.readingCount = 0;
  subsessionData.hasData = false;
  subsessionData.subsessionId = "";
}

void loadWiFiCredentials() {
  ssid = preferences.getString("ssid", "");
  password = preferences.getString("password", "");
  
  if (ssid.length() == 0) {
    Serial.println("No saved WiFi credentials found. Using defaults.");
    ssid = DEFAULT_SSID;
    password = DEFAULT_PASS;
  } else {
    Serial.println("Loaded saved WiFi credentials:");
    Serial.print("SSID: ");
    Serial.println(ssid);
  }
}

void saveWiFiCredentials(String newSsid, String newPass) {
  preferences.putString("ssid", newSsid);
  preferences.putString("password", newPass);
  Serial.println("WiFi credentials saved to flash memory");
}

void startConfigPortal() {
  wifiConfigMode = true;
  
  // Start Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAP("BreathDx-Config", "12345678");
  
  IPAddress IP = WiFi.softAPIP();
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║    WiFi Configuration Portal       ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println("\nConnect to WiFi:");
  Serial.println("  SSID: BreathDx-Config");
  Serial.println("  Password: 12345678");
  Serial.print("\nThen open: http://");
  Serial.println(IP);
  Serial.println("\n════════════════════════════════════════\n");
  
  displayOLED("WiFi Config", "SSID:", "BreathDx-Config", IP.toString().c_str());
  
  // Setup web server
  server.on("/", handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/reset", handleReset);
  server.begin();
  
  Serial.println("Web server started. Waiting for configuration...");
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>";
  html += "body{font-family:Arial;margin:0;padding:20px;background:#f0f0f0}";
  html += ".container{max-width:400px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}";
  html += "h1{color:#2196F3;text-align:center;margin-bottom:20px}";
  html += "label{display:block;margin:10px 0 5px;font-weight:bold;color:#555}";
  html += "input{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box}";
  html += "button{width:100%;padding:12px;margin-top:15px;border:none;border-radius:5px;font-size:16px;cursor:pointer}";
  html += ".save{background:#4CAF50;color:white}.save:hover{background:#45a049}";
  html += ".reset{background:#f44336;color:white;margin-top:10px}.reset:hover{background:#da190b}";
  html += ".info{background:#e3f2fd;padding:10px;border-radius:5px;margin-bottom:15px;font-size:14px}";
  html += "</style></head><body>";
  html += "<div class='container'>";
  html += "<h1>🔧 BreathDx WiFi Setup</h1>";
  html += "<div class='info'>Current SSID: <strong>" + ssid + "</strong></div>";
  html += "<form action='/save' method='POST'>";
  html += "<label>WiFi Network Name (SSID)</label>";
  html += "<input type='text' name='ssid' placeholder='Enter WiFi SSID' required>";
  html += "<label>WiFi Password</label>";
  html += "<input type='password' name='password' placeholder='Enter WiFi Password' required>";
  html += "<button type='submit' class='save'>💾 Save & Restart</button>";
  html += "</form>";
  html += "<button onclick='location.href=\"/reset\"' class='reset'>🔄 Reset to Default</button>";
  html += "</div></body></html>";
  
  server.send(200, "text/html", html);
}

void handleSave() {
  String newSsid = server.arg("ssid");
  String newPassword = server.arg("password");
  
  if (newSsid.length() > 0 && newPassword.length() > 0) {
    saveWiFiCredentials(newSsid, newPassword);
    
    String html = "<!DOCTYPE html><html><head>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0}";
    html += ".success{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:400px;margin:0 auto}";
    html += "h1{color:#4CAF50}</style></head><body>";
    html += "<div class='success'><h1>✅ Success!</h1>";
    html += "<p>WiFi credentials saved.</p><p>ESP32 is restarting...</p>";
    html += "<p>Connect to your WiFi and check Serial Monitor.</p></div>";
    html += "</body></html>";
    
    server.send(200, "text/html", html);
    
    delay(2000);
    ESP.restart();
  } else {
    server.send(400, "text/html", "Invalid credentials");
  }
}

void handleReset() {
  saveWiFiCredentials(DEFAULT_SSID, DEFAULT_PASS);
  
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0}";
  html += ".success{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:400px;margin:0 auto}";
  html += "h1{color:#2196F3}</style></head><body>";
  html += "<div class='success'><h1>🔄 Reset Complete</h1>";
  html += "<p>WiFi reset to default settings.</p><p>ESP32 is restarting...</p></div>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
  
  delay(2000);
  ESP.restart();
}

bool connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  displayOLED("WiFi Connect", ssid.c_str(), "Connecting...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print(" IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print(" Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm\n");
    
    displayOLED("WiFi Connected", WiFi.localIP().toString().c_str(), 
                String("RSSI: " + String(WiFi.RSSI()) + "dBm").c_str());
    delay(2000);
    return true;
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    displayOLED("WiFi Failed!", "Hold BOOT &", "Restart");
    return false;
  }
}

void checkActiveMonitoring() {
  String url = FIRESTORE_URL + "/active_monitoring/current?key=" + FIREBASE_API_KEY;
  http.begin(url);
  http.setTimeout(5000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, payload);
    
    if (error) {
      Serial.print("⚠ JSON parsing failed: ");
      Serial.println(error.c_str());
      http.end();
      return;
    }
    
    if (doc.containsKey("fields")) {
      String patientId = doc["fields"]["patient_id"]["stringValue"] | "";
      String sessionId = doc["fields"]["session_id"]["stringValue"] | "";
      String subsessionId = doc["fields"]["subsession_id"]["stringValue"] | "";
      bool monitoring = doc["fields"]["monitoring"]["booleanValue"] | false;
      
      if (monitoring && !patientId.isEmpty() && !sessionId.isEmpty() && !subsessionId.isEmpty()) {
        // Check if subsession changed
        if (CURRENT_SUBSESSION_ID != subsessionId) {
          // If we were monitoring a previous subsession, calculate and display result
          if (subsessionData.hasData && !CURRENT_SUBSESSION_ID.isEmpty()) {
            calculateAndDisplaySubsessionResult();
          }
          
          // Reset for new subsession
          CURRENT_PATIENT_ID = patientId;
          CURRENT_SESSION_ID = sessionId;
          CURRENT_SUBSESSION_ID = subsessionId;
          recordCounter = 0;
          resetSubsessionData();
          subsessionData.subsessionId = subsessionId;
          
          Serial.println("\n╔════════════════════════════════════════╗");
          Serial.println("║ NEW SUBSESSION STARTED              ║");
          Serial.println("╚════════════════════════════════════════╝");
          printSessionInfo();
          displayOLED("NEW SUBSESSION", patientId.c_str(), sessionId.c_str(), subsessionId.c_str());
          delay(3000);
        }
        
        if (!isMonitoring) {
          isMonitoring = true;
          Serial.println("▶ Data collection STARTED\n");
          displayOLED("MONITORING", "Recording...", String("Rec: " + String(recordCounter)).c_str());
        }
      } else {
        if (isMonitoring) {
          // Subsession ended - calculate and display result
          if (subsessionData.hasData) {
            calculateAndDisplaySubsessionResult();
          }
          
          Serial.println("\n■ Data collection STOPPED");
          Serial.print(" Total records uploaded: ");
          Serial.println(recordCounter);
          Serial.println("─────────────────────────────────────────\n");
          
          displayOLED("STOPPED", String("Records: " + String(recordCounter)).c_str());
          delay(2000);
          displayOLED("Awaiting", "Commands...");
          
          isMonitoring = false;
          CURRENT_PATIENT_ID = "";
          CURRENT_SESSION_ID = "";
          CURRENT_SUBSESSION_ID = "";
          recordCounter = 0;
          resetSubsessionData();
        }
      }
    }
  }
  http.end();
}

void calculateAndDisplaySubsessionResult() {
  if (!subsessionData.hasData || subsessionData.readingCount == 0) {
    return;
  }
  
  // Calculate averages
  float avgTemp = subsessionData.sumTemp / subsessionData.readingCount;
  float avgHumidity = subsessionData.sumHumidity / subsessionData.readingCount;
  uint16_t lowestSGP40 = subsessionData.lowestSGP40;
  int highestMQ2 = subsessionData.highestMQ2;
  
  // Display on Serial Monitor (minimal info)
  Serial.print("Avg Temp: "); Serial.print(avgTemp, 2); Serial.print("°C | ");
  Serial.print("Avg Humid: "); Serial.print(avgHumidity, 2); Serial.print("% | ");
  Serial.print("Low SGP40: "); Serial.print(lowestSGP40); Serial.print(" | ");
  Serial.print("High MQ2: "); Serial.println(highestMQ2);
  
  // Display on OLED - Single page
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("SUBSESSION RESULT");
  display.println("──────────────");
  display.print("Temp: "); display.print(avgTemp, 1); display.println(" C");
  display.print("Humid: "); display.print(avgHumidity, 1); display.println(" %");
  display.print("SGP40: "); display.println(lowestSGP40);
  display.print("MQ2: "); display.println(highestMQ2);
  display.display();
  
  // Wait until next monitoring starts OR 10 seconds pass
  unsigned long resultDisplayStart = millis();
  bool wasMonitoring = isMonitoring;
  
  while (millis() - resultDisplayStart < 10000) {
    // Check if monitoring status changed
    if (isMonitoring != wasMonitoring) {
      break;
    }
    delay(100);
  }
  
  // Return to appropriate display
  if (isMonitoring) {
    displayOLED("MONITORING", String("Rec: " + String(recordCounter)).c_str());
  } else {
    displayOLED("Awaiting", "Commands...");
  }
}

void printSessionInfo() {
  Serial.print(" Patient ID: "); Serial.println(CURRENT_PATIENT_ID);
  Serial.print(" Session ID: "); Serial.println(CURRENT_SESSION_ID);
  Serial.print(" Subsession ID: "); Serial.println(CURRENT_SUBSESSION_ID);
  Serial.println(" Status: ACTIVE");
}

void readAndUploadSensorData() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  if (isnan(temperature) || isnan(humidity)) {
    temperature = 25.0;
    humidity = 50.0;
  }
  uint16_t sgp40_raw = sgp40.measureRaw(temperature, humidity);
  int mq2_adc = analogRead(MQ2_PIN);
  
  // Update subsession statistics
  subsessionData.sumTemp += temperature;
  subsessionData.sumHumidity += humidity;
  if (sgp40_raw < subsessionData.lowestSGP40) {
    subsessionData.lowestSGP40 = sgp40_raw;
  }
  if (mq2_adc > subsessionData.highestMQ2) {
    subsessionData.highestMQ2 = mq2_adc;
  }
  subsessionData.readingCount++;
  subsessionData.hasData = true;
  
  Serial.printf("Record #%-4d | T: %5.1f°C | H: %5.1f%% | SGP40: %-5u | MQ2: %-4d", 
                recordCounter + 1, temperature, humidity, sgp40_raw, mq2_adc);
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("RECORDING");
  display.print("Rec #"); display.println(recordCounter + 1);
  display.println("══════════════");
  display.print("T:"); display.print(temperature, 1); display.print(" H:"); display.println(humidity, 0);
  display.print("S1:"); display.print(sgp40_raw); display.print(" S2:"); display.println(mq2_adc);
  display.display();
  
  uploadSensorData(temperature, humidity, sgp40_raw, mq2_adc);
  recordCounter++;
}

void uploadSensorData(float temp, float humid, uint16_t sgp40Val, int mq2Val) {
  char recordId[30];
  sprintf(recordId, "data_%lu", millis());
  String url = FIRESTORE_URL + "/patients/" + CURRENT_PATIENT_ID + "/sessions/" + CURRENT_SESSION_ID + "/subsessions/" + CURRENT_SUBSESSION_ID + "/sensor_data/" + String(recordId) + "?key=" + FIREBASE_API_KEY;
  DynamicJsonDocument doc(1024);
  doc["fields"]["temperature"]["doubleValue"] = temp;
  doc["fields"]["humidity"]["doubleValue"] = humid;
  doc["fields"]["sgp40_raw"]["integerValue"] = String(sgp40Val);
  doc["fields"]["mq2_adc"]["integerValue"] = String(mq2Val);
  doc["fields"]["timestamp"]["timestampValue"] = getCurrentTimestamp();
  doc["fields"]["record_id"]["stringValue"] = String(recordId);
  String jsonString;
  serializeJson(doc, jsonString);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  int httpCode = http.PATCH(jsonString);
  if (httpCode == 200) {
    Serial.println(" ✓ Uploaded");
  } else {
    Serial.print(" ✗ Failed (HTTP "); Serial.print(httpCode); Serial.println(")");
  }
  http.end();
}

String getCurrentTimestamp() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  gmtime_r(&now, &timeinfo);
  char timestamp[30];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
  return String(timestamp);
}

void displayOLED(String line1, String line2, String line3, String line4) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println(line1);
  if (line2.length() > 0) { display.setCursor(0, 16); display.println(line2); }
  if (line3.length() > 0) { display.setCursor(0, 32); display.println(line3); }
  if (line4.length() > 0) { display.setCursor(0, 48); display.println(line4); }
  display.display();
}