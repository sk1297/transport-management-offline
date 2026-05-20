# APK Build Guide — Transport Manager

## How the License System Works

```
keygen.html  →  generates  →  LICENSE KEY  (you share with user)
                              + SHA-256 HASH (you put in .env)

APK stores only the HASH.
User enters the KEY.
App hashes the entered key and compares → match = activated.

Even if someone fully decompiles the APK, they see only the hash.
The original key CANNOT be recovered from the hash (SHA-256 is one-way).
```

No Device ID. No internet. No server. Fully offline.

---

## Step-by-Step: Build APK for a New Client

### Step 1 — Generate a key for this client
1. Open `keygen.html` in Chrome / Edge (double-click it)
2. Optionally type a custom name like `RAVI-TRANSPORT-2025` or leave blank for auto-generate
3. Click **Generate New License Key**
4. Copy the `.env` line shown (looks like `VITE_APP_KEY_HASH=abc123...`)

### Step 2 — Set the key in `.env`
Open `.env` in the project root and replace the line:
```
VITE_APP_KEY_HASH=<paste the hash from keygen here>
```

### Step 3 — Build the web bundle
```bash
npm run build
```
The obfuscator runs automatically — JS code is scrambled.

### Step 4 — Sync and build APK
```bash
npx cap sync android
cd android
./gradlew assembleRelease
```
APK is at: `android/app/build/outputs/apk/release/app-release.apk`

### Step 5 — Share with client
- Send the **APK file** via WhatsApp / Google Drive
- Send the **License Key** (green text from keygen) separately via WhatsApp/SMS
- User installs → enters key → done ✅

---

## Enable ProGuard (first time, after `npx cap add android`)

```bash
cp proguard-rules.pro android/app/proguard-rules.pro
```

In `android/app/build.gradle`, find the `release` block:
```gradle
buildTypes {
    release {
        minifyEnabled true          ← change false to true
        shrinkResources true        ← add this line
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

## Security Layers

| Layer | What it prevents |
|---|---|
| **SHA-256 hash in APK** | Key never stored in app — decompile shows only an uncrackable hash |
| **JS Obfuscator** (auto on build) | Variable names, strings, control flow all scrambled — code is unreadable |
| **Self-defending bundle** | Detects if JS is reformatted/prettified and stops working |
| **ProGuard/R8** (Android native) | Native Java code is shrunk and obfuscated |
| **Per-client APK keys** | Key from Client A's APK doesn't work in Client B's APK (different hash) |

---

## Per-Client Key Management (Recommended)

Keep a simple record:

| Client Name | Key | APK Build Date |
|---|---|---|
| Ravi Transport | TM-K9XP-M3QZ-2025 | 2025-05-20 |
| Singh Logistics | TM-P7MN-R2KQ-2025 | 2025-06-01 |

Generate a fresh key for each client → different `.env` → different APK build.
This way, if one key is shared/leaked, only that one client is affected.

---

## Development / Testing
The `.env` in the repo uses a dev-only key:
```
Key:  DEV-ONLY-DO-NOT-SHARE
```
Use this on your local machine during development. Never ship an APK built with this key.
