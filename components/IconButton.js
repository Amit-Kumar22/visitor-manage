"use client";

const VARIANTS = {
  default: "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
  danger: "text-red-500 hover:bg-red-50 hover:text-red-600",
  primary: "text-orange-600 hover:bg-orange-50",
};

export default function IconButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
  type = "button",
  size = "md",
}) {
  const dimension = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex ${dimension} shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${VARIANTS[variant]}`}
    >
      {icon}
    </button>
  );
}
