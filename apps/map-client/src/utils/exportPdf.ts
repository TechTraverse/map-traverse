import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { PdfExportOptions } from '@ogc-maps/storybook-components';
import type { Map as MapLibreMap } from 'maplibre-gl';

interface ExportPdfInput {
  map: MapLibreMap;
  options: PdfExportOptions;
  legendElement?: HTMLElement | null;
  scaleBarElement?: HTMLElement | null;
  compassElement?: HTMLElement | null;
}

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: window.devicePixelRatio || 1,
    useCORS: true,
    logging: false,
  });
}

export async function exportMapAsPdf({
  map,
  options,
  legendElement,
  scaleBarElement,
  compassElement,
}: ExportPdfInput): Promise<void> {
  // Ensure the map has finished rendering before grabbing the canvas.
  await new Promise<void>((resolve) => {
    map.once('idle', () => resolve());
    map.triggerRepaint();
  });

  const mapCanvas = map.getCanvas();
  const mapDataUrl = mapCanvas.toDataURL('image/png');

  // Use landscape letter for a map-friendly aspect ratio.
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(20);
  pdf.text(options.title, margin, margin + 6);

  const headerHeight = 32;
  const legendWidth = options.includeLegend && legendElement ? 160 : 0;
  const mapBoxX = margin;
  const mapBoxY = margin + headerHeight;
  const mapBoxW = pageWidth - margin * 2 - (legendWidth > 0 ? legendWidth + 12 : 0);
  const mapBoxH = pageHeight - mapBoxY - margin;

  // Fit map image within the box preserving aspect ratio
  const mapAspect = mapCanvas.width / mapCanvas.height;
  let drawW = mapBoxW;
  let drawH = drawW / mapAspect;
  if (drawH > mapBoxH) {
    drawH = mapBoxH;
    drawW = drawH * mapAspect;
  }
  const drawX = mapBoxX + (mapBoxW - drawW) / 2;
  const drawY = mapBoxY + (mapBoxH - drawH) / 2;
  pdf.addImage(mapDataUrl, 'PNG', drawX, drawY, drawW, drawH);

  // Legend on the right (if included)
  if (options.includeLegend && legendElement) {
    try {
      const legendCanvas = await captureElement(legendElement);
      const legendDataUrl = legendCanvas.toDataURL('image/png');
      const legendBoxX = pageWidth - margin - legendWidth;
      const legendBoxY = mapBoxY;
      const legendAspect = legendCanvas.width / legendCanvas.height;
      const lW = legendWidth;
      const lH = lW / legendAspect;
      pdf.addImage(legendDataUrl, 'PNG', legendBoxX, legendBoxY, lW, Math.min(lH, mapBoxH));
    } catch {
      // Ignore legend capture failures — continue with the map-only PDF.
    }
  }

  // Scale bar (bottom-left overlay on map image)
  if (options.includeScaleBar && scaleBarElement) {
    try {
      const scaleCanvas = await captureElement(scaleBarElement);
      const scaleDataUrl = scaleCanvas.toDataURL('image/png');
      const scaleW = 140;
      const scaleAspect = scaleCanvas.width / scaleCanvas.height;
      const scaleH = scaleW / scaleAspect;
      pdf.addImage(scaleDataUrl, 'PNG', drawX + 8, drawY + drawH - scaleH - 8, scaleW, scaleH);
    } catch {
      // Ignore
    }
  }

  // North arrow / compass (top-right overlay on map image)
  if (options.includeNorthArrow && compassElement) {
    try {
      const compassCanvas = await captureElement(compassElement);
      const compassDataUrl = compassCanvas.toDataURL('image/png');
      const compassSize = 48;
      pdf.addImage(
        compassDataUrl,
        'PNG',
        drawX + drawW - compassSize - 8,
        drawY + 8,
        compassSize,
        compassSize,
      );
    } catch {
      // Ignore
    }
  }

  pdf.save(options.filename);
}
