/**
 * Official Corporate Stamp & Seal Generator
 * Generates crisp, transparent PNG stamps for legal and corporate signing.
 */

export const STAMP_PRESETS = [
  {
    id: 'approved',
    title: 'Approved',
    text: 'APPROVED',
    subtext: 'AUTHORIZED SIGNATURE',
    color: '#0d5c3a', // Forest Green
    shape: 'rectangle',
    hasDate: true,
    hasStars: true
  },
  {
    id: 'confidential',
    title: 'Confidential',
    text: 'CONFIDENTIAL',
    subtext: 'DO NOT DISCLOSE',
    color: '#b91c1c', // Crimson Red
    shape: 'rectangle',
    hasDate: true,
    hasStars: false
  },
  {
    id: 'paid',
    title: 'Paid',
    text: 'PAID & SETTLED',
    subtext: 'ACCOUNTS DEPARTMENT',
    color: '#002060', // Contract Navy
    shape: 'rectangle',
    hasDate: true,
    hasStars: false
  },
  {
    id: 'official_seal',
    title: 'Official Seal',
    text: 'OFFICIAL SEAL',
    subtext: 'VERIFIED & AUTHENTICATED',
    color: '#1e40af', // Royal Blue
    shape: 'circle',
    hasDate: true,
    hasStars: true
  },
  {
    id: 'verified',
    title: 'Verified & Signed',
    text: 'VERIFIED & SIGNED',
    subtext: 'CRYPTOGRAPHIC AUDIT',
    color: '#0f766e', // Deep Teal
    shape: 'rectangle',
    hasDate: true,
    hasStars: true
  },
  {
    id: 'void',
    title: 'Void',
    text: 'VOID',
    subtext: 'CANCELLED DOCUMENT',
    color: '#991b1b', // Dark Red
    shape: 'rectangle',
    hasDate: false,
    hasStars: false
  },
  {
    id: 'draft',
    title: 'Draft',
    text: 'DRAFT',
    subtext: 'SUBJECT TO REVISION',
    color: '#b45309', // Amber
    shape: 'rectangle',
    hasDate: false,
    hasStars: false
  }
];

/**
 * Generates a high-resolution transparent PNG DataURL for a stamp
 */
export function generateStampDataUrl({
  text = 'APPROVED',
  subtext = 'AUTHORIZED SIGNATURE',
  color = '#0d5c3a',
  shape = 'rectangle',
  hasDate = true,
  dateStr = '',
  hasStars = true,
  companyName = ''
} = {}) {
  const dpr = 2; // Super-sampling for crisp retina lines
  const dateFormatted = dateStr || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  let canvas = null;
  if (typeof document !== 'undefined' && document.createElement) {
    canvas = document.createElement('canvas');
  }

  // If no canvas support (e.g. Node CLI without canvas package), return high-res SVG DataURL fallback
  if (!canvas) {
    const isCircle = shape === 'circle';
    const svgWidth = isCircle ? 320 : 340;
    const svgHeight = isCircle ? 320 : 130;
    const svg = isCircle
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 320 320">
          <circle cx="160" cy="160" r="140" fill="none" stroke="${color}" stroke-width="4"/>
          <circle cx="160" cy="160" r="128" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,4"/>
          <text x="160" y="150" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="${color}" text-anchor="middle">${text}</text>
          <text x="160" y="175" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${color}" text-anchor="middle">${subtext || dateFormatted}</text>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 340 130">
          <rect x="6" y="6" width="328" height="118" rx="10" fill="none" stroke="${color}" stroke-width="4"/>
          <rect x="14" y="14" width="312" height="102" rx="6" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="4,4"/>
          <text x="170" y="65" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="${color}" text-anchor="middle">${text}</text>
          <line x1="25" y1="80" x2="315" y2="80" stroke="${color}" stroke-width="1"/>
          <text x="170" y="102" font-family="monospace" font-size="12" font-weight="bold" fill="${color}" text-anchor="middle">${dateFormatted} ${subtext ? '• ' + subtext : ''}</text>
        </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  if (shape === 'circle') {
    const size = 320 * dpr;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const center = size / 2;
    const radius = size * 0.44;

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Outer double border
    ctx.lineWidth = 4 * dpr;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(center, center, radius - 8 * dpr, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed ring
    ctx.lineWidth = 1 * dpr;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.arc(center, center, radius - 20 * dpr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top and Bottom Arced Text or Company Name
    ctx.font = `bold ${13 * dpr}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const header = companyName || 'DOCFORGE CERTIFIED';
    ctx.fillText(header, center, center - radius * 0.45);

    // Center Main Text
    ctx.font = `900 ${22 * dpr}px "Inter", "Arial Black", sans-serif`;
    ctx.fillText(text, center, center - (hasDate ? 8 * dpr : 0));

    // Date & Subtext
    if (hasDate) {
      ctx.font = `600 ${11 * dpr}px "Inter", monospace`;
      ctx.fillText(dateFormatted, center, center + 18 * dpr);
    }

    if (subtext) {
      ctx.font = `bold ${10 * dpr}px "Inter", sans-serif`;
      ctx.fillText(subtext, center, center + radius * 0.5);
    }

    // Star Accents
    if (hasStars) {
      ctx.font = `${14 * dpr}px sans-serif`;
      ctx.fillText('★  ★  ★', center, center + radius * 0.72);
    }

    return canvas.toDataURL('image/png');
  } else {
    // Rectangular Stamp
    const width = 360 * dpr;
    const height = 150 * dpr;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Outer Heavy Border
    ctx.lineWidth = 4 * dpr;
    ctx.strokeRect(6 * dpr, 6 * dpr, width - 12 * dpr, height - 12 * dpr);

    // Inner Fine Border
    ctx.lineWidth = 1.5 * dpr;
    ctx.strokeRect(12 * dpr, 12 * dpr, width - 24 * dpr, height - 24 * dpr);

    // Center Main Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${24 * dpr}px "Inter", "Arial Black", sans-serif`;
    const centerY = hasDate || subtext ? height * 0.38 : height / 2;
    ctx.fillText(text, width / 2, centerY);

    // Middle Divider Line
    if (hasDate || subtext) {
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      ctx.moveTo(25 * dpr, height * 0.58);
      ctx.lineTo(width - 25 * dpr, height * 0.58);
      ctx.stroke();
    }

    // Date & Subtext
    if (hasDate && subtext) {
      ctx.font = `600 ${11 * dpr}px "Inter", monospace`;
      ctx.fillText(dateFormatted, width * 0.32, height * 0.76);

      ctx.font = `bold ${10 * dpr}px "Inter", sans-serif`;
      ctx.fillText(subtext, width * 0.72, height * 0.76);
    } else if (hasDate) {
      ctx.font = `bold ${13 * dpr}px "Inter", monospace`;
      ctx.fillText(dateFormatted, width / 2, height * 0.76);
    } else if (subtext) {
      ctx.font = `bold ${11 * dpr}px "Inter", sans-serif`;
      ctx.fillText(subtext, width / 2, height * 0.76);
    }

    return canvas.toDataURL('image/png');
  }
}
