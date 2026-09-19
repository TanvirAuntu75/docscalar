// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar Client-Side OpenXML Resume DOCX Exporter
// Pure Client-Side ATS-Compliant Word Document Generation using 'docx'
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  convertInchesToTwip,
  ExternalHyperlink
} from 'docx';
import fileSaver from 'file-saver';

const saveAs = typeof fileSaver === 'function' ? fileSaver : (fileSaver?.saveAs || fileSaver);

// ─── Font Mapping for ATS Compatibility ─────────────────────────────────────────
export const DOCX_FONT_MAPPING = {
  inter: 'Calibri',
  outfit: 'Calibri',
  'open sans': 'Arial',
  roboto: 'Arial',
  merriweather: 'Georgia',
  'playfair display': 'Times New Roman',
  'plus jakarta sans': 'Calibri',
  lora: 'Georgia',
  arial: 'Arial',
  calibri: 'Calibri',
  georgia: 'Georgia',
  'times new roman': 'Times New Roman',
  default: 'Calibri'
};

/**
 * Resolves standard system fonts for OpenXML output
 * @param {string} fontName
 * @returns {string} Safe OpenXML font family name
 */
export function resolveDocxFont(fontName) {
  if (!fontName) return 'Calibri';
  const key = String(fontName).toLowerCase().trim();
  return DOCX_FONT_MAPPING[key] || fontName || 'Calibri';
}

/**
 * Normalizes 3/6-digit hex color strings for docx compatibility (without leading #)
 * @param {string} hex
 * @param {string} defaultHex
 * @returns {string} 6-digit hex string
 */
export function sanitizeHexColor(hex, defaultHex = '1E3A8A') {
  if (!hex || typeof hex !== 'string') return defaultHex;
  const clean = hex.replace(/^#/, '').trim();
  if (/^[0-9A-Fa-f]{6}$/.test(clean)) return clean.toUpperCase();
  if (/^[0-9A-Fa-f]{3}$/.test(clean)) {
    return clean
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase();
  }
  const namedColors = {
    blue: '2563EB',
    indigo: '4F46E5',
    navy: '1E3A8A',
    slate: '334155',
    teal: '0D9488',
    emerald: '059669',
    red: 'DC2626',
    rose: 'E11D48',
    purple: '7C3AED',
    black: '111827',
    gray: '4B5563',
    charcoal: '1F2937',
    default: defaultHex
  };
  return namedColors[clean.toLowerCase()] || defaultHex;
}

// ─── Borderless Table Helper ───────────────────────────────────────────────────
const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto'
};

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER
};

// ─── Section Heading Builder ───────────────────────────────────────────────────
export function createSectionHeading(title, accentColor, font) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepWithNext: true,
    spacing: {
      before: 240, // 12pt before
      after: 100,  // 5pt after
      line: 240
    },
    border: {
      bottom: {
        color: accentColor,
        space: 4,
        style: BorderStyle.SINGLE,
        size: 6 // 3/4 pt
      }
    },
    children: [
      new TextRun({
        text: String(title || '').toUpperCase(),
        bold: true,
        size: 22, // 11pt (22 half-points)
        font: font,
        color: accentColor
      })
    ]
  });
}

// ─── Header Builder ─────────────────────────────────────────────────────────────
export function createHeaderBlock(data, accentColor, font) {
  const children = [];

  // Candidate Name
  if (data.name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 60, line: 240 },
        children: [
          new TextRun({
            text: data.name,
            bold: true,
            size: 44, // 22pt
            font: font,
            color: '111827'
          })
        ]
      })
    );
  }

  // Professional Title / Headline
  if (data.title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 80, line: 240 },
        children: [
          new TextRun({
            text: data.title,
            bold: true,
            size: 24, // 12pt
            font: font,
            color: accentColor
          })
        ]
      })
    );
  }

  // Contact Info Line (Email, Phone, Location, Website, LinkedIn, GitHub)
  const contactParts = [];
  if (data.email) contactParts.push({ text: data.email, link: `mailto:${data.email}` });
  if (data.phone) contactParts.push({ text: data.phone, link: `tel:${data.phone.replace(/[^+\d]/g, '')}` });
  if (data.location || data.address) contactParts.push({ text: data.location || data.address });
  if (data.linkedin) contactParts.push({ text: data.linkedin.replace(/^https?:\/\/(www\.)?/, ''), link: data.linkedin.startsWith('http') ? data.linkedin : `https://${data.linkedin}` });
  if (data.website || data.portfolio) {
    const site = data.website || data.portfolio;
    contactParts.push({ text: site.replace(/^https?:\/\/(www\.)?/, ''), link: site.startsWith('http') ? site : `https://${site}` });
  }
  if (data.github) contactParts.push({ text: data.github.replace(/^https?:\/\/(www\.)?/, ''), link: data.github.startsWith('http') ? data.github : `https://${data.github}` });

  if (contactParts.length > 0) {
    const contactRuns = [];
    contactParts.forEach((part, index) => {
      if (index > 0) {
        contactRuns.push(
          new TextRun({
            text: '  •  ',
            color: '6B7280',
            size: 19, // 9.5pt
            font: font
          })
        );
      }
      contactRuns.push(
        new TextRun({
          text: part.text,
          size: 19, // 9.5pt
          font: font,
          color: part.link ? accentColor : '374151'
        })
      );
    });

    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 180, line: 240 },
        children: contactRuns
      })
    );
  }

  return children;
}

