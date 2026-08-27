export default function TrustBar({ isServer = false }) {
  if (isServer) {
    return (
      <div className="trust-bar flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-2 mb-1 select-none w-full animate-in fade-in slide-in-from-top-2 duration-400 delay-100">
        <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30">
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span>High Speed Processing</span>
        </div>
        <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30">
          <span className="material-symbols-outlined text-[16px]">timer</span>
          <span>Auto Deleted in 1 Hour</span>
        </div>
        <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30 hidden sm:flex">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <span>Encrypted In Transit</span>
        </div>
      </div>
    );
  }

  return (
    <div className="trust-bar flex flex-wrap justify-center items-center gap-x-4 gap-y-2 mt-2 mb-1 select-none w-full animate-in fade-in slide-in-from-top-2 duration-400 delay-100">
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30">
        <span className="material-symbols-outlined text-[16px]">verified_user</span>
        <span>100% Private & Local</span>
      </div>
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30">
        <span className="material-symbols-outlined text-[16px]">shield</span>
        <span>Files Never Leave Your Device</span>
      </div>
      <div className="trust-item flex items-center gap-1.5 text-[12px] font-semibold text-on-surface-variant/80 bg-surface-container-high/50 px-3 py-1.5 rounded-full border border-outline-variant/30 hidden sm:flex">
        <span className="material-symbols-outlined text-[16px]">bolt</span>
        <span>Zero Cloud Upload</span>
      </div>
    </div>
  );
}
