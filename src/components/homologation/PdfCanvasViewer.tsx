import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2 } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Renders a PDF as canvases so it works even when the browser's PDF viewer is blocked.
export const PdfCanvasViewer = ({ data }: { data: ArrayBuffer }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = ref.current;
    if (!container) return;
    container.innerHTML = "";
    setError(null);
    const task = pdfjs.getDocument({ data: data.slice(0) });
    task.promise.then(async (doc) => {
      if (cancelled) return;
      setPages(doc.numPages);
      const width = Math.max(container.clientWidth - 16, 300);
      for (let i = 1; i <= doc.numPages && !cancelled; i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const scale = width / base.width;
        const ratio = window.devicePixelRatio || 1;
        const vp = page.getViewport({ scale: scale * ratio });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.width = `${width}px`;
        canvas.className = "mx-auto mb-3 rounded border bg-card shadow-sm";
        const label = document.createElement("p");
        label.className = "mb-1 text-center text-xs text-muted-foreground";
        label.textContent = `Página ${i} de ${doc.numPages}`;
        container.append(label, canvas);
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
      }
    }).catch((e) => !cancelled && setError(e?.message ?? "Erro ao abrir PDF"));
    return () => { cancelled = true; task.destroy(); };
  }, [data]);

  return (
    <div className="flex-1 overflow-y-auto rounded border bg-muted p-2">
      {!pages && !error && <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
      {error && <p className="p-4 text-sm text-destructive">{error}</p>}
      <div ref={ref} />
    </div>
  );
};
