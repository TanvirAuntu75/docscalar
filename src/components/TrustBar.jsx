export default function TrustBar() {
  return (
    <div className="trust-bar flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mt-2 mb-1 select-none w-full animate-in fade-in slide-in-from-top-2 duration-400 delay-100">
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-success/90 bg-success/5 px-3 py-1.5 rounded-full border border-success/10">
        <span className="material-symbols-outlined text-[16px] fill">verified_user</span>
        <span>100% Local Processing</span>
      </div>
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30">
        <span className="material-symbols-outlined text-[16px]">lock</span>
        <span>Files Never Leave Your Device</span>
      </div>
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30 hidden sm:flex">
        <span className="material-symbols-outlined text-[16px]">bolt</span>
        <span>No Upload Required</span>
      </div>
    </div>
  );
}
