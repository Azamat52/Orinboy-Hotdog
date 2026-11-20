import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { Spinner } from "@/admin/components/loader";
import { fetchReceipt } from "@/admin/lib/admin.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ReceiptPreview({
  id,
  kind,
  dataUrl,
}: {
  id: string;
  kind: "order" | "reservation";
  dataUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="my-2 flex" size="sm" variant="outline">
          <Receipt />
          Chekni ko‘rish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{kind === "order" ? "Buyurtma cheki" : "Bron cheki"}</DialogTitle>
          <DialogDescription>Summani bankdagi tushum bilan solishtiring.</DialogDescription>
        </DialogHeader>
        {open && <ReceiptContent key={id} id={id} kind={kind} dataUrl={dataUrl} />}
      </DialogContent>
    </Dialog>
  );
}

function ReceiptContent({ id, kind, dataUrl }) {
  const [file, setFile] = useState<{ url: string; pdf: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let url = "";
    fetchReceipt({ id, kind, dataUrl })
      .then((blob) => {
        if (!active) return;
        if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(blob.type))
          throw new Error("Chek formati qo‘llab-quvvatlanmaydi.");
        url = URL.createObjectURL(blob);
        setFile({ url, pdf: blob.type === "application/pdf" });
      })
      .catch((err) => {
        if (active) setError(err.message || "Chekni yuklab bo‘lmadi.");
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, kind, dataUrl]);
  if (error)
    return (
      <p role="alert" className="text-destructive">
        {error}
      </p>
    );
  return (
    <div className="relative min-h-32">
      {!ready && (
        <div
          className="absolute inset-0 grid place-items-center bg-background"
          role="status"
          aria-label="Chek yuklanmoqda"
        >
          <Spinner />
        </div>
      )}
      {file &&
        (file.pdf ? (
          <iframe
            title="PDF chek"
            src={file.url}
            onLoad={() => setReady(true)}
            className="h-[65dvh] w-full"
          />
        ) : (
          <img
            alt="To‘lov cheki"
            src={file.url}
            onLoad={() => setReady(true)}
            onError={() => setError("Chek rasmini ochib bo‘lmadi.")}
            className="mx-auto max-h-[65dvh] object-contain"
          />
        ))}
    </div>
  );
}
