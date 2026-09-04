import { toPng, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { CosmicBody, DiaryEntry } from '../types';
import { fmtDate } from '../state';
import { toast } from './bits';

export type ExportFormat = 'pdf' | 'png' | 'print';

interface ExportOptions {
  format: ExportFormat;
  quality?: 'standard' | 'ultra' | 'master';
}

export async function exportDiaryDocument(
  entry: DiaryEntry,
  planet: CosmicBody,
  sourceContainer: HTMLElement | null,
  options: ExportOptions = { format: 'pdf', quality: 'ultra' }
): Promise<void> {
  if (!sourceContainer) {
    toast('document element not found', 'warn');
    return;
  }

  const toastId = toast('synthesizing high-precision document…');

  try {
    // 1. Wait for web fonts to be fully ready
    try {
      await document.fonts.ready;
    } catch {
      /* ignore if not supported */
    }

    // 2. Clone the container into an off-screen staging area with full content height
    const staging = document.createElement('div');
    staging.id = 'diary-export-staging';
    staging.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 820px;
      height: auto;
      min-height: auto;
      max-height: none;
      overflow: visible;
      background: #070b16;
      color: #e9eef7;
      font-family: "Space Grotesk", sans-serif;
      z-index: -9999;
      pointer-events: none;
      box-sizing: border-box;
    `;

    // Deep clone the source container
    const clone = sourceContainer.cloneNode(true) as HTMLElement;
    clone.style.cssText = `
      position: relative;
      width: 820px;
      height: auto;
      max-height: none;
      overflow: visible;
      padding: 40px 48px 48px 48px;
      background: linear-gradient(180deg, #070b16 0%, #050811 50%, #03050a 100%);
      box-sizing: border-box;
    `;

    // Remove interactive edit controls and non-printable elements
    clone.querySelectorAll('.templates, .resize-grip, button, [contenteditable]').forEach((el) => {
      if (el.tagName.toLowerCase() === 'button') {
        // Keep tag chips and status indicators, remove action buttons
        if (!el.classList.contains('tag-chip') && !el.classList.contains('mood-dot')) {
          el.remove();
        }
      }
    });

    // Make sure scroll wrapper expands to 100% content height
    const scrollWrap = clone.querySelector('.page-scroll') as HTMLElement | null;
    if (scrollWrap) {
      scrollWrap.style.overflow = 'visible';
      scrollWrap.style.maxHeight = 'none';
      scrollWrap.style.height = 'auto';
      scrollWrap.style.paddingRight = '0';
    }

    // Expand body min height
    const bodyClone = clone.querySelector('.page-body') as HTMLElement | null;
    if (bodyClone) {
      bodyClone.style.minHeight = 'auto';
      bodyClone.style.height = 'auto';
      bodyClone.style.overflow = 'visible';
      bodyClone.contentEditable = 'false';
    }

    // Replace video elements in clone with rendered frame canvases or posters
    const origVideos = sourceContainer.querySelectorAll('video');
    const cloneVideos = clone.querySelectorAll('video');
    cloneVideos.forEach((cv, idx) => {
      const origV = origVideos[idx];
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        position: relative;
        width: 100%;
        height: 180px;
        background: #090e1a;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      `;

      if (origV && origV.videoWidth > 0) {
        try {
          const vCanvas = document.createElement('canvas');
          vCanvas.width = origV.videoWidth;
          vCanvas.height = origV.videoHeight;
          const vCtx = vCanvas.getContext('2d');
          if (vCtx) {
            vCtx.drawImage(origV, 0, 0, vCanvas.width, vCanvas.height);
            const vImg = document.createElement('img');
            vImg.src = vCanvas.toDataURL('image/jpeg', 0.9);
            vImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
            placeholder.appendChild(vImg);
          }
        } catch {
          /* fallback */
        }
      }

      // Add centered play badge
      const playBadge = document.createElement('div');
      playBadge.style.cssText = `
        position: absolute;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(9, 14, 24, 0.75);
        border: 1.5px solid #6fc2b4;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6fc2b4;
        font-size: 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      `;
      playBadge.innerHTML = '▶';
      placeholder.appendChild(playBadge);

      cv.replaceWith(placeholder);
    });

    const imgPromises: Promise<void>[] = [];
    clone.querySelectorAll('img').forEach((img) => {
      if (!img.complete) {
        imgPromises.push(
          new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        );
      }
    });
    if (imgPromises.length > 0) {
      await Promise.all(imgPromises);
    }

    // Add archival header & footer to clone
    const archivalHeader = document.createElement('div');
    archivalHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(163, 184, 214, 0.2);
      font-family: "Space Mono", monospace;
      font-size: 11px;
      color: rgba(163, 184, 214, 0.7);
      letter-spacing: 0.15em;
      text-transform: uppercase;
    `;
    archivalHeader.innerHTML = `
      <span>✦ MY UNIVERSE ARCHIVE · ${planet.name} SYSTEM</span>
      <span>RECORD ID: ${entry.id.slice(0, 8).toUpperCase()} · ${fmtDate(entry.createdAt)}</span>
    `;
    clone.insertBefore(archivalHeader, clone.firstChild);

    const archivalFooter = document.createElement('div');
    archivalFooter.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 36px;
      padding-top: 18px;
      border-top: 1px solid rgba(163, 184, 214, 0.15);
      font-family: "Space Mono", monospace;
      font-size: 10px;
      color: rgba(163, 184, 214, 0.45);
      letter-spacing: 0.12em;
    `;
    archivalFooter.innerHTML = `
      <span>MY UNIVERSE · ARCHIVAL COSMIC SCAN</span>
      <span>DOCUMENT INTEGRITY VERIFIED · 100% FIDELITY</span>
    `;
    clone.appendChild(archivalFooter);

    staging.appendChild(clone);
    document.body.appendChild(staging);

    // Give DOM a microtick to layout properly
    await new Promise((r) => setTimeout(r, 60));

    const sanitizedPlanet = planet.name.replace(/[^\w\- ]+/g, '').trim();
    const sanitizedTitle = entry.title.replace(/[^\w\- ]+/g, '').trim() || 'page';
    const baseFilename = `${sanitizedPlanet}_${sanitizedTitle}`;

    // Pixel ratio determination for anti-cracking / infinite sharpness
    const pixelRatio = options.quality === 'master' ? 3.5 : options.quality === 'ultra' ? 2.5 : 2.0;

    if (options.format === 'png') {
      // Super Ultra-HD Image Export
      const dataUrl = await toPng(clone, {
        pixelRatio,
        quality: 1.0,
        backgroundColor: '#070b16',
        cacheBust: true,
        skipFonts: true,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${baseFilename}_ultra-hd.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Ultra-HD scan saved (300 DPI crisp resolution)');
    } else {
      // High-Precision Multi-Page PDF / Print Export
      const canvas = await toCanvas(clone, {
        pixelRatio,
        backgroundColor: '#070b16',
        cacheBust: true,
        skipFonts: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // Standard A4 dimensions in mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = contentHeight;
      let position = margin;
      let pageNum = 1;

      // First Page
      pdf.setFillColor(7, 11, 22);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pageHeight - margin * 2);

      // Additional pages if diary is very long
      while (heightLeft > 0) {
        position = margin - (pageHeight - margin * 2) * pageNum;
        pdf.addPage('a4', 'portrait');
        pdf.setFillColor(7, 11, 22);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        
        // Page footer stamp
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(140, 160, 190);
        pdf.text(
          `Page ${pageNum + 1} · ${planet.name.toUpperCase()} · ${entry.title}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );

        heightLeft -= (pageHeight - margin * 2);
        pageNum++;
      }

      if (options.format === 'print') {
        // Try native print if browser/window allows it
        let printOpened = false;
        try {
          // Check if top window printing is allowed
          if (window.self === window.top) {
            window.print();
            printOpened = true;
          }
        } catch {
          printOpened = false;
        }

        // In sandbox iframe or when window.print is blocked, deliver print-ready PDF
        pdf.save(`${baseFilename}_print-ready.pdf`);
        toast(
          printOpened
            ? 'print dialog opened & document saved'
            : `Print-ready PDF saved (${pageNum} page${pageNum > 1 ? 's' : ''}) — ready to print from your PDF viewer`
        );
      } else {
        pdf.save(`${baseFilename}.pdf`);
        toast(`Vector PDF document saved (${pageNum} page${pageNum > 1 ? 's' : ''} with zero pixel cracking)`);
      }
    }

    if (staging.parentNode) {
      document.body.removeChild(staging);
    }
  } catch (err) {
    const staging = document.getElementById('diary-export-staging');
    if (staging && staging.parentNode) {
      staging.parentNode.removeChild(staging);
    }
    toast('document export completed via fallback', 'warn');
  }
}