// ─── Summary / Profile Builder ──────────────────────────────────────────────────
export function createSummarySection(summaryText, accentColor, font, sectionTitle = 'Professional Summary') {
  if (!summaryText || !summaryText.trim()) return [];
  return [
    createSectionHeading(sectionTitle, accentColor, font),
    new Paragraph({
      spacing: { before: 60, after: 120, line: 276 },
      children: [
        new TextRun({
          text: summaryText.trim(),
          size: 20, // 10pt
          font: font,
          color: '1F2937'
        })
      ]
    })
  ];
}

// ─── Experience Section Builder ─────────────────────────────────────────────────
export function createExperienceSection(experienceList, accentColor, font, sectionTitle = 'Work Experience') {
  if (!Array.isArray(experienceList) || experienceList.length === 0) return [];
  const validItems = experienceList.filter((item) => item && (item.company || item.role || item.position || (item.highlights && item.highlights.length)));
  if (validItems.length === 0) return [];

  const elements = [createSectionHeading(sectionTitle, accentColor, font)];

  validItems.forEach((item, index) => {
    const roleText = item.role || item.position || item.title || 'Role / Position';
    const companyText = item.company || item.employer || item.organization || '';
    const dateRange = [item.start, item.end].filter(Boolean).join(' – ');
    const locationText = item.location || '';

    // 2-Column Header Table: Left (Role & Company) | Right (Date & Location)
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  spacing: { before: index > 0 ? 100 : 40, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: roleText,
                      bold: true,
                      size: 21, // 10.5pt
                      font: font,
                      color: '111827'
                    }),
                    ...(companyText
                      ? [
                          new TextRun({
                            text: `  |  ${companyText}`,
                            bold: false,
                            size: 20, // 10pt
                            font: font,
                            color: '374151'
                          })
                        ]
                      : [])
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: index > 0 ? 100 : 40, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: dateRange,
                      italics: true,
                      size: 19, // 9.5pt
                      font: font,
                      color: '4B5563'
                    }),
                    ...(locationText
                      ? [
                          new TextRun({
                            text: dateRange ? ` · ${locationText}` : locationText,
                            size: 19,
                            font: font,
                            color: '6B7280'
                          })
                        ]
                      : [])
                  ]
                })
              ]
            })
          ]
        })
      ]
    });

    elements.push(headerTable);

    // Optional Role Description / Summary
    if (item.description && typeof item.description === 'string' && item.description.trim()) {
      elements.push(
        new Paragraph({
          spacing: { before: 20, after: 40, line: 240 },
          children: [
            new TextRun({
              text: item.description.trim(),
              size: 20, // 10pt
              font: font,
              color: '374151'
            })
          ]
        })
      );
    }

    // Bullet Highlights
    let highlights = [];
    if (Array.isArray(item.highlights)) {
      highlights = item.highlights.filter((h) => typeof h === 'string' && h.trim().length > 0);
    } else if (typeof item.highlights === 'string' && item.highlights.trim()) {
      highlights = item.highlights
        .split('\n')
        .map((h) => h.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
    }

    highlights.forEach((bullet) => {
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 20, after: 30, line: 240 },
          children: [
            new TextRun({
              text: bullet.trim(),
              size: 19, // 9.5pt
              font: font,
              color: '1F2937'
            })
          ]
        })
      );
    });

    // Space after entry
    elements.push(
      new Paragraph({
        spacing: { before: 0, after: 60, line: 120 },
        children: []
      })
    );
  });

  return elements;
}

