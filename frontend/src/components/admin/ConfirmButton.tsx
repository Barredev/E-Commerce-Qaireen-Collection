"use client";

import { useState, type ReactNode } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";

export function ConfirmButton({
  label = "Hapus",
  message,
  confirmText,
  children,
  onConfirm,
  variant = "ghost",
  size = "sm",
  disabled,
}: {
  label?: string;
  message?: string;
  confirmText?: string;
  children?: ReactNode;
  onConfirm: () => Promise<void>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
}) {
  const [working, setWorking] = useState(false);
  const promptMessage = confirmText ?? message ?? "Apakah Anda yakin?";

  async function handleClick() {
    if (!window.confirm(promptMessage)) {
      return;
    }

    setWorking(true);

    try {
      await onConfirm();
    } finally {
      setWorking(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      loading={working}
      disabled={disabled}
      onClick={handleClick}
    >
      {children ?? label}
    </Button>
  );
}
