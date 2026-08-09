/**
 * Rasterises public/icon.svg into the PWA icon set. Run with `npm run icons`
 * whenever icon.svg changes; the PNGs are committed.
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "icons");

async function main() {
  const svg = await readFile(path.join(root, "public", "icon.svg"));
  await mkdir(outDir, { recursive: true });

  await sharp(svg).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  await sharp(svg).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

  // Maskable: the source artwork inset into a safe zone on a solid background.
  const inner = await sharp(svg).resize(400, 400).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#4f46e5" },
  })
    .composite([{ input: inner, left: 56, top: 56 }])
    .png()
    .toFile(path.join(outDir, "icon-maskable-512.png"));

  console.log("icons: wrote 4 PNGs to public/icons");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
