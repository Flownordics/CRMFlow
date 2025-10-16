# PWA Icons Required

## Missing Icons

The following PWA icon files need to be generated from `/public/FLOWNORDICS6tiny.png`:

### Required Files:
- `icon-16.png` (16x16px) - Browser favicon
- `icon-32.png` (32x32px) - Browser favicon  
- `icon-48.png` (48x48px) - Windows taskbar
- `icon-180.png` (180x180px) - Apple Touch Icon
- `icon-192.png` (192x192px) - Android standard icon
- `icon-512.png` (512x512px) - Android splash screen

## How to Generate

See detailed instructions in: `/scripts/generate-pwa-icons.md`

### Quick Method:

1. Visit [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
2. Upload `FLOWNORDICS6tiny.png`
3. Download generated icons
4. Place them in this `/public` directory

## Current Status

⚠️ **Icons need to be generated before PWA will function correctly**

The app will still work without these icons, but:
- PWA installation may fail
- Browser favicons will not display
- Home screen icons will use fallback

## Priority

**Medium Priority** - Generate icons before deploying to production.

## Validation

After generating icons, validate with:
```bash
npm run build
# Check dist/manifest.json references
# Run Lighthouse PWA audit
```