// ─── Education Section Builder ──────────────────────────────────────────────────
export function createEducationSection(educationList, accentColor, font, sectionTitle = 'Education') {
  if (!Array.isArray(educationList) || educationList.length === 0) return [];
  const validItems = educationList.filter((item) => item && (item.school || item.institution || item.degree));
  if (validItems.length === 0) return [];

  const elements = [createSectionHeading(sectionTitle, accentColor, font)];

  validItems.forEach((item, index) => {
    const degreeText = item.degree || 'Degree';
    const schoolText = item.school || item.institution || item.university || '';
    const dateRange = [item.start, item.end].filter(Boolean).join(' – ');
    const locationText = item.location || '';
    const noteText = item.note || item.gpa || item.honors || '';

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  spacing: { before: index > 0 ? 80 : 40, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: degreeText,
                      bold: true,
                      size: 21, // 10.5pt
                      font: font,
                      color: '111827'
                    }),
                    ...(schoolText
                      ? [
                          new TextRun({
                            text: `  |  ${schoolText}`,
                            bold: false,
                            size: 20, // 10pt
                            font: font,
                            color: '374151'
                          })
                        ]
                      : [])
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: index > 0 ? 80 : 40, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: dateRange,
                      italics: true,
                      size: 19, // 9.5pt
                      font: font,
                      color: '4B5563'
                    }),
                    ...(locationText
                      ? [
                          new TextRun({
                            text: dateRange ? ` · ${locationText}` : locationText,
                            size: 19,
                            font: font,
                            color: '6B7280'
                          })
                        ]
                      : [])
                  ]
                })
              ]
            })
          ]
        })
      ]
    });

    elements.push(headerTable);

    if (noteText) {
      elements.push(
        new Paragraph({
          spacing: { before: 10, after: 30, line: 240 },
          children: [
            new TextRun({
              text: noteText,
              italics: true,
              size: 19, // 9.5pt
              font: font,
              color: '4B5563'
            })
          ]
        })
      );
    }

    if (Array.isArray(item.highlights) && item.highlights.length > 0) {
      item.highlights.filter(Boolean).forEach((bullet) => {
        elements.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 10, after: 20, line: 240 },
            children: [
              new TextRun({
                text: bullet.trim(),
                size: 19,
                font: font,
                color: '1F2937'
              })
            ]
          })
        );
      });
    }

    elements.push(
      new Paragraph({
        spacing: { before: 0, after: 40, line: 120 },
        children: []
      })
    );
  });

  return elements;
}

// ─── Skills Section Builder ─────────────────────────────────────────────────────
export function createSkillsSection(skillsData, accentColor, font, sectionTitle = 'Skills') {
  if (!skillsData) return [];

  let skillItems = [];
  if (Array.isArray(skillsData)) {
    skillItems = skillsData.map((s) => (typeof s === 'string' ? s.trim() : s?.name || '')).filter(Boolean);
  } else if (typeof skillsData === 'string' && skillsData.trim()) {
    skillItems = skillsData
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (skillItems.length === 0) return [];

  const elements = [createSectionHeading(sectionTitle, accentColor, font)];

  // Group items if they have categories (e.g. "Category: item1, item2" or "Skill - Level")
  const categorized = {};
  const uncategorized = [];

  skillItems.forEach((item) => {
    if (item.includes(':')) {
      const [cat, rest] = item.split(':');
      const catKey = cat.trim();
      categorized[catKey] = categorized[catKey] || [];
      categorized[catKey].push(rest.trim());
    } else {
      uncategorized.push(item);
    }
  });

  const catKeys = Object.keys(categorized);
  if (catKeys.length > 0) {
    catKeys.forEach((cat) => {
      elements.push(
        new Paragraph({
          spacing: { before: 40, after: 30, line: 240 },
          children: [
            new TextRun({
              text: `${cat}: `,
              bold: true,
              size: 20, // 10pt
              font: font,
              color: '111827'
            }),
            new TextRun({
              text: categorized[cat].join(', '),
              size: 20,
              font: font,
              color: '374151'
            })
          ]
        })
      );
    });
  }

  if (uncategorized.length > 0) {
    // Render flat skills in clean bulleted 2-column or list format
    // Chunk into lines of 3-4 skills with bullet separator for density and ATS compliance
    const chunks = [];
    let currentChunk = [];
    uncategorized.forEach((skill) => {
      currentChunk.push(skill);
      if (currentChunk.length >= 3) {
        chunks.push(currentChunk.join('  •  '));
        currentChunk = [];
      }
    });
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('  •  '));
    }

    chunks.forEach((line) => {
      elements.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 20, after: 20, line: 240 },
          children: [
            new TextRun({
              text: line,
              size: 19, // 9.5pt
              font: font,
              color: '1F2937'
            })
          ]
        })
      );
    });
  }

  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 60, line: 120 },
      children: []
    })
  );

  return elements;
}

