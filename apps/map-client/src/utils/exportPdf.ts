import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  computeMetricScale,
  type PdfExportOptions,
} from '@ogc-maps/storybook-components';
import type { Map as MapLibreMap } from 'maplibre-gl';

interface ExportPdfInput {
  map: MapLibreMap;
  options: PdfExportOptions;
  legendElement?: HTMLElement | null;
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
  const headerHeight = 32;

  // Capture the legend first so the layout math can react to the real result.
  // A reserved-but-empty legend column is the source of the left-shift bug.
  let legendCanvas: HTMLCanvasElement | null = null;
  if (options.includeLegend && legendElement) {
    try {
      legendCanvas = await captureElement(legendElement);
      if (legendCanvas.width === 0 || legendCanvas.height === 0) {
        legendCanvas = null;
      }
    } catch (err) {
      console.warn('[exportPdf] legend capture failed, rendering map-only PDF', err);
      legendCanvas = null;
    }
  }

  const legendColumnWidth = legendCanvas ? 160 : 0;
  const legendGutter = legendCanvas ? 12 : 0;
  const mapBoxX = margin;
  const mapBoxY = margin + headerHeight;
  const mapBoxW = pageWidth - margin * 2 - legendColumnWidth - legendGutter;
  const mapBoxH = pageHeight - mapBoxY - margin;

  // Fit map image within the box preserving aspect ratio
  const mapAspect = mapCanvas.width / mapCanvas.height;
  let drawW = mapBoxW;
  let drawH = drawW / mapAspect;
  if (drawH > mapBoxH) {
    drawH = mapBoxH;
    drawW = drawH * mapAspect;
  }
  // When there's no legend, center the map on the full page so it doesn't
  // sit off to the left. With a legend, keep the map centered in its reduced
  // box and let the legend occupy the reserved column on the right.
  const drawX = legendCanvas
    ? mapBoxX + (mapBoxW - drawW) / 2
    : (pageWidth - drawW) / 2;
  const drawY = mapBoxY + (mapBoxH - drawH) / 2;
  pdf.addImage(mapDataUrl, 'PNG', drawX, drawY, drawW, drawH);

  // Title — centered above the actual map image so it stays visually attached.
  pdf.setFontSize(18);
  pdf.setTextColor(20);
  pdf.text(options.title, drawX + drawW / 2, margin + 6, { align: 'center' });

  // Legend on the right (if captured)
  if (legendCanvas) {
    const legendDataUrl = legendCanvas.toDataURL('image/png');
    const legendBoxX = pageWidth - margin - legendColumnWidth;
    const legendBoxY = mapBoxY;
    const legendAspect = legendCanvas.width / legendCanvas.height;
    const lW = legendColumnWidth;
    const lH = lW / legendAspect;
    pdf.addImage(legendDataUrl, 'PNG', legendBoxX, legendBoxY, lW, Math.min(lH, mapBoxH));
  }

  // Scale bar (bottom-left overlay on map image) — drawn natively in the PDF
  // from the map's current zoom + center latitude. The virtual zoom adjusts
  // the "meters per pixel" math so widthPx is reported in PDF points.
  if (options.includeScaleBar) {
    const zoom = map.getZoom();
    const latitude = map.getCenter().lat;
    const maxBarPt = 120;
    // Adjusting zoom by log2(canvas.width / drawW) converts the helper's
    // "screen pixel" unit into "PDF point" for this export.
    const virtualZoom = zoom + Math.log2(mapCanvas.width / drawW);
    const { label, widthPx: barPt } = computeMetricScale(virtualZoom, latitude, maxBarPt);
    const padding = 6;
    const barHeight = 4;
    const labelFontSize = 9;
    const boxW = Math.max(barPt, 40) + padding * 2;
    const boxH = labelFontSize + barHeight + padding * 2;
    const boxX = drawX + 8;
    const boxY = drawY + drawH - boxH - 8;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(50, 50, 50);
    pdf.setLineWidth(0.5);
    pdf.rect(boxX, boxY, boxW, boxH, 'FD');
    pdf.setFontSize(labelFontSize);
    pdf.setTextColor(30);
    pdf.text(label, boxX + padding, boxY + padding + labelFontSize - 2);
    pdf.setDrawColor(20);
    pdf.setLineWidth(1);
    const barY = boxY + padding + labelFontSize;
    pdf.line(boxX + padding, barY, boxX + padding + barPt, barY);
    pdf.line(boxX + padding, barY, boxX + padding, barY - barHeight);
    pdf.line(boxX + padding + barPt, barY, boxX + padding + barPt, barY - barHeight);
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
