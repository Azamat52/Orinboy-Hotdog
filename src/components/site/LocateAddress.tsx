import { useEffect, useRef, useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";

export type DeliveryPoint = { lat: number; lng: number; name: string };
export default function LocateAddress({
  value,
  onFound,
}: {
  value: string;
  onFound: (point: DeliveryPoint) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), [value]);
  function locate() {
    if (!window.isSecureContext)
      return setMessage("Joylashuv uchun saytni HTTPS yoki localhost orqali oching.");
    if (!navigator.geolocation)
      return setMessage("Qurilmada joylashuv xizmati mavjud emas. Manzilni yozing.");
    stop.current();
    setBusy(true);
    setMessage("Joylashuv aniqlanmoqda…");
    let best: GeolocationCoordinates | undefined;
    let finished = false;
    const controller = new AbortController();
    const cancel = () => {
      finished = true;
      navigator.geolocation.clearWatch(watch);
      clearTimeout(deadline);
      controller.abort();
      setBusy(false);
    };
    async function finish(error?: GeolocationPositionError) {
      if (finished) return;
      finished = true;
      navigator.geolocation.clearWatch(watch);
      clearTimeout(deadline);
      if (!best || error?.code === 1) {
        setBusy(false);
        setMessage(
          error?.code === 1
            ? "Joylashuvga ruxsat berilmadi. Brauzer sozlamasidan ruxsat bering yoki manzilni yozing."
            : "Joylashuv topilmadi. Qayta urining yoki manzilni yozing.",
        );
        return;
      }
      const { latitude: lat, longitude: lng, accuracy } = best;
      let name = lat.toFixed(6) + ", " + lng.toFixed(6);
      const timeout = setTimeout(() => lookup.abort(), 6000);
      const lookup = new AbortController();
      controller.signal.addEventListener("abort", () => lookup.abort(), { once: true });
      try {
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.search = new URLSearchParams({
          format: "jsonv2",
          lat: String(lat),
          lon: String(lng),
          zoom: "18",
          "accept-language": "uz",
        }).toString();
        const result = await fetch(url, { signal: lookup.signal });
        if (result.ok) name = (await result.json()).display_name || name;
      } catch {
        /* Keep the coordinates if the address service is unavailable. */
      } finally {
        clearTimeout(timeout);
      }
      if (controller.signal.aborted) return;
      onFound({ lat, lng, name });
      setMessage("Taxminiy aniqlik: " + Math.ceil(accuracy) + " m. Manzilni tekshiring.");
      setBusy(false);
    }
    const deadline = setTimeout(() => void finish(), 16000);
    const watch = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (!best || coords.accuracy < best.accuracy) best = coords;
        if (best.accuracy <= 10) void finish();
      },
      (error) => {
        if (error.code === 1 || best) void finish(error);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
    stop.current = cancel;
  }
  return (
    <div>
      <button type="button" className="profile-action" disabled={busy} onClick={locate}>
        {busy ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}{" "}
        {busy ? "Aniqlanmoqda…" : "Manzilimni aniqlash"}
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
