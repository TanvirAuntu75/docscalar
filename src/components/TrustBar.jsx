export default function TrustBar() {
  return (
    <div className="trust-bar flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-2 mb-1 select-none w-full animate-in fade-in slide-in-from-top-2 duration-400 delay-100">
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30">
        <span className="material-symbols-outlined text-[16px]">bolt</span>
        <span>Fast Secure Processing</span>
      </div>
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30">
        <span className="material-symbols-outlined text-[16px]">lock</span>
        <span>Encrypted Data Transfer</span>
      </div>
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30 hidden sm:flex">
        <span className="material-symbols-outlined text-[16px]">schedule</span>
        <span>Automatic File Purge</span>
      </div>
    </div>
  );
}
