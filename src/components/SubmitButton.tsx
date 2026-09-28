"use client";

import { useFormStatus } from "react-dom";

interface Props {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Working…",
  variant = "primary",
  disabled = false,
  className = "",
}: Props) {
  const { pending } = useFormStatus();
  const base = variant === "primary" ? "gov-btn-primary" : "gov-btn-secondary";

  return (
    <button type="submit" disabled={pending || disabled} className={`${base} ${className}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
