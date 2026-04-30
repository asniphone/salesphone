"use client";

import { useEffect, useRef } from "react";

export function useGlobalScanner(onScan: (code: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a textarea or if they are holding control/command keys
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      const currentTime = Date.now();
      
      // If time between keystrokes is more than 50ms, it's likely human typing.
      // Barcode scanners usually input characters with 10-30ms intervals.
      if (currentTime - lastKeyTimeRef.current > 50) {
        bufferRef.current = "";
      }
      
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        if (bufferRef.current.length > 3) {
          onScan(bufferRef.current);
          bufferRef.current = "";
          
          // Prevent form submission if the scanner triggered an enter key
          if (e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }
      } else if (e.key.length === 1) { // Only add printable characters
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
}
