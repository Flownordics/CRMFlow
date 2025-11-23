# Netlify Dev - Lokal Udvikling Setup

Når du kører `netlify dev` lokalt, skal Netlify Functions have adgang til environment variables.

## Problem

Hvis du får 500 fejl fra Netlify Functions (fx `pdf-react`), er det sandsynligvis fordi environment variables mangler.

## Løsning

### Option 1: Opret `.env` fil (Anbefalet)

Opret en `.env` fil i projektroden med følgende variabler:

```env
# Supabase Configuration for Netlify Functions
SUPABASE_URL=https://rgimekaxpmqqlqulhpgt.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Frontend Configuration (hvis du også kører Vite)
VITE_SUPABASE_URL=https://rgimekaxpmqqlqulhpgt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Vigtigt:** 
- `.env` filen er allerede i `.gitignore`, så den bliver ikke committet
- `SUPABASE_SERVICE_KEY` er din **Service Role Key** (ikke Anon Key)
- Service Role Key findes i Supabase Dashboard → Settings → API → Service Role Key

### Option 2: Link til Netlify Site

Hvis du har linket dit projekt til et Netlify site, kan du hente environment variables derfra:

```bash
# Link til dit Netlify site (hvis ikke allerede gjort)
netlify link

# Hent environment variables fra Netlify
netlify env:list
```

Derefter vil `netlify dev` automatisk bruge environment variables fra Netlify Dashboard.

### Option 3: Sæt environment variables i netlify.toml

Du kan også tilføje environment variables direkte i `netlify.toml`:

```toml
[dev]
  command = "npm run dev"
  targetPort = 8080
  port = 8888
  autoLaunch = false
  framework = "#custom"
  publish = "."
  environment = { 
    SUPABASE_URL = "https://rgimekaxpmqqlqulhpgt.supabase.co",
    SUPABASE_SERVICE_KEY = "your-service-role-key-here"
  }
```

**Advarsel:** Dette er ikke anbefalet, da det kan eksponere secrets i version control.

## Verificer Setup

Efter du har sat environment variables op:

1. **Genstart Netlify Dev:**
   ```bash
   # Stop den nuværende server (Ctrl+C)
   # Start igen
   npm run dev:netlify
   ```

2. **Tjek Terminal Output:**
   Når du kører `netlify dev`, skal du se logs fra funktionen. Hvis der er fejl, vil de vises i terminalen.

3. **Test PDF Generation:**
   Prøv at generere en PDF igen. Hvis det stadig fejler, tjek terminal output for detaljerede fejlbeskeder.

## Debugging

Hvis du stadig får fejl:

1. **Tjek Terminal Logs:**
   Når du kører `netlify dev`, vises alle console.log statements fra funktionen i terminalen. Se efter fejlbeskeder der starter med `[PDF-React]`.

2. **Tjek Environment Variables:**
   Tilføj midlertidigt denne log i funktionen for at se hvilke variabler der er tilgængelige:
   ```javascript
   console.log('[PDF-React] Environment check:', {
     hasSupabaseUrl: !!process.env.SUPABASE_URL,
     hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
     allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
   });
   ```

3. **Tjek Netlify Dev Version:**
   ```bash
   netlify --version
   ```
   Opdater hvis nødvendigt: `npm install -g netlify-cli@latest`

## Produktion

I produktion (på Netlify) skal environment variables sættes i:
- Netlify Dashboard → Site Settings → Environment Variables

De samme variabler skal sættes der for at funktionerne virker i produktion.

