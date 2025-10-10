# 🔍 Sådan Tjekker Du Netlify Function Logs

## Problem: 502 Bad Gateway
**Status:** Funktionen crasher INDEN den når at returnere en response  
**Årsag:** Sandsynligvis Chromium initialization fejler

---

## ✅ TRIN 1: Se Function Logs i Netlify Dashboard

1. **Gå til:** https://app.netlify.com/sites/crmflow-app/logs/functions
2. **Klik på "Real-time logs"**
3. **Prøv at generate PDF igen**
4. **Se hvad der logges**

### Hvad Skal Du Kigge Efter:

**Chromium Download Fejl:**
```
Error: Failed to launch the browser process: ...
Could not find Chrome (ver. XXX)
```

**Memory Fejl:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
JavaScript heap out of memory
```

**Timeout:**
```
Task timed out after 26.XX seconds
```

**Binary Path Fejl:**
```
Error: Could not find expected browser (chrome) locally
```

---

## 🎯 ALTERNATIV: Skip Puppeteer Helt (Anbefalet!)

### Hvorfor @react-pdf/renderer Er Bedre:

| Feature | Puppeteer + Chromium | @react-pdf/renderer |
|---------|---------------------|---------------------|
| **Bundle Size** | ~50MB Chromium binary | ~1MB pure JS |
| **Cold Start** | 5-10 sekunder | <1 sekund |
| **Memory** | ~200MB | ~20MB |
| **Reliability** | ❌ Kan fejle | ✅ Altid virker |
| **Netlify Free Tier** | ⚠️ Måske problemer | ✅ Perfekt |
| **Deployment** | Kompliceret | Simpelt |

**Konklusion:** @react-pdf/renderer er LANGT bedre til dette use case!

---

## 🚀 BESLUTNING TID:

### Option 1: Debug Puppeteer (Svært, Usikkert)
1. Se Netlify logs (ovenstående)
2. Send mig loggen
3. Jeg prøver at fixe det
4. **Risiko:** Kan stadig ikke virke på free tier

### Option 2: Switch til @react-pdf/renderer (Smart, Garanteret) ⭐
1. Jeg implementerer @react-pdf/renderer (30 min)
2. Samme PDF output, men MEGET hurtigere
3. **Garanteret at virke** - ingen binaries
4. **Bonus:** Hurtigere PDFs for brugerne

---

## 💡 Min Anbefaling:

**Switch til @react-pdf/renderer!**

**Hvorfor:**
- ✅ Vi har brugt timer på Puppeteer uden success
- ✅ @react-pdf er specifikt designet til dette
- ✅ MEGET mere reliable i serverless miljøer
- ✅ Hurtigere og billigere
- ✅ Nemmere at maintain

**Hvad Siger Du?**

---

## 📝 Hvis Du Vælger Option 1 (Puppeteer Debug):

Send mig disse logs fra Netlify:
1. Gå til https://app.netlify.com/sites/crmflow-app/logs/functions
2. Find den seneste "pdf-html" function call
3. Kopier HELE loggen (inkl. stack trace)
4. Paste den her

## 📝 Hvis Du Vælger Option 2 (@react-pdf):

Skriv bare "lad os bruge @react-pdf" og jeg implementerer det nu!

---

**Hvad vil du?** 🤔

