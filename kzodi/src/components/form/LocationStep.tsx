"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BirthLocation } from "@/lib/store";

interface LocationStepProps {
  personLabel: string;
  onSubmit: (loc: BirthLocation) => void;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

const LocationStep: React.FC<LocationStepProps> = ({ personLabel, onSubmit }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<BirthLocation | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCity = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&accept-language=en`,
        { headers: { "User-Agent": "KZodi/1.0" } }
      );
      if (res.ok) {
        const data: NominatimResult[] = await res.json();
        // Deduplicate by city+country + proximity (within 0.5 degree ~50km)
        const unique: NominatimResult[] = [];
        for (const r of data) {
          const city = (r.address?.city || r.address?.town || r.address?.village || r.display_name.split(",")[0]).trim().toLowerCase();
          const country = (r.address?.country || "").trim().toLowerCase();
          const lat = parseFloat(r.lat);
          const lon = parseFloat(r.lon);
          const isDup = unique.some((u) => {
            const uCity = (u.address?.city || u.address?.town || u.address?.village || u.display_name.split(",")[0]).trim().toLowerCase();
            const uCountry = (u.address?.country || "").trim().toLowerCase();
            if (uCity !== city || uCountry !== country) return false;
            const dLat = Math.abs(parseFloat(u.lat) - lat);
            const dLon = Math.abs(parseFloat(u.lon) - lon);
            return dLat < 0.5 && dLon < 0.5;
          });
          if (!isDup) unique.push(r);
        }
        setResults(unique.slice(0, 5));
      }
    } catch {
      setResults([]);
    }
    setIsSearching(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCity(val), 400);
  };

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSelect = async (r: NominatimResult) => {
    const city = r.address?.city || r.address?.town || r.address?.village || r.display_name.split(",")[0];
    const country = r.address?.country || "";
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);

    // Get accurate timezone from coordinates via free API
    let tz = Math.round(lng / 15); // fallback
    try {
      const tzRes = await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${lat}&longitude=${lng}`);
      if (tzRes.ok) {
        const tzData = await tzRes.json();
        // currentUtcOffset is like "+06:30" or "-05:00"
        if (tzData.currentUtcOffset) {
          const offsetStr = tzData.currentUtcOffset.value || tzData.currentUtcOffset;
          const match = String(offsetStr).match(/([+-]?)(\d{1,2}):(\d{2})/);
          if (match) {
            const sign = match[1] === "-" ? -1 : 1;
            const hours = parseInt(match[2]);
            const minutes = parseInt(match[3]);
            tz = sign * (hours + minutes / 60);
          }
        } else if (typeof tzData.standardUtcOffset === "object" && tzData.standardUtcOffset.seconds != null) {
          tz = tzData.standardUtcOffset.seconds / 3600;
        }
      }
    } catch {
      // Use fallback estimation
    }

    const loc: BirthLocation = { city, country, lat, lng, tz };
    setSelected(loc);
    setQuery(`${city}, ${country}`);
    setResults([]);
  };

  return (
    <div className="pt-3">
      <div className="flex items-center gap-2 mb-5">
        <div className="step-number bg-warm-black text-pastel-yellow">
          <span className="text-[11px]">04</span>
        </div>
        <h3 className="font-[var(--font-display)] text-[18px] font-800 tracking-[-0.02em] text-3d">
          {personLabel} Birth Location
        </h3>
      </div>

      <p className="text-warm-gray text-[13px] mb-4 leading-relaxed">
        Enter the city where {personLabel === "Your" ? "you were" : `${personLabel} was`} born. This is needed for accurate house calculations in the birth chart.
      </p>

      {/* Search input */}
      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search city..."
          className="input-field pr-10"
          autoFocus
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-warm-black/20 border-t-warm-black rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      <AnimatePresence>
        {results.length > 0 && !selected && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="card-bordered overflow-hidden mb-4"
          >
            {results.map((r, i) => {
              const city = r.address?.city || r.address?.town || r.address?.village || r.display_name.split(",")[0];
              const country = r.address?.country || "";
              return (
                <button
                  key={r.place_id}
                  onClick={() => handleSelect(r)}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors hover:bg-light-gray active:bg-light-gray ${i !== results.length - 1 ? "border-b border-border-soft" : ""}`}
                >
                  <div className="w-8 h-8 rounded-[10px] bg-pastel-yellow-soft flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5S12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z" stroke="#111" strokeWidth="1.2" fill="none" />
                      <circle cx="8" cy="6" r="1.5" stroke="#111" strokeWidth="1.2" fill="none" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-600 text-[14px] text-warm-black truncate">{city}</p>
                    <p className="text-[12px] text-warm-gray truncate">{country}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected preview */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-accent p-4 mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-pastel-yellow flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6C3.5 9.5 8 14.5 8 14.5S12.5 9.5 12.5 6C12.5 3.5 10.5 1.5 8 1.5Z" stroke="#111" strokeWidth="1.3" fill="none" />
                <circle cx="8" cy="6" r="1.5" stroke="#111" strokeWidth="1.3" fill="none" />
              </svg>
            </div>
            <div>
              <p className="font-700 text-[15px] text-warm-black">{selected.city}</p>
              <p className="text-[12px] text-warm-gray">{selected.country} (UTC{selected.tz >= 0 ? "+" : ""}{selected.tz})</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Continue */}
      <button
        onClick={() => selected && onSubmit(selected)}
        disabled={!selected}
        className="btn-primary w-full text-[15px]"
      >
        Continue
      </button>

      {/* Info card */}
      <div className="card-bordered p-4 mt-4">
        <p className="text-[12px] text-warm-gray leading-relaxed">
          Birth location determines the house cusps in your chart. Houses represent different life areas such as career, relationships, and personal growth. Accurate location gives more precise readings.
        </p>
      </div>
    </div>
  );
};

export default LocationStep;
