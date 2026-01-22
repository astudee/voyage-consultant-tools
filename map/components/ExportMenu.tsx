'use client';

import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportMenuProps {
  workflowName: string;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  onBeforeExport?: () => Promise<void>;
}

type ExportSize = 'standard' | 'large' | 'plotter';

const sizeConfigs: Record<ExportSize, { label: string; scale: number; description: string }> = {
  standard: { label: 'Standard', scale: 2, description: 'Letter/A4 size' },
  large: { label: 'Large', scale: 3, description: 'Poster size' },
  plotter: { label: 'Plotter', scale: 4, description: 'Large format printing' },
};

export default function ExportMenu({ workflowName, mapContainerRef, onBeforeExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ExportSize>('standard');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const addHeaderToCanvas = async (
    canvas: HTMLCanvasElement,
    scale: number
  ): Promise<HTMLCanvasElement> => {
    const headerHeight = 100 * scale;
    const padding = 20 * scale;

    // Create new canvas with header space
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height + headerHeight;

    const ctx = newCanvas.getContext('2d');
    if (!ctx) return canvas;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);

    // Try to load and draw logo
    try {
      const logo = await loadImage('/voyage-logo.png');
      const logoHeight = 50 * scale;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      ctx.drawImage(logo, padding, 15 * scale, logoWidth, logoHeight);
    } catch {
      // Fallback to text if logo fails to load
      ctx.fillStyle = '#669999';
      ctx.font = `bold ${24 * scale}px Arial`;
      ctx.fillText('VOYAGE ADVISORY', padding, 45 * scale);
    }

    // Draw workflow name
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${18 * scale}px Arial`;
    ctx.fillText(workflowName, padding, 80 * scale);

    // Draw date (top right)
    ctx.fillStyle = '#666666';
    ctx.font = `${12 * scale}px Arial`;
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    ctx.fillText(date, newCanvas.width - padding - ctx.measureText(date).width, 35 * scale);

    // Draw separator line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = scale;
    ctx.beginPath();
    ctx.moveTo(padding, headerHeight - 10 * scale);
    ctx.lineTo(newCanvas.width - padding, headerHeight - 10 * scale);
    ctx.stroke();

    // Draw original canvas below header
    ctx.drawImage(canvas, 0, headerHeight);

    return newCanvas;
  };

  const captureMap = async (scale: number): Promise<HTMLCanvasElement | null> => {
    if (!mapContainerRef.current) {
      console.error('Map container ref not found');
      return null;
    }

    // Fit view to show all nodes before capturing
    if (onBeforeExport) {
      await onBeforeExport();
    }

    // Hide controls during capture
    const controls = mapContainerRef.current.querySelector('.react-flow__controls');
    const minimap = mapContainerRef.current.querySelector('.react-flow__minimap');
    const panel = mapContainerRef.current.querySelector('.react-flow__panel');

    if (controls) (controls as HTMLElement).style.display = 'none';
    if (minimap) (minimap as HTMLElement).style.display = 'none';
    if (panel) (panel as HTMLElement).style.display = 'none';

    try {
      const canvas = await html2canvas(mapContainerRef.current, {
        scale,
        backgroundColor: '#f9fafb',
        logging: true, // Enable logging to debug
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
      });
      return canvas;
    } catch (err) {
      console.error('html2canvas error:', err);
      throw err;
    } finally {
      // Restore controls
      if (controls) (controls as HTMLElement).style.display = '';
      if (minimap) (minimap as HTMLElement).style.display = '';
      if (panel) (panel as HTMLElement).style.display = '';
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const scale = sizeConfigs[selectedSize].scale;
      const canvas = await captureMap(scale);
      if (!canvas) {
        throw new Error('Failed to capture map - container not found');
      }

      const canvasWithHeader = await addHeaderToCanvas(canvas, scale);

      // Calculate PDF dimensions
      const imgWidth = canvasWithHeader.width / scale;
      const imgHeight = canvasWithHeader.height / scale;

      // Use landscape if wider than tall
      const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';

      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [imgWidth, imgHeight],
      });

      pdf.addImage(
        canvasWithHeader.toDataURL('image/png'),
        'PNG',
        0,
        0,
        imgWidth,
        imgHeight
      );

      pdf.save(`${workflowName.replace(/\s+/g, '_')}_Process_Map.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const exportToSVG = async () => {
    setIsExporting(true);
    try {
      if (!mapContainerRef.current) return;

      // Get the SVG elements from React Flow
      const svgElement = mapContainerRef.current.querySelector('svg.react-flow__edges');
      const nodesContainer = mapContainerRef.current.querySelector('.react-flow__nodes');

      if (!svgElement || !nodesContainer) {
        // Fallback to PNG if SVG extraction fails
        await exportToPNG();
        return;
      }

      // For now, export as PNG which Visio/Lucidchart can import
      await exportToPNG();
    } catch (error) {
      console.error('SVG export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const exportToPNG = async () => {
    setIsExporting(true);
    try {
      const scale = sizeConfigs[selectedSize].scale;
      const canvas = await captureMap(scale);
      if (!canvas) {
        throw new Error('Failed to capture map - container not found');
      }

      const canvasWithHeader = await addHeaderToCanvas(canvas, scale);

      // Create download link
      const link = document.createElement('a');
      link.download = `${workflowName.replace(/\s+/g, '_')}_Process_Map.png`;
      link.href = canvasWithHeader.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('PNG export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </>
        )}
      </button>

      {isOpen && !isExporting && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
          {/* Size selector */}
          <div className="px-3 py-2 border-b border-gray-100">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Size</label>
            <div className="mt-1 flex gap-1">
              {(Object.keys(sizeConfigs) as ExportSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedSize === size
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={sizeConfigs[size].description}
                >
                  {sizeConfigs[size].label}
                </button>
              ))}
            </div>
          </div>

          {/* Export options */}
          <div className="py-1">
            <button
              onClick={exportToPDF}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zm5 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5z"/>
              </svg>
              PDF Document
            </button>
            <button
              onClick={exportToPNG}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              title="Compatible with Visio and Lucidchart"
            >
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
              Image (Visio/Lucidchart)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
