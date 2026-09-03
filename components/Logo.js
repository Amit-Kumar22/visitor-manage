const SIZES = {
  sm: { icon: 20, text: "text-base" },
  md: { icon: 24, text: "text-lg" },
  lg: { icon: 32, text: "text-2xl" },
};

// Simple drone-motif wordmark standing in for the HiProTech logo, since we
// don't have the actual brand asset to embed here.
export default function Logo({ size = "md", className = "" }) {
  const { icon, text } = SIZES[size] || SIZES.md;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <circle cx="4" cy="4" r="2.2" stroke="#0f172a" strokeWidth="1.4" />
        <circle cx="20" cy="4" r="2.2" stroke="#0f172a" strokeWidth="1.4" />
        <circle cx="4" cy="20" r="2.2" stroke="#0f172a" strokeWidth="1.4" />
        <circle cx="20" cy="20" r="2.2" stroke="#0f172a" strokeWidth="1.4" />
        <path
          d="M6 6L10.3 10.3M18 6L13.7 10.3M6 18L10.3 13.7M18 18L13.7 13.7"
          stroke="#ea580c"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect x="9.3" y="9.3" width="5.4" height="5.4" rx="1.2" fill="#0f172a" />
      </svg>
      <span className={`${text} font-bold tracking-tight leading-none`}>
        <span className="text-slate-900">Hi</span>
        <span className="text-orange-600">Pro</span>
        <span className="text-slate-900">Tech</span>
      </span>
    </div>
  );
}