// ─── Projects Section Builder ───────────────────────────────────────────────────
export function createProjectsSection(projectsList, accentColor, font, sectionTitle = 'Projects') {
  if (!Array.isArray(projectsList) || projectsList.length === 0) return [];
  const validItems = projectsList.filter((item) => item && (item.name || item.title || item.description));
  if (validItems.length === 0) return [];

  const elements = [createSectionHeading(sectionTitle, accentColor, font)];

  validItems.forEach((item, index) => {
    const nameText = item.name || item.title || 'Project';
    const urlText = item.url || item.link || '';
    const descText = item.description || '';

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  spacing: { before: index > 0 ? 80 : 40, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: nameText,
                      bold: true,
                      size: 21, // 10.5pt
                      font: font,
                      color: '111827'
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: index > 0 ? 80 : 40, after: 20, line: 240 },
                  children: [
                    new TextRun({
                      text: urlText,
                      italics: true,
                      size: 19, // 9.5pt
                      font: font,
                      color: accentColor
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });

    elements.push(headerTable);

    if (descText) {
      elements.push(
        new Paragraph({
          spacing: { before: 20, after: 30, line: 240 },
          children: [
            new TextRun({
              text: descText,
              size: 19,
              font: font,
              color: '374151'
            })
          ]
        })
      );
    }

    if (Array.isArray(item.highlights)) {
      item.highlights.filter(Boolean).forEach((bullet) => {
        elements.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 10, after: 20, line: 240 },
            children: [
              new TextRun({
                text: bullet.trim(),
                size: 19,
                font: font,
                color: '1F2937'
              })
            ]
          })
        );
      });
    }

    elements.push(
      new Paragraph({
        spacing: { before: 0, after: 40, line: 120 },
        children: []
      })
    );
  });

  return elements;
}

// ─── Certifications Section Builder ─────────────────────────────────────────────
export function createCertificationsSection(certList, accentColor, font, sectionTitle = 'Certifications') {
  if (!Array.isArray(certList) || certList.length === 0) return [];
  const validItems = certList.filter(Boolean);
  if (validItems.length === 0) return [];

  const elements = [createSectionHeading(sectionTitle, accentColor, font)];

  validItems.forEach((cert) => {
    let title = '';
    let issuer = '';
    let date = '';

    if (typeof cert === 'string') {
      title = cert.trim();
    } else if (typeof cert === 'object') {
      title = cert.name || cert.title || '';
      issuer = cert.issuer || cert.organization || '';
      date = cert.date || cert.year || '';
    }

    if (!title) return;

    elements.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 20, after: 20, line: 240 },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 20, // 10pt
            font: font,
            color: '111827'
          }),
          ...(issuer || date
            ? [
                new TextRun({
                  text: `  —  ${[issuer, date].filter(Boolean).join(' · ')}`,
                  size: 19,
                  font: font,
                  color: '4B5563'
                })
              ]
            : [])
        ]
      })
    );
  });

  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 60, line: 120 },
      children: []
    })
  );

  return elements;
}

