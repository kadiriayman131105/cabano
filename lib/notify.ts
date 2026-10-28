"use client";

import { toast } from "sonner";

const successStyle = { background: "#16A34A", color: "#ffffff", border: "none" };

export function notifySaved(message: string) {
  toast.success(message, { style: successStyle });
}

export function notifyError(message: string) {
  toast.error(message);
}

export function notifyInfo(message: string) {
  toast(message, { style: { background: "#0A1428", color: "#ffffff", border: "none" } });
}
