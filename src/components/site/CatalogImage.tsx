import { useState, type ImgHTMLAttributes } from "react";

export default function CatalogImage({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState<string>();
  const fallback = !src || failed === src;
  return (
    <img
      {...props}
      src={fallback ? "/orinboy-madir-logo.jpeg" : src}
      alt={fallback ? "Mahsulot rasmi mavjud emas" : alt}
      style={
        fallback ? { objectFit: "contain", padding: "12%", background: "var(--ink2)" } : undefined
      }
      onError={() => {
        if (!fallback) setFailed(src);
      }}
    />
  );
}
