# KZodi - GitHub သို့ Upload လုပ်နည်း

## ၁။ Git စတင်ပါ

**ကွန်ပျူတာမှာ Git မရှိရင်** အောက်ပါ link မှ download ယူပြီး install လုပ်ပါ။

**Download:** https://git-scm.com/download/win

Install ပြီးရင် **PowerShell သို့မဟုတ် Terminal ကို restart** လုပ်ပါ။

---

## ၂။ Upload Script ကို Run ပါ

PowerShell ဖွင့်ပြီး project folder သို့သွားပါ။

```powershell
cd c:\Users\Administrator\KZodi
powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1
```

သို့မဟုတ် **upload-to-github.ps1** ဖိုင်ကို Right-click လုပ်ပြီး **"Run with PowerShell"** ရွေးပါ။

---

## ၃။ GitHub Authentication

Push လုပ်သည့်အခါ GitHub က login လုပ်ခိုင်းပါက:

- **Option A:** GitHub Desktop သုံးပါ (အလွယ်ဆုံး)
- **Option B:** Personal Access Token သုံးပါ
  - GitHub → Settings → Developer settings → Personal access tokens
  - Token ဖန်တီးပြီး password အစား သုံးပါ
- **Option C:** SSH Key သုံးပါ

---

## ၄။ Manual Commands (Script မသုံးပါက)

```powershell
cd c:\Users\Administrator\KZodi
git init
git remote add origin https://github.com/Wyattx3/KZodi.git
git add .
git commit -m "Initial commit: KZodi - Zodiac Compatibility App"
git branch -M main
git push -u origin main
```

---

## Repository Link

https://github.com/Wyattx3/KZodi