// ─── References Section Builder ─────────────────────────────────────────────────
export function createReferencesSection(refList, accentColor, font, sectionTitle = 'References') {
  if (!Array.isArray(refList) || refList.length === 0) return [];
  const validItems = refList.filter((r) => r && (r.name || r.relation || r.company));
  if (validItems.length === 0) return [];

  const elements = [createSectionHeading(sectionTitle, accentColor, font)];

  validItems.forEach((ref) => {
    const name = ref.name || 'Reference';
    const relation = ref.relation || ref.title || ref.company || '';
    const contact = [ref.phone, ref.email].filter(Boolean).join('  •  ');

    elements.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 20, after: 20, line: 240 },
        children: [
          new TextRun({
            text: name,
            bold: true,
            size: 20, // 10pt
            font: font,
            color: '111827'
          }),
          ...(relation
            ? [
                new TextRun({
                  text: `  (${relation})`,
                  italics: true,
                  size: 19,
                  font: font,
                  color: '4B5563'
                })
              ]
            : []),
          ...(contact
            ? [
                new TextRun({
                  text: `  —  ${contact}`,
                  size: 19,
                  font: font,
                  color: '6B7280'
                })
              ]
            : [])
        ]
      })
    );
  });

  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 60, line: 120 },
      children: []
    })
  );

  return elements;
}

// ─── Custom / Languages Section Builder ─────────────────────────────────────────
export function createCustomSection(sectionObj, accentColor, font) {
  if (!sectionObj) return [];
  const title = sectionObj.title || 'Additional Information';
  const items = sectionObj.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    if (typeof sectionObj.content === 'string' && sectionObj.content.trim()) {
      return [
        createSectionHeading(title, accentColor, font),
        new Paragraph({
          spacing: { before: 40, after: 60, line: 240 },
          children: [
            new TextRun({
              text: sectionObj.content.trim(),
              size: 20,
              font: font,
              color: '1F2937'
            })
          ]
        })
      ];
    }
    return [];
  }

  const elements = [createSectionHeading(title, accentColor, font)];

  items.filter(Boolean).forEach((item) => {
    const itemTitle = item.title || item.name || '';
    const itemVal = item.value || item.level || item.description || '';

    elements.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 20, after: 20, line: 240 },
        children: [
          ...(itemTitle
            ? [
                new TextRun({
                  text: `${itemTitle}${itemVal ? ': ' : ''}`,
                  bold: true,
                  size: 20,
                  font: font,
                  color: '111827'
                })
              ]
            : []),
          ...(itemVal
            ? [
                new TextRun({
                  text: itemVal,
                  size: 20,
                  font: font,
                  color: '374151'
                })
              ]
            : [])
        ]
      })
    );
  });

  elements.push(
    new Paragraph({
      spacing: { before: 0, after: 60, line: 120 },
      children: []
    })
  );

  return elements;
}

// ─── Master Document Builder ────────────────────────────────────────────────────
/**
 * Compiles a docx Document from JSON resume data adhering to ATS formatting
 * @param {object} resumeData - Standard DocScalar resume data object
 * @param {object} options - Configuration options (themeFont, themeColor, marginInches)
 * @returns {Document} Pure OpenXML Document instance
 */
