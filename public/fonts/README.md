# Fonts Directory

Upload your custom font files here in the following formats:
- font-regular.woff2 (weight: 400)
- font-medium.woff2 (weight: 500)
- font-semibold.woff2 (weight: 600)
- font-bold.woff2 (weight: 700)
- font-extrabold.woff2 (weight: 800)

The font configuration is set up in `app/layout.tsx` and will automatically use these files when available.

If font files are not present, the system will fallback to system fonts (system-ui, arial).

## Supported Formats
- .woff2 (recommended for best compression)
- .woff
- .ttf
- .otf

## Font Loading
The fonts are configured as local fonts using Next.js `localFont` utility, which provides better performance and privacy compared to Google Fonts.