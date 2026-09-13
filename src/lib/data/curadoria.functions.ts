const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const TARGET_BYTES = 450 * 1024;
const MAX_EDGE = 1600;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler esta imagem."));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível compactar a imagem.")),
      "image/webp",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível preparar a imagem para envio."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compacta uma imagem no navegador antes de enviá-la ao Turso.
 * Assim o formulário público aceita arquivo sem depender de um storage externo.
 */
export async function compressContributionImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("A imagem original pode ter no máximo 12 MB.");

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));
  let quality = 0.86;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Seu navegador não conseguiu preparar a imagem.");
    ctx.drawImage(image, 0, 0, width, height);
    blob = await canvasBlob(canvas, quality);
    if (blob.size <= TARGET_BYTES) break;
    quality = Math.max(0.5, quality - 0.09);
    if (attempt >= 3) {
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }
  }

  if (!blob) throw new Error("Não foi possível preparar a imagem.");
  if (blob.size > 650 * 1024) throw new Error("A imagem continua muito grande após a compactação. Escolha outra foto.");
  return blobToDataUrl(blob);
}

export function isInlineImage(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith("data:image/"));
}
