import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

async function fullAudit() {
  const auditReport = [];

  for (const file of files) {
    const filePath = path.join(templatesDir, file);
    const code = fs.readFileSync(filePath, 'utf-8');
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    const fnName = Object.keys(mod).find(k => typeof mod[k] === 'function');
    const fn = mod[fnName];

    // 1. AST / Code pattern analysis
    const usesComputePartition = code.includes('computeTwoPagePartition');
    const usesPaginationEngine = code.includes('paginationEngine');
    
    // Check avatar structure
    const hasAvatarMaskDiv = /<div[^>]*class="[^"]*avatar-mask[^"]*"[^>]*>/i.test(code);
    const hasAvatarContainer = /<div[^>]*class="[^"]*avatar-container[^"]*"[^>]*>/i.test(code);
    const directImgAvatar = /<img[^>]*class="[^"]*avatar[^"]*"[^>]*>/i.test(code);
    const avatarImgHasCropInline = code.includes('photoCrop') || code.includes('transform');
    
    // Check photo conditional rendering
    const rendersPhotoConditionally = /(?:data\.)?photoUrl\s*\?\s*`[\s\S]*?<img/i.test(code) || /photoSrc\s*\?\s*`[\s\S]*?<img/i.test(code);

    // Check name handling
    const nameFallbacks = [];
    const nameRegex = /(?:data\.)?name\s*\|\|\s*(['"`][^'"`]+['"`])/g;
    let m;
    while ((m = nameRegex.exec(code)) !== null) {
      nameFallbacks.push(m[0]);
    }

    // Check title handling
    const titleFallbacks = [];
    const titleRegex = /(?:data\.)?title\s*\|\|\s*(['"`][^'"`]+['"`])/g;
    while ((m = titleRegex.exec(code)) !== null) {
      titleFallbacks.push(m[0]);
    }

    // Check summary handling
    const summaryFallbacks = [];
    const summaryRegex = /(?:data\.)?(summary|profile|about)\s*\|\|\s*(['"`][^'"`]+['"`])/g;
    while ((m = summaryRegex.exec(code)) !== null) {
      summaryFallbacks.push(m[0]);
    }

    // Check contact fallbacks
    const contactFallbacks = [];
    const contactRegex = /(?:data\.)?(phone|email|location|address|website|linkedin)\s*\|\|\s*(['"`][^'"`]+['"`])/g;
    while ((m = contactRegex.exec(code)) !== null) {
      contactFallbacks.push(m[0]);
    }

    // Check array fallbacks
    const arrayFallbacks = [];
    const arrRegex = /(?:data\.)?(experience|education|skills|projects|certifications|references|customSections|custom_languages)\s*\|\|\s*\[/g;
    while ((m = arrRegex.exec(code)) !== null) {
      arrayFallbacks.push(m[0]);
    }

    // Extract stamped data-df-field values
    const stampedFields = [];
    const dfRegex = /data-df-field="([^"]+)"/g;
    while ((m = dfRegex.exec(code)) !== null) {
      stampedFields.push(m[1]);
    }
    const uniqueStampedFields = [...new Set(stampedFields)];

    // Check presence of key data-df-field attributes
    const hasDfName = uniqueStampedFields.some(f => f === 'name');
    const hasDfTitle = uniqueStampedFields.some(f => f === 'title');
    const hasDfSummary = uniqueStampedFields.some(f => f === 'summary' || f === 'profile');
    const hasDfEmail = uniqueStampedFields.some(f => f === 'email');
    const hasDfPhone = uniqueStampedFields.some(f => f === 'phone');
    const hasDfLocation = uniqueStampedFields.some(f => f === 'location');
    const hasDfWebsite = uniqueStampedFields.some(f => f === 'website');
    const hasDfLinkedin = uniqueStampedFields.some(f => f === 'linkedin');
    const hasDfExp = uniqueStampedFields.some(f => f.startsWith('exp:'));
    const hasDfEdu = uniqueStampedFields.some(f => f.startsWith('edu:'));
    const hasDfSkills = uniqueStampedFields.some(f => f.startsWith('skill:'));
    const hasDfProj = uniqueStampedFields.some(f => f.startsWith('proj:'));
    const hasDfCert = uniqueStampedFields.some(f => f.startsWith('cert:'));
    const hasDfRef = uniqueStampedFields.some(f => f.startsWith('ref:'));
    const hasDfCustom = uniqueStampedFields.some(f => f.startsWith('custom:'));

    // Check print styles
    const hasPrintStyles = code.includes('@media print');
    const hasPrintColorAdjust = code.includes('print-color-adjust: exact') || code.includes('-webkit-print-color-adjust: exact');
    const hasPageBreak = code.includes('page-break-after') || code.includes('break-after');
    const hasA4Dimensions = code.includes('794px') && code.includes('1123px');

    // 2. Runtime execution with empty payload
    const emptyPayload = {
      name: '', title: '', photoUrl: '', email: '', phone: '', location: '',
      website: '', linkedin: '', summary: '', experience: [], education: [],
      skills: [], projects: [], certifications: [], references: [], customSections: []
    };

    let emptyHtml = '';
    let emptyError = null;
    try {
      emptyHtml = fn(emptyPayload);
    } catch (e) {
      emptyError = e.message;
    }

    // Inspect emptyHtml for empty section headers or lingering tags
    const emptyHeaders = [];
    if (emptyHtml) {
      const h2Matches = emptyHtml.match(/<h[23][^>]*>([^<]+)<\/h[23]>/g) || [];
      for (const h of h2Matches) {
        emptyHeaders.push(h);
      }
    }

    // Check if emptyHtml contains broken img tags: <img ... src="" ...> or <img ... src="undefined" ...>
    const brokenImg = /<img[^>]*src=["'](?:undefined|null|)?["'][^>]*>/i.test(emptyHtml) || /<img[^>]*src=""/i.test(emptyHtml);

    // Check if emptyHtml contains empty <a> tags: <a href="mailto:" or <a href="https://"
    const brokenLinks = /<a[^>]*href=["'](?:mailto:|https?:\/\/|tel:)?["'][^>]*>\s*<\/a>/i.test(emptyHtml) ||
                        /<a[^>]*href=["'](?:mailto:|https?:\/\/|tel:)["']/i.test(emptyHtml);

    auditReport.push({
      file,
      fnName,
      lineCount: code.split('\n').length,
      pagination: {
        usesComputePartition,
        usesPaginationEngine
      },
      avatar: {
        hasAvatarMaskDiv,
        hasAvatarContainer,
        directImgAvatar,
        rendersPhotoConditionally,
        brokenImgOnEmpty: brokenImg
      },
      dfFields: {
        totalUnique: uniqueStampedFields.length,
        hasDfName,
        hasDfTitle,
        hasDfSummary,
        hasDfEmail,
        hasDfPhone,
        hasDfLocation,
        hasDfWebsite,
        hasDfLinkedin,
        hasDfExp,
        hasDfEdu,
        hasDfSkills,
        hasDfProj,
        hasDfCert,
        hasDfRef,
        hasDfCustom,
        missingFields: [
          !hasDfName && 'name',
          !hasDfTitle && 'title',
          !hasDfSummary && 'summary',
          !hasDfEmail && 'email',
          !hasDfPhone && 'phone',
          !hasDfLocation && 'location',
          !hasDfWebsite && 'website',
          !hasDfLinkedin && 'linkedin',
          !hasDfExp && 'exp',
          !hasDfEdu && 'edu',
          !hasDfSkills && 'skills',
          !hasDfProj && 'proj',
          !hasDfCert && 'cert',
          !hasDfRef && 'ref',
          !hasDfCustom && 'custom'
        ].filter(Boolean)
      },
      fallbacks: {
        nameFallbacks,
        titleFallbacks,
        summaryFallbacks,
        contactFallbacks,
        arrayFallbacks
      },
      printAndGeometry: {
        hasA4Dimensions,
        hasPrintStyles,
        hasPrintColorAdjust,
        hasPageBreak
      },
      emptyRendering: {
        error: emptyError,
        emptyHeadersCount: emptyHeaders.length,
        emptyHeadersSample: emptyHeaders.slice(0, 5),
        brokenImg,
        brokenLinks
      }
    });
  }

  fs.writeFileSync('.agents/explorer_0_2/full_audit_report.json', JSON.stringify(auditReport, null, 2));

  console.log(`Full Audit completed for ${auditReport.length} templates.`);
  
  // Aggregate stats
  const total = auditReport.length;
  const missingPagination = auditReport.filter(r => !r.pagination.usesComputePartition).length;
  const missingAvatarMask = auditReport.filter(r => !r.avatar.hasAvatarMaskDiv).length;
  const brokenImgsOnEmpty = auditReport.filter(r => r.avatar.brokenImgOnEmpty).length;
  const brokenLinksOnEmpty = auditReport.filter(r => r.emptyRendering.brokenLinks).length;
  const templatesWithEmptyHeaders = auditReport.filter(r => r.emptyRendering.emptyHeadersCount > 0).length;
  const templatesMissingDfName = auditReport.filter(r => !r.dfFields.hasDfName).length;
  const templatesMissingDfTitle = auditReport.filter(r => !r.dfFields.hasDfTitle).length;
  const templatesMissingDfExp = auditReport.filter(r => !r.dfFields.hasDfExp).length;
  const templatesMissingDfEdu = auditReport.filter(r => !r.dfFields.hasDfEdu).length;
  const templatesMissingDfSkills = auditReport.filter(r => !r.dfFields.hasDfSkills).length;

  console.log(`\nAggregated Findings:`);
  console.log(`- Missing computeTwoPagePartition: ${missingPagination} / ${total}`);
  console.log(`- Missing avatar-mask container: ${missingAvatarMask} / ${total}`);
  console.log(`- Broken <img> on empty payload: ${brokenImgsOnEmpty} / ${total}`);
  console.log(`- Broken links on empty payload: ${brokenLinksOnEmpty} / ${total}`);
  console.log(`- Ghost/Empty section headers on empty payload: ${templatesWithEmptyHeaders} / ${total}`);
  console.log(`- Missing data-df-field="name": ${templatesMissingDfName} / ${total}`);
  console.log(`- Missing data-df-field="title": ${templatesMissingDfTitle} / ${total}`);
  console.log(`- Missing data-df-field="exp:...": ${templatesMissingDfExp} / ${total}`);
  console.log(`- Missing data-df-field="edu:...": ${templatesMissingDfEdu} / ${total}`);
  console.log(`- Missing data-df-field="skill:...": ${templatesMissingDfSkills} / ${total}`);
}

fullAudit().catch(console.error);
