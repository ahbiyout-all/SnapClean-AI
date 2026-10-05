import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create a stylish modern SnapClean AI Camera/Clean icon SVG
function createSvg(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.15 : size * 0.08;
  const innerSize = size - padding * 2;
  const rx = isMaskable ? 0 : size * 0.22;
  
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#6366f1" />
      </linearGradient>
      <linearGradient id="sparkle" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#34d399" />
        <stop offset="100%" stop-color="#10b981" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)" />
    
    <!-- Outer Glow Ring -->
    <circle cx="${size / 2}" cy="${size / 2}" r="${innerSize * 0.44}" fill="none" stroke="url(#accent)" stroke-width="${size * 0.035}" opacity="0.4" />
    
    <!-- Camera Body / Lens -->
    <rect x="${size * 0.22}" y="${size * 0.28}" width="${size * 0.56}" height="${size * 0.44}" rx="${size * 0.08}" fill="none" stroke="url(#accent)" stroke-width="${size * 0.04}" />
    
    <!-- Camera Flash / Top -->
    <path d="M ${size * 0.36} ${size * 0.28} L ${size * 0.42} ${size * 0.20} L ${size * 0.58} ${size * 0.20} L ${size * 0.64} ${size * 0.28} Z" fill="url(#accent)" opacity="0.8" />
    
    <!-- Lens Circle -->
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.14}" fill="url(#accent)" opacity="0.9" />
    <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.08}" fill="#0f172a" />
    <circle cx="${size * 0.53}" cy="${size * 0.47}" r="${size * 0.025}" fill="#ffffff" />
    
    <!-- Sparkle / Clean AI Magic Star -->
    <path d="M ${size * 0.72} ${size * 0.24} Q ${size * 0.72} ${size * 0.30} ${size * 0.78} ${size * 0.30} Q ${size * 0.72} ${size * 0.30} ${size * 0.72} ${size * 0.36} Q ${size * 0.72} ${size * 0.30} ${size * 0.66} ${size * 0.30} Q ${size * 0.72} ${size * 0.30} ${size * 0.72} ${size * 0.24} Z" fill="url(#sparkle)" />
  </svg>
  `;
}

async function generate() {
  console.log('Generating PWA icons...');
  
  // 192x192
  await sharp(Buffer.from(createSvg(192, false)))
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
    
  // 512x512
  await sharp(Buffer.from(createSvg(512, false)))
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
    
  // 512x512 Maskable (Android icon)
  await sharp(Buffer.from(createSvg(512, true)))
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
    
  // 180x180 Apple Touch Icon
  await sharp(Buffer.from(createSvg(180, false)))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
  // Favicon svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), createSvg(512, false));

  console.log('All PWA icons generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
