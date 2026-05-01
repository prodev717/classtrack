#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#define SS_PIN 5
#define RST_PIN 21

#define SUCCESS_PIN 13
#define FAIL_PIN 12

const char* ssid = "Wokwi-GUEST";
const char* password = "";

// backend API
const char* serverUrl = "https://classtrack-backend.vercel.app/api/attendance/tap";

// device id
String deviceId = "00:11:22:33";

MFRC522 rfid(SS_PIN, RST_PIN);

// ---------------- BLINK ----------------
void blink(int pin) {
  digitalWrite(pin, HIGH);
  delay(200);
  digitalWrite(pin, LOW);
}

// ---------------- WIFI CONNECT ----------------
void connectWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Failed");
  }
}

// ---------------- WARMUP (avoid cold start delay) ----------------
void warmupServer() {
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(15000);

  HTTPClient http;

  Serial.println("Warming up server...");

  if (http.begin(client, serverUrl)) {
    http.GET();  // just hit once
    http.end();
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  pinMode(SUCCESS_PIN, OUTPUT);
  pinMode(FAIL_PIN, OUTPUT);

  connectWiFi();
  warmupServer(); 

  SPI.begin();
  rfid.PCD_Init();

  Serial.println("RFID Ready");
}

// ---------------- LOOP ----------------
void loop() {

  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(1000);
    return;
  }

  // Check for card
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // ---- UID ----
  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(rfid.uid.uidByte[i], HEX);
    if (i != rfid.uid.size - 1) uidStr += ":";
  }

  uidStr.toLowerCase(); 

  Serial.println("UID: " + uidStr);

  // ---- HTTPS REQUEST ----
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(15000);  

  HTTPClient http;

  Serial.println("Sending request...");

  if (http.begin(client, serverUrl)) {

    http.addHeader("Content-Type", "application/json");
    http.setTimeout(15000); 

    String json = "{";
    json += "\"deviceId\":\"" + deviceId + "\",";
    json += "\"rfid\":\"" + uidStr + "\"";
    json += "}";

    Serial.println("Payload:");
    Serial.println(json);

    int code = http.POST(json);

    Serial.print("HTTP Code: ");
    Serial.println(code);

    if (code <= 0) {
      Serial.println("Error: " + http.errorToString(code));
      blink(FAIL_PIN);
    } else {
      String response = http.getString();

      Serial.println("Response:");
      Serial.println(response);

      if (code >= 200 && code < 300) {
        blink(SUCCESS_PIN);
      } else {
        blink(FAIL_PIN);
      }
    }

    http.end();

  } else {
    Serial.println("Failed to connect to server");
    blink(FAIL_PIN);
  }

  rfid.PICC_HaltA();
  delay(2000); // avoid double scan
}