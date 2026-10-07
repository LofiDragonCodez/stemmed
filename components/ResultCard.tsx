"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export type CardItem = {
  label: string;
  value: string | number | null;
  fontClass: string;
};

type ResultCardProps = {
  item: CardItem;
  index: number;
  loading: boolean;
};

export default function ResultCard({
  item,
  index,
  loading,
}: ResultCardProps) {
  const [toast, setToast] = useState("");
  const value = item.value == null ? null : String(item.value);

  async function copyValue() {
    if (!value || loading) return;
    try {
      await navigator.clipboard.writeText(value);
      setToast("copied");
    } catch (error) {
      console.error("Unable to copy card value:", error);
      setToast("couldn't copy");
    }
    window.setTimeout(() => setToast(""), 1400);
  }

  return (
    <motion.button
      type="button"
      className={`result-card ${item.fontClass}`}
      aria-label={`${item.label}${value ? `: ${value}` : ""}${loading ? ", loading" : ""}`}
      onClick={copyValue}
      disabled={!value || loading}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.38, delay: index * 0.07 }}
      whileHover={value && !loading ? { y: -4, scale: 1.015 } : undefined}
      whileTap={value && !loading ? { scale: 0.985 } : undefined}
    >
      {loading ? (
        <span className="card-loading" aria-label={`Loading ${item.label}`}>
          <i />
          <i />
          <i />
        </span>
      ) : (
        <>
          <span className="card-label">{item.label}</span>
          {value !== null && (
            <motion.span
              className="card-value"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: index * 0.07 + 0.08 }}
              title={value}
            >
              {value}
            </motion.span>
          )}
        </>
      )}
      <span className="copy-toast" aria-live="polite">
        {toast}
      </span>
    </motion.button>
  );
}
