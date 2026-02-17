"use client";

import { useState, useEffect, useCallback } from "react";
import { handleCurrencyKeyInput } from "@/lib/utils";

interface CurrencyInputProps {
  value: string; // valor numerico como string (ex: "" ou o display formatado)
  onValueChange: (numericValue: number, displayValue: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
  id?: string;
}

export default function CurrencyInput({
  value,
  onValueChange,
  placeholder = "0,00",
  required = false,
  className = "",
  id,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(value);

  // Sincroniza display quando value externo muda (ex: reset do form)
  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Se vazio, limpa
      if (raw === "") {
        setDisplayValue("");
        onValueChange(0, "");
        return;
      }

      const { display, numericValue } = handleCurrencyKeyInput(raw);
      setDisplayValue(display);
      onValueChange(numericValue, display);
    },
    [onValueChange]
  );

  return (
    <input
      type="text"
      inputMode="decimal"
      id={id}
      value={displayValue}
      onChange={handleChange}
      className={
        className ||
        "w-full px-4 py-2.5 rounded-lg border border-[#232a3b] bg-[#141820] text-gray-100 focus:ring-2 focus:ring-lime-400/30 focus:border-transparent outline-none"
      }
      placeholder={placeholder}
      required={required}
      autoComplete="off"
    />
  );
}
