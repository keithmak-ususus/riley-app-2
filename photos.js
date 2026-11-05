// Photo helpers. Photos are stored as compressed JPEG data URLs inside Firestore documents,
// because Firebase's free Spark plan no longer includes Cloud Storage. Firestore docs are capped
// at 1 MiB, so the full image is kept well under that, and a small thumbnail is stored separately
// for the gallery.

async function toBitmap(file) {
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    URL.revokeObjectURL(url); return img;
  }
}

function render(bmp, maxSide, quality) {
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  cv.getContext("2d").drawImage(bmp, 0, 0, w, h);
  return { data: cv.toDataURL("image/jpeg", quality), w, h };
}

// Returns { full, thumb } data URLs: full ≤ ~700 KB (usually 150–300 KB), thumb ~15–25 KB.
export async function compressPhoto(file) {
  const bmp = await toBitmap(file);
  let side = 1280, q = 0.72, full = render(bmp, side, q);
  while (full.data.length > 700_000 && side > 480) { side = Math.round(side * 0.8); q = Math.max(0.55, q - 0.05); full = render(bmp, side, q); }
  const thumb = render(bmp, 320, 0.7);
  bmp.close?.();
  return { full: full.data, thumb: thumb.data, w: full.w, h: full.h };
}
