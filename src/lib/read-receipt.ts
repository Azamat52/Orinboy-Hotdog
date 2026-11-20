export function readReceipt(file: File): Promise<string> {
  const okImg = /^image\/(jpeg|jpg|png|webp)$/.test(file.type);
  if (file.type !== "application/pdf" && !okImg)
    return Promise.reject(new Error("Faqat rasm (JPG, PNG, WEBP) yoki PDF fayl yuklang!"));
  if (file.type === "application/pdf") {
    if (file.size > 2_000_000) return Promise.reject(new Error("PDF 2 MB dan katta bo‘lmasin."));
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("bad"));
      r.readAsDataURL(file);
    });
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad"));
    };
    img.src = url;
  });
}