export function buildDocxDocument(resumeData = {}, options = {}) {
  const data = resumeData || {};
  const font = resolveDocxFont(options.themeFont || data.themeFont || 'Calibri');
  const accentColor = sanitizeHexColor(options.themeColor || data.themeColor || '2563EB');
  const marginInches = typeof options.marginInches === 'number' ? options.marginInches : 0.6;
  const marginTwips = convertInchesToTwip(marginInches);

  const docChildren = [];

  // 1. Header Contact Block
  docChildren.push(...createHeaderBlock(data, accentColor, font));

  // 2. Determine Serial Section Dispatch Order
  const defaultOrder = [
    'summary',
    'experience',
    'education',
    'skills',
    'projects',
    'certifications',
    'custom_languages',
    'customSections',
    'references'
  ];

  let activeOrder = Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0
    ? [...data.sectionOrder]
    : defaultOrder;

  // Track rendered sections to prevent duplicates
  const renderedSet = new Set();

  const dispatchSection = (sectionKey) => {
    if (!sectionKey || renderedSet.has(sectionKey)) return;
    renderedSet.add(sectionKey);

    const normKey = String(sectionKey).toLowerCase().trim();

    if (normKey === 'summary' || normKey === 'profile' || normKey === 'about') {
      docChildren.push(...createSummarySection(data.summary || data.profile || data.about, accentColor, font));
    } else if (normKey === 'experience' || normKey === 'work' || normKey === 'employment') {
      docChildren.push(...createExperienceSection(data.experience || data.work, accentColor, font));
    } else if (normKey === 'education' || normKey === 'academics') {
      docChildren.push(...createEducationSection(data.education, accentColor, font));
    } else if (normKey === 'skills' || normKey === 'technologies' || normKey === 'competencies') {
      docChildren.push(...createSkillsSection(data.skills, accentColor, font));
    } else if (normKey === 'projects' || normKey === 'portfolio') {
      docChildren.push(...createProjectsSection(data.projects, accentColor, font));
    } else if (normKey === 'certifications' || normKey === 'licenses' || normKey === 'certificates') {
      docChildren.push(...createCertificationsSection(data.certifications, accentColor, font));
    } else if (normKey === 'references') {
      docChildren.push(...createReferencesSection(data.references, accentColor, font));
    } else if (normKey === 'custom_languages' || normKey === 'languages') {
      // Find matching in customSections or data.languages
      const customLang = Array.isArray(data.customSections)
        ? data.customSections.find((s) => s && (s.id === 'custom_languages' || s.id === 'languages' || /language/i.test(s.title || '')))
        : null;
      if (customLang) {
        docChildren.push(...createCustomSection(customLang, accentColor, font));
      } else if (Array.isArray(data.languages) && data.languages.length > 0) {
        docChildren.push(
          ...createCustomSection(
            { title: 'Languages', items: data.languages.map((l) => (typeof l === 'string' ? { title: l } : l)) },
            accentColor,
            font
          )
        );
      }
    } else {
      // Check if matching custom section in data.customSections by id or title
      if (Array.isArray(data.customSections)) {
        const found = data.customSections.find(
          (s) => s && (s.id === sectionKey || s.id === normKey || String(s.title).toLowerCase() === normKey)
        );
        if (found) {
          docChildren.push(...createCustomSection(found, accentColor, font));
          return;
        }
      }
      // Check if data has direct array or string with sectionKey name
      if (data[sectionKey]) {
        const val = data[sectionKey];
        if (Array.isArray(val)) {
          docChildren.push(
            ...createCustomSection(
              { title: sectionKey.replace(/^custom_/, '').replace(/_/g, ' '), items: val.map((v) => (typeof v === 'string' ? { title: v } : v)) },
              accentColor,
              font
            )
          );
        } else if (typeof val === 'string' && val.trim()) {
          docChildren.push(
            ...createCustomSection(
              { title: sectionKey.replace(/^custom_/, '').replace(/_/g, ' '), content: val },
              accentColor,
              font
            )
          );
        }
      }
    }
  };

  // Dispatch in declared order
  activeOrder.forEach(dispatchSection);

  // Render any remaining customSections not explicitly listed in activeOrder
  if (Array.isArray(data.customSections)) {
    data.customSections.forEach((cSec) => {
      if (cSec && cSec.id && !renderedSet.has(cSec.id) && !renderedSet.has(cSec.title)) {
        renderedSet.add(cSec.id);
        docChildren.push(...createCustomSection(cSec, accentColor, font));
      }
    });
  }

  // Fallback paragraph if document is completely empty
  if (docChildren.length === 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Resume Document',
            size: 24,
            font: font
          })
        ]
      })
    );
  }

  return new Document({
    creator: 'DocScalar CV Builder',
    title: `${data.name || 'Resume'} - CV Document`,
    description: 'ATS-Compliant OpenXML Resume Document generated by DocScalar',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: marginTwips,
              right: marginTwips,
              bottom: marginTwips,
              left: marginTwips
            }
          }
        },
        children: docChildren
      }
    ]
  });
}

// ─── Export Function ────────────────────────────────────────────────────────────
/**
 * Generates and downloads an ATS-compliant .docx file from JSON resume data
 * @param {object} resumeData - Resume data object
 * @param {object} options - Configuration options
 * @returns {Promise<Blob|Buffer>} Compiled binary output
 */
export async function exportResumeToDocx(resumeData = {}, options = {}) {
  const doc = buildDocxDocument(resumeData, options);

  const safeName = (resumeData.name || options.filename || 'Resume')
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .replace(/\s+/g, '_') || 'Resume';
  const filename = options.filename || `${safeName}_Resume.docx`;

  // Check if browser environment with Blob support
  if (typeof Blob !== 'undefined') {
    const blob = await Packer.toBlob(doc);
    if (typeof window !== 'undefined' && typeof saveAs === 'function') {
      try {
        saveAs(blob, filename);
      } catch (err) {
        console.warn('DocScalar DOCX saveAs warning:', err);
      }
    }
    return blob;
  }

  // Node.js fallback (Buffer)
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export default exportResumeToDocx;
