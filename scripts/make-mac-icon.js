// Converts src/assets/logo.png into a square 1024x1024 build/icon.png that
// electron-builder turns into the macOS .icns at build time.
// mac icon.png must be square and >= 512x512; 1024x1024 is the recommended size.
const sharp = require('sharp');
const path = require('path');

const SIZE = 1024;
const src = path.join(__dirname, '..', 'src', 'assets', 'logo.png');
const out = path.join(__dirname, '..', 'build', 'icon.png');

(async () => {
  const img = sharp(src);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error('Could not read logo.png dimensions');

  // Scale the source so the larger axis fills SIZE, then centre on a
  // transparent square canvas.
  const scale = SIZE / Math.max(meta.width, meta.height);
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const ox = Math.round((SIZE - w) / 2);
  const oy = Math.round((SIZE - h) / 2);

  const resized = await img.resize(w, h, { fit: 'fill' }).png().toBuffer();

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: resized, left: ox, top: oy }])
    .png()
    .toFile(out);

  console.log('Wrote', out, `${SIZE}x${SIZE}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
