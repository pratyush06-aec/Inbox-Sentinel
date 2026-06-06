import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const assetDir = path.join('extension', 'assets');
fs.mkdirSync(assetDir, { recursive: true });

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });
  const bg = { r: 13, g: 110, b: 253, a: 255 };
  const fg = { r: 255, g: 255, b: 255, a: 255 };
  const center = size / 2;
  const radius = size * 0.35;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inside = dist < radius;
      const pixel = inside ? fg : bg;
      png.data[idx] = pixel.r;
      png.data[idx + 1] = pixel.g;
      png.data[idx + 2] = pixel.b;
      png.data[idx + 3] = pixel.a;
    }
  }

  return png;
}

for (const size of [16, 48, 128]) {
  const png = drawIcon(size);
  const filePath = path.join(assetDir, `icon-${size}.png`);
  const stream = fs.createWriteStream(filePath);
  png.pack().pipe(stream);
}
console.log('Generated icon files in', assetDir);
