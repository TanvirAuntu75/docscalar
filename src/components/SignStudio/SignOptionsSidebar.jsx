/* eslint-disable react/prop-types */
import { useState } from 'react';
import { DATE_FORMAT_PRESETS, formatDateByPattern, validateAndFormatDate, formatTypingDate } from '../../utils/dateFormats.js';
import { STAMP_PRESETS, generateStampDataUrl } from '../../utils/stampGenerator.js';
import SmartCropperPanel from '../SmartCropperPanel';

export default function SignOptionsSidebar({
  signatureData,
  initialsData,
  cropper,
  onOpenSignatureModal,
  onOpenInitialsModal,
  onAddFieldToActivePage,
  fields = [],
  selectedFieldId = null,
  onUpdateField = () => {},
  onRemoveField = () => {},
  onDuplicateField = () => {},
  onAlignField = () => {},
  onApplyAll = () => {},
  activePageIndex,
  totalPages,
  onClearAllFields,
  securityMode = 'simple',
  setSecurityMode = () => {},
  flattenDocument = true,
  setFlattenDocument = () => {},
  generateCertificate = true,
  setGenerateCertificate = () => {},
  digitalCertSettings = {},
  setDigitalCertSettings = () => {},
  onExecuteSigning,
  processing = false,
  progress = 0,
  error = null,
  isPro = false,
  detectedZones = [],
  onApplyDetectedZone = () => {}
}) {
  const [selectedDateFormat] = useState('MM/DD/YYYY');
  const [customSignerName, setCustomSignerName] = useState('Signer Name');
  const [customSignerEmail, setCustomSignerEmail] = useState('signer@example.com');
  const [customJobTitle, setCustomJobTitle] = useState('Authorized Signatory');
  const [customCompany, setCustomCompany] = useState('DocScalar Organization');
  const [customTextContent] = useState('Approved & Verified');
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [showStampPicker, setShowStampPicker] = useState(false);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Handle Drag Start from palette
  const handleDragStart = (e, fieldType, extraProps = {}) => {
    let value = '';
    let dataUrl = null;

    if (fieldType === 'signature') {
      dataUrl = signatureData?.dataUrl;
      value = signatureData?.value || 'Signature';
    } else if (fieldType === 'initials') {
      dataUrl = initialsData?.dataUrl;
      value = initialsData?.value || 'Initials';
    } else if (fieldType === 'date') {
      value = formatDateByPattern(new Date(), selectedDateFormat);
    } else if (fieldType === 'name') {
      value = customSignerName;
    } else if (fieldType === 'email') {
      value = customSignerEmail;
    } else if (fieldType === 'title') {
      value = customJobTitle;
    } else if (fieldType === 'company') {
      value = customCompany;
    } else if (fieldType === 'text') {
      value = customTextContent;
    } else if (fieldType === 'stamp' || fieldType === 'seal') {
      const defaultPreset = STAMP_PRESETS[0];
      dataUrl = generateStampDataUrl({
        text: defaultPreset.text,
        subtext: defaultPreset.subtext,
        color: defaultPreset.color,
        shape: defaultPreset.shape,
        hasDate: defaultPreset.hasDate,
        hasStars: defaultPreset.hasStars
      });
      value = defaultPreset.text;
    }

    const payload = {
      type: fieldType,
      value,
      dataUrl,
      color: signatureData?.color || '#000000',
      fontFamily: signatureData?.fontFamily || 'Satisfy',
      width: fieldType === 'signature' ? 0.26 : fieldType === 'initials' ? 0.14 : (fieldType === 'stamp' || fieldType === 'seal') ? 0.24 : 0.28,
      height: fieldType === 'signature' ? 0.08 : fieldType === 'initials' ? 0.06 : (fieldType === 'stamp' || fieldType === 'seal') ? 0.10 : 0.045,
      ...extraProps
    };

    e.dataTransfer.setData('application/docscalar-sign-field', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Quick Add click spawner
  const handleQuickAdd = (fieldType, extraProps = {}) => {
    let value = '';
    let dataUrl = null;

    if (fieldType === 'signature') {
      if (!signatureData?.dataUrl) {
        onOpenSignatureModal('signature');
        return;
      }
      dataUrl = signatureData.dataUrl;
      value = signatureData.value || 'Signature';
    } else if (fieldType === 'initials') {
      if (!initialsData?.dataUrl) {
        onOpenInitialsModal('initials');
        return;
      }
      dataUrl = initialsData.dataUrl;
      value = initialsData.value || 'Initials';
    } else if (fieldType === 'date') {
      value = formatDateByPattern(new Date(), selectedDateFormat);
    } else if (fieldType === 'name') {
      value = customSignerName;
    } else if (fieldType === 'email') {
      value = customSignerEmail;
    } else if (fieldType === 'title') {
      value = customJobTitle;
    } else if (fieldType === 'company') {
      value = customCompany;
    } else if (fieldType === 'text') {
      value = customTextContent;
    } else if (fieldType === 'stamp' || fieldType === 'seal') {
      const defaultPreset = STAMP_PRESETS[0];
      dataUrl = generateStampDataUrl({
        text: defaultPreset.text,
        subtext: defaultPreset.subtext,
        color: defaultPreset.color,
        shape: defaultPreset.shape,
        hasDate: defaultPreset.hasDate,
        hasStars: defaultPreset.hasStars
      });
      value = defaultPreset.text;
    }

    onAddFieldToActivePage({
      type: fieldType,
      pageIndex: activePageIndex,
      value,
      dataUrl,
      color: signatureData?.color || '#000000',
      fontFamily: (fieldType === 'signature' || fieldType === 'initials') ? (signatureData?.fontFamily || 'Satisfy') : 'Helvetica',
      width: fieldType === 'signature' ? 0.26 : fieldType === 'initials' ? 0.14 : (fieldType === 'stamp' || fieldType === 'seal') ? 0.24 : 0.28,
      height: fieldType === 'signature' ? 0.08 : fieldType === 'initials' ? 0.06 : (fieldType === 'stamp' || fieldType === 'seal') ? 0.10 : 0.045,
      x: 0.38,
      y: 0.45,
      ...extraProps
    });
  };

  // Add Official Stamp from Preset
  const handleAddStampPreset = (preset) => {
    const dataUrl = generateStampDataUrl({
      text: preset.text,
      subtext: preset.subtext,
      color: preset.color,
      shape: preset.shape,
      hasDate: preset.hasDate,
      hasStars: preset.hasStars,
      companyName: customCompany
    });

    onAddFieldToActivePage({
      type: 'stamp',
      pageIndex: activePageIndex,
      value: preset.text,
      dataUrl: dataUrl,
      width: preset.shape === 'circle' ? 0.18 : 0.24,
      height: preset.shape === 'circle' ? 0.18 : 0.10,
      x: 0.38,
      y: 0.45,
      stampPreset: preset.id
    });
    setShowStampPicker(false);
  };

  // Handle Custom Stamp Image File Upload
  const handleCustomStampUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result;
      onAddFieldToActivePage({
        type: 'stamp',
        pageIndex: activePageIndex,
        value: 'Custom Stamp',
        dataUrl: dataUrl,
        width: 0.20,
        height: 0.12,
        x: 0.4,
        y: 0.4
      });
      setShowStampPicker(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="studio-sidebar flex flex-col h-full bg-[var(--bg-primary)] border-l border-[var(--border-subtle)] text-[var(--text-primary)] select-none">
      
      {/* Header */}
      <div className="studio-sidebar-header p-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-primary)]">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Signing Options</h2>
          <p className="text-xs text-[var(--text-secondary)]">Place fields on page {activePageIndex + 1}</p>
        </div>
        {fields.length > 0 && (
          <button
            onClick={onClearAllFields}
            className="text-xs text-[var(--color-danger)] hover:underline font-semibold cursor-pointer transition-colors"
          >
            Clear all ({fields.length})
          </button>
        )}
      </div>

      {/* Main Options Scrollable Body */}
      <div className="studio-sidebar-content flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[var(--bg-primary)]">

        {/* ========================================================================= */}
        {/* ACTIVE SELECTED FIELD PROPERTIES INSPECTOR                                */}
        {/* ========================================================================= */}
        {selectedField && (
          <div className="bg-[var(--bg-secondary)] border-2 border-[var(--color-primary)] rounded-xl p-3.5 flex flex-col gap-3 shadow-md animate-[fadeIn_0.15s_ease-out]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">tune</span>
                Edit {selectedField.type.toUpperCase()}
              </span>
              <div className="flex items-center gap-1">
                {onDuplicateField && (
                  <button
                    onClick={() => onDuplicateField(selectedField.id)}
                    className="p-1 hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
                    title="Duplicate Field"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </button>
                )}
                <button
                  onClick={() => onRemoveField(selectedField.id)}
                  className="p-1 hover:bg-red-500/10 text-[var(--color-danger)] rounded-lg transition-colors cursor-pointer"
                  title="Remove this field"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click Page Alignment Actions */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Align on Page
              </label>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => onAlignField(selectedField.id, 'center-h')}
                  className="py-1 px-1.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[10px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Center horizontally"
                >
                  <span className="material-symbols-outlined text-[12px]">format_align_center</span>
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => onAlignField(selectedField.id, 'left-margin')}
                  className="py-1 px-1.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[10px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Align left margin"
                >
                  <span className="material-symbols-outlined text-[12px]">format_align_left</span>
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => onAlignField(selectedField.id, 'right-margin')}
                  className="py-1 px-1.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[10px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Align right margin"
                >
                  <span className="material-symbols-outlined text-[12px]">format_align_right</span>
                  Right
                </button>
                <button
                  type="button"
                  onClick={() => onAlignField(selectedField.id, 'bottom-line')}
                  className="py-1 px-1.5 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg text-[10px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  title="Align to bottom signing line"
                >
                  <span className="material-symbols-outlined text-[12px]">vertical_align_bottom</span>
                  Bottom
                </button>
              </div>
            </div>

            {/* Multi-Signer Party Attribution (Contract Signing Workflow) */}
            <div className="flex flex-col gap-1.5 bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center justify-between">
                <span>Signer Attribution</span>
                {isPro && <span className="text-[9px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.2 rounded">PRO</span>}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: 'Signer 1', role: 'Signer 1 (Me)', color: '#1D4ED8' },
                  { label: 'Signer 2', role: 'Signer 2 (Client)', color: '#059669' },
                  { label: 'Witness', role: 'Witness / Notary', color: '#7C3AED' }
                ].map((s) => {
                  const isAssigned = (selectedField.signerRole || 'Signer 1') === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => onUpdateField(selectedField.id, { signerRole: s.label, signerColor: s.color })}
                      className={`py-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                        isAssigned
                          ? 'text-white shadow-xs'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                      }`}
                      style={{
                        backgroundColor: isAssigned ? s.color : undefined,
                        borderColor: isAssigned ? s.color : undefined
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isAssigned ? '#ffffff' : s.color }} />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Specific Format Controls */}
            {selectedField.type === 'date' && (
              <div className="flex flex-col gap-2 bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Date Format Preset
                  </label>
                  <span className="text-[10px] text-[var(--color-primary)] font-semibold">Live Formatter</span>
                </div>

                <select
                  value={selectedField.dateFormat || selectedDateFormat}
                  onChange={(e) => {
                    const newFmt = e.target.value;
                    const isLong = newFmt.includes('MONTH');
                    const formatted = formatDateByPattern(new Date(), newFmt);
                    onUpdateField(selectedField.id, {
                      dateFormat: newFmt,
                      value: formatted,
                      width: isLong ? Math.max(selectedField.width, 0.34) : selectedField.width
                    });
                  }}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium cursor-pointer"
                >
                  <optgroup label="Slash Separators (/)">
                    {DATE_FORMAT_PRESETS.filter(f => f.group === 'Slash').map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Hyphen Separators (-)">
                    {DATE_FORMAT_PRESETS.filter(f => f.group === 'Hyphen').map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Dot Separators (.)">
                    {DATE_FORMAT_PRESETS.filter(f => f.group === 'Dot').map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Textual Month Formats">
                    {DATE_FORMAT_PRESETS.filter(f => f.group === 'Textual').map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </optgroup>
                </select>

                {/* Quick One-Click Format Buttons */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { id: 'MM/DD/YYYY', label: 'MM/DD/YY' },
                    { id: 'DD/MM/YYYY', label: 'DD/MM/YY' },
                    { id: 'YYYY-MM-DD', label: 'ISO YYYY-MM' },
                    { id: 'MONTH_LONG_D_Y', label: 'Month DD' },
                    { id: 'DD.MM.YYYY', label: 'DD.MM' }
                  ].map((p) => {
                    const isActive = (selectedField.dateFormat || selectedDateFormat) === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const formatted = formatDateByPattern(new Date(), p.id);
                          const isLong = p.id.includes('MONTH');
                          onUpdateField(selectedField.id, {
                            dateFormat: p.id,
                            value: formatted,
                            width: isLong ? Math.max(selectedField.width, 0.34) : selectedField.width
                          });
                        }}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                            : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Value Editor for Text / Name / Email / Title / Company / Date */}
            {['text', 'name', 'email', 'title', 'company', 'date'].includes(selectedField.type) && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    {selectedField.type === 'date' ? 'Date Value (Type or Pick)' : 'Content / Text Value'}
                  </label>

                  {selectedField.type === 'date' && (
                    <label className="text-[10px] text-[var(--color-primary)] font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-[13px]">calendar_month</span>
                      Pick Date
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [yr, mo, da] = e.target.value.split('-');
                            const picked = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, parseInt(da, 10));
                            const pat = selectedField.dateFormat || selectedDateFormat;
                            const formatted = formatDateByPattern(picked, pat);
                            const isLong = pat.includes('MONTH');
                            onUpdateField(selectedField.id, {
                              value: formatted,
                              width: isLong ? Math.max(selectedField.width, 0.34) : selectedField.width
                            });
                          }
                        }}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>

                <input
                  type="text"
                  value={selectedField.value || ''}
                  onChange={(e) => {
                    const pat = selectedField.dateFormat || selectedDateFormat;
                    const val = selectedField.type === 'date' ? formatTypingDate(e.target.value, pat) : e.target.value;
                    onUpdateField(selectedField.id, { value: val });
                  }}
                  onBlur={() => {
                    if (selectedField.type === 'date' && selectedField.value) {
                      const pat = selectedField.dateFormat || selectedDateFormat;
                      const validated = validateAndFormatDate(selectedField.value, pat);
                      onUpdateField(selectedField.id, { value: validated });
                    }
                  }}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-medium font-mono"
                  placeholder={selectedField.type === 'date' ? (selectedField.dateFormat || selectedDateFormat) : 'Enter text...'}
                />
              </div>
            )}

            {/* Typography & Alignment Controls for Text / Name / Email / Title / Company */}
            {['text', 'name', 'email', 'title', 'company'].includes(selectedField.type) && (
              <div className="flex flex-col gap-2 pt-1 border-t border-[var(--border-subtle)]/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Text Alignment</span>
                  <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                    {[
                      { id: 'left', icon: 'format_align_left' },
                      { id: 'center', icon: 'format_align_center' },
                      { id: 'right', icon: 'format_align_right' }
                    ].map((al) => (
                      <button
                        key={al.id}
                        type="button"
                        onClick={() => onUpdateField(selectedField.id, { textAlign: al.id })}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          (selectedField.textAlign || 'center') === al.id
                            ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">{al.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid vs Transparent Box Toggle */}
                <label className="flex items-center justify-between cursor-pointer py-1 bg-[var(--bg-primary)] px-2 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">Solid White Background</span>
                  <input
                    type="checkbox"
                    checked={selectedField.bgStyle === 'white' || selectedField.bgStyle === 'solid'}
                    onChange={(e) => onUpdateField(selectedField.id, { bgStyle: e.target.checked ? 'white' : 'transparent' })}
                    className="w-3.5 h-3.5 rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Checkbox State & Style Toggle */}
            {selectedField.type === 'checkbox' && (
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between cursor-pointer py-1.5 bg-[var(--bg-primary)] px-2.5 rounded-lg border border-[var(--border-subtle)]">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Checked / Ticked</span>
                  <input
                    type="checkbox"
                    checked={selectedField.checked !== false}
                    onChange={(e) => onUpdateField(selectedField.id, { checked: e.target.checked })}
                    className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer"
                  />
                </label>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Symbol Style</span>
                  <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                    {[
                      { id: 'check', label: 'Check' },
                      { id: 'cross', label: 'Cross' },
                      { id: 'square', label: 'Filled' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onUpdateField(selectedField.id, { checkStyle: st.id })}
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
                          (selectedField.checkStyle || 'check') === st.id
                            ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-bold'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Color Swatch Picker */}
            {['text', 'name', 'email', 'title', 'company', 'date', 'signature', 'initials', 'checkbox'].includes(selectedField.type) && (
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/60">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Ink Color</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: '#000000', label: 'Legal Black', bg: 'bg-black' },
                    { id: '#002060', label: 'Contract Navy', bg: 'bg-[#002060]' },
                    { id: '#1e40af', label: 'Royal Blue', bg: 'bg-[#1e40af]' },
                    { id: '#0d5c3a', label: 'Forest Green', bg: 'bg-[#0d5c3a]' },
                    { id: '#b91c1c', label: 'Crimson Red', bg: 'bg-[#b91c1c]' },
                    { id: '#b45309', label: 'Seal Gold', bg: 'bg-[#b45309]' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onUpdateField(selectedField.id, { color: c.id })}
                      className={`w-4 h-4 rounded-full ${c.bg} cursor-pointer transition-all border border-white/20 ${
                        selectedField.color === c.id ? 'ring-2 ring-offset-2 ring-[var(--color-primary)] scale-115' : 'opacity-75 hover:opacity-100'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Page Bulk Apply */}
            {totalPages > 1 && (
              <button
                type="button"
                onClick={() => onApplyAll(selectedField.id, totalPages)}
                className="w-full py-1.5 px-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-lg text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Clone this field to the exact same position across all pages"
              >
                <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">auto_stories</span>
                Apply to All Pages ({totalPages})
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. SECURITY MODE SWITCHER                                                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Signature Security Mode
          </div>
          <div className="flex gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)] shadow-xs">
            <button
              onClick={() => setSecurityMode('simple')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                securityMode === 'simple'
                  ? 'btn-primary text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">draw</span>
              Simple Electronic
            </button>

            <button
              onClick={() => setSecurityMode('digital')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                securityMode === 'digital'
                  ? 'btn-primary text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">verified</span>
              Digital X.509
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PRIMARY SIGNATURE & INITIALS CARDS                                     */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Signatures & Initials
          </div>

          {/* Signature Card */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-3 flex flex-col gap-2 shadow-xs hover:border-[var(--color-primary)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">draw</span>
                Signature
              </span>
              <button
                onClick={() => onOpenSignatureModal('signature')}
                className="text-[11px] text-[var(--color-primary)] hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">edit</span>
                {signatureData?.dataUrl ? 'Change' : 'Create'}
              </button>
            </div>

            {signatureData?.dataUrl ? (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, 'signature')}
                onClick={() => handleQuickAdd('signature')}
                className="bg-white rounded-lg p-2 flex items-center justify-center h-14 border border-[var(--border-subtle)] cursor-grab hover:border-[var(--color-primary)] transition-all hover:shadow-md group relative"
                title="Click or drag onto document"
              >
                <img src={signatureData.dataUrl} alt="Signature" className="max-h-full max-w-full object-contain pointer-events-none" />
                <span className="absolute bottom-1 right-1.5 text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  + Add
                </span>
              </div>
            ) : (
              <button
                onClick={() => onOpenSignatureModal('signature')}
                className="w-full py-2.5 rounded-lg border border-dashed border-[var(--border-medium)] hover:border-[var(--color-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">add</span>
                Create Signature
              </button>
            )}
          </div>

          {/* Initials Card */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-3 flex flex-col gap-2 shadow-xs hover:border-[var(--color-primary)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[var(--color-accent)]">history_edu</span>
                Initials
              </span>
              <button
                onClick={() => onOpenInitialsModal('initials')}
                className="text-[11px] text-[var(--color-primary)] hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">edit</span>
                {initialsData?.dataUrl ? 'Change' : 'Create'}
              </button>
            </div>

            {initialsData?.dataUrl ? (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, 'initials')}
                onClick={() => handleQuickAdd('initials')}
                className="bg-white rounded-lg p-2 flex items-center justify-center h-14 border border-[var(--border-subtle)] cursor-grab hover:border-[var(--color-primary)] transition-all hover:shadow-md group relative"
                title="Click or drag onto document"
              >
                <img src={initialsData.dataUrl} alt="Initials" className="max-h-full max-w-full object-contain pointer-events-none" />
                <span className="absolute bottom-1 right-1.5 text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  + Add
                </span>
              </div>
            ) : (
              <button
                onClick={() => onOpenInitialsModal('initials')}
                className="w-full py-2.5 rounded-lg border border-dashed border-[var(--border-medium)] hover:border-[var(--color-primary)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-[var(--color-accent)]">add</span>
                Create Initials
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. DOCUMENT FIELDS PALETTE                                                */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Document Fields
            </div>
            <button
              onClick={() => setShowFieldConfig(!showFieldConfig)}
              className="text-[11px] text-[var(--color-primary)] hover:underline font-semibold cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">settings</span>
              {showFieldConfig ? 'Hide Defaults' : 'Signer Profile'}
            </button>
          </div>

          {/* Expandable Signer Defaults Editor */}
          {showFieldConfig && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-3 flex flex-col gap-2 text-xs animate-[fadeIn_0.12s_ease-out]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Signer Full Name</label>
                <input
                  type="text"
                  value={customSignerName}
                  onChange={(e) => setCustomSignerName(e.target.value)}
                  className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Signer Email</label>
                <input
                  type="email"
                  value={customSignerEmail}
                  onChange={(e) => setCustomSignerEmail(e.target.value)}
                  className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Job Title</label>
                  <input
                    type="text"
                    value={customJobTitle}
                    onChange={(e) => setCustomJobTitle(e.target.value)}
                    className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Company</label>
                  <input
                    type="text"
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Smart Signature Line Detection Indicator */}
          {detectedZones && detectedZones.length > 0 && (
            <div className="bg-[var(--bg-secondary)] border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between shadow-xs animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-500">auto_awesome</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {detectedZones.length} Signature Line{detectedZones.length > 1 ? 's' : ''} Found
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">AcroForm & text cues detected</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const currentZone = detectedZones.find((z) => z.pageIndex === activePageIndex) || detectedZones[0];
                  if (currentZone) onApplyDetectedZone(currentZone);
                }}
                className="btn btn-primary btn-sm text-[11px] font-bold py-1 px-2.5 shadow-xs cursor-pointer"
              >
                Auto-Place
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* Date Field */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, 'date')}
              onClick={() => handleQuickAdd('date')}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-grab shadow-xs group"
              title="Click or drag onto document"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-emerald-500">calendar_today</span>
                Date
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{formatDateByPattern(new Date(), selectedDateFormat)}</span>
            </button>

            {/* Legal Name Field */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, 'name')}
              onClick={() => handleQuickAdd('name')}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-grab shadow-xs group"
              title="Click or drag onto document"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-indigo-500">badge</span>
                Signer Name
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{customSignerName}</span>
            </button>

            {/* Signer Email Field */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, 'email')}
              onClick={() => handleQuickAdd('email')}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-grab shadow-xs group"
              title="Click or drag onto document"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-violet-500">mail</span>
                Email
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{customSignerEmail}</span>
            </button>

            {/* Job Title Field */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, 'title')}
              onClick={() => handleQuickAdd('title')}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-grab shadow-xs group"
              title="Click or drag onto document"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-blue-500">work</span>
                Job Title
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{customJobTitle}</span>
            </button>

            {/* Company Field */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, 'company')}
              onClick={() => handleQuickAdd('company')}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-grab shadow-xs group"
              title="Click or drag onto document"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-cyan-500">corporate_fare</span>
                Company
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{customCompany}</span>
            </button>

            {/* Custom Text Field */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, 'text')}
              onClick={() => handleQuickAdd('text')}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-grab shadow-xs group"
              title="Click or drag onto document"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-amber-500">title</span>
                Text Box
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] truncate">{customTextContent}</span>
            </button>

            {/* Checkbox Field */}
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, 'checkbox')}
              onClick={() => handleQuickAdd('checkbox')}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-grab shadow-xs group"
              title="Click or drag onto document"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-sky-500">check_box</span>
                Checkbox
              </div>
              <span className="text-[10px] text-[var(--text-secondary)]">Approval tick</span>
            </button>

            {/* Official Stamp & Seal Picker Button */}
            <button
              onClick={() => setShowStampPicker(!showStampPicker)}
              className="p-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] rounded-xl text-left flex flex-col gap-1 transition-all cursor-pointer shadow-xs group"
              title="Pick an official corporate stamp or seal"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <span className="material-symbols-outlined text-[15px] text-rose-500">verified</span>
                Stamp / Seal
              </div>
              <span className="text-[10px] text-[var(--color-primary)] font-semibold flex items-center gap-0.5">
                {showStampPicker ? 'Close Picker' : 'Choose Preset →'}
              </span>
            </button>
          </div>

          {/* Official Stamp & Seal Presets Dropdown */}
          {showStampPicker && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-medium)] rounded-xl p-3 flex flex-col gap-2 shadow-lg animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Official Stamp Presets
                </span>
                <label className="text-[10px] text-[var(--color-primary)] font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                  <span className="material-symbols-outlined text-[12px]">upload</span>
                  Upload Custom
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleCustomStampUpload}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {STAMP_PRESETS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleAddStampPreset(st)}
                    className="p-2 rounded-lg border text-left flex flex-col gap-0.5 transition-all hover:scale-102 cursor-pointer bg-[var(--bg-primary)] hover:border-[var(--color-primary)]"
                    style={{ borderColor: `${st.color}40` }}
                  >
                    <span className="text-[11px] font-black tracking-wide" style={{ color: st.color }}>
                      {st.text}
                    </span>
                    <span className="text-[9px] text-[var(--text-secondary)] truncate">
                      {st.shape === 'circle' ? 'Circular Seal' : 'Boxed Stamp'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Universal Smart Cropper Panel */}
        {cropper && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <SmartCropperPanel
              cropper={cropper}
              totalPages={totalPages}
              onActivate={() => {}}
              onRevert={() => {}}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. SECURITY & COMPLIANCE                                                  */}
        {/* ========================================================================= */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-3 flex flex-col gap-3 text-xs shadow-xs">
          <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            Signature Security Standard
          </div>

          {/* Security Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setSecurityMode('simple')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                securityMode === 'simple'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Standard (SES)</span>
              <span className="text-[9px] font-normal opacity-80">100% Local Privacy</span>
            </button>

            <button
              type="button"
              onClick={() => setSecurityMode('digital')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                securityMode === 'digital'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>Digital Seal</span>
                <span className="text-[8px] bg-amber-400 text-amber-950 font-black px-1 rounded">X.509</span>
              </div>
              <span className="text-[9px] font-normal opacity-80">pyHanko Cryptographic</span>
            </button>
          </div>

          {/* Digital Signature Detailed Certificate Options */}
          {securityMode === 'digital' && (
            <div className="bg-[var(--bg-primary)] p-2.5 rounded-xl border border-[var(--border-subtle)] flex flex-col gap-2 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">X.509 Certificate Settings</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px]">verified_user</span>
                  Tamper-Sealed
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">Signer Common Name (CN)</label>
                <input
                  type="text"
                  value={digitalCertSettings.commonName || ''}
                  onChange={(e) => setDigitalCertSettings({ ...digitalCertSettings, commonName: e.target.value })}
                  placeholder="DocScalar Verified Signer"
                  className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)]">Signer Email</label>
                <input
                  type="email"
                  value={digitalCertSettings.email || ''}
                  onChange={(e) => setDigitalCertSettings({ ...digitalCertSettings, email: e.target.value })}
                  placeholder="signer@company.com"
                  className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Custom PKCS#12 (.pfx / .p12) Certificate Upload (Pro Feature) */}
              <div className="flex flex-col gap-1 pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                    <span>Enterprise PKCS#12 (.pfx)</span>
                    <span className="text-[8.5px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.2 rounded">PRO</span>
                  </label>
                  {digitalCertSettings.customCertificateFile && (
                    <button
                      type="button"
                      onClick={() => setDigitalCertSettings({ ...digitalCertSettings, customCertificateFile: null })}
                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {digitalCertSettings.customCertificateFile ? (
                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                    <span className="truncate max-w-[180px] font-mono">{digitalCertSettings.customCertificateFile.name}</span>
                    <span className="text-[9px] font-bold">Attached</span>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-subtle)] rounded-lg text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-[14px]">file_upload</span>
                    <span>Upload .pfx or .p12 certificate</span>
                    <input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setDigitalCertSettings({ ...digitalCertSettings, customCertificateFile: file });
                      }}
                      className="sr-only"
                    />
                  </label>
                )}

                <input
                  type="password"
                  value={digitalCertSettings.passphrase || ''}
                  onChange={(e) => setDigitalCertSettings({ ...digitalCertSettings, passphrase: e.target.value })}
                  placeholder="Certificate passphrase (optional)"
                  className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)] mt-1"
                />
              </div>
            </div>
          )}

          {/* Flatten Document & Audit Trail Toggles */}
          <label className="flex items-start justify-between gap-2 cursor-pointer group">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                Flatten Document
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] leading-tight">
                Locks all signatures & fields to prevent editing
              </span>
            </div>
            <input
              type="checkbox"
              checked={flattenDocument}
              onChange={(e) => setFlattenDocument(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer mt-0.5"
            />
          </label>

          <div className="h-[1px] bg-[var(--border-subtle)]/60 my-0.5" />

          <label className="flex items-start justify-between gap-2 cursor-pointer group">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                Audit Trail Certificate
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] leading-tight">
                Certificate of Completion with SHA-256 fingerprint
              </span>
            </div>
            <input
              type="checkbox"
              checked={generateCertificate}
              onChange={(e) => setGenerateCertificate(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-primary)] cursor-pointer mt-0.5"
            />
          </label>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* STICKY BOTTOM ACTION FOOTER                                               */}
      {/* ========================================================================= */}
      <div className="studio-sidebar-footer p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] flex flex-col gap-2.5">
        {processing && (
          <div className="w-full flex flex-col gap-1.5">
            <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] text-center">Processing signatures... {progress}%</p>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-xs text-center font-medium bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-2 rounded-lg">
            {error}
          </p>
        )}

        {onExecuteSigning && (
          <button
            onClick={onExecuteSigning}
            disabled={processing || fields.length === 0}
            className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 font-bold shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                <span>Signing Document...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">draw</span>
                <span>Sign PDF</span>
                {fields.length > 0 && (
                  <span className="px-2 py-0.5 text-[11px] rounded-full bg-white/20 text-white font-semibold ml-1">
                    {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                  </span>
                )}
                <span className="text-sm font-bold ml-0.5">→</span>
              </>
            )}
          </button>
        )}
      </div>

    </div>
  );
}
