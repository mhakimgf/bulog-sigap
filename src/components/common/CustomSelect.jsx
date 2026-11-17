"use client";

import React, { useState, useRef, useEffect } from "react";

/**
 * CustomSelect - Reusable Custom Styled Dropdown for SIGAP Bulog
 * Eliminates ugly browser-native <select> and provides a sleek, touch-friendly UI.
 */
export const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Pilih opsi...",
  icon = null,
  size = "md", // 'sm' | 'md' | 'lg'
  disabled = false,
  className = "",
  searchable = false,
  name = "",
  id = "",
  fontMono = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options array: string[] or object[]
  const normalizedOptions = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string" || typeof opt === "number") {
        return { value: opt, label: String(opt) };
      }
      return {
        value: opt.value,
        label: opt.label || String(opt.value),
        sublabel: opt.sublabel || null,
        badge: opt.badge || null,
        icon: opt.icon || null,
        fontMono: opt.fontMono || false,
      };
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = normalizedOptions.find((o) => String(o.value) === String(value)) || null;

  // Filtered options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q)) ||
        (o.badge && o.badge.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Auto-enable search if more than 7 options
  const isSearchActive = searchable || normalizedOptions.length > 7;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchActive && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchActive]);

  // Handle option selection
  const handleSelect = (val) => {
    setIsOpen(false);
    setSearchQuery("");
    if (typeof onChange === "function") {
      const syntheticEvent = {
        target: { value: val, name: name || id || "" },
        currentTarget: { value: val },
        value: val,
        toString: () => String(val),
        valueOf: () => val,
      };
      onChange(syntheticEvent);
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Size styling classes
  const sizeClasses = {
    sm: "h-9 px-2.5 text-xs rounded-xl",
    md: "h-11 px-3.5 text-xs sm:text-sm rounded-xl",
    lg: "h-12 sm:h-14 px-4 text-sm sm:text-base rounded-2xl",
  }[size] || "h-11 px-3.5 text-xs sm:text-sm rounded-xl";

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block w-full text-left font-sans select-none ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 bg-white border transition-all duration-150 cursor-pointer shadow-xs ${sizeClasses} ${
          isOpen
            ? "border-[#1E3D73] ring-2 ring-[#1E3D73]/15 shadow-sm"
            : "border-slate-300 hover:border-slate-400 focus:border-[#1E3D73] focus:ring-2 focus:ring-[#1E3D73]/15"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100" : "bg-white"}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* Left Side: Icon & Selected Text */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && (
            <span className="material-symbols-outlined text-slate-400 text-[18px] flex-shrink-0">
              {icon}
            </span>
          )}

          <div className="min-w-0 flex items-center gap-2 truncate">
            {selectedOption ? (
              <>
                <span
                  className={`truncate font-semibold text-slate-900 ${
                    fontMono || selectedOption.fontMono ? "font-mono" : ""
                  }`}
                >
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span className="text-[10px] bg-blue-50 text-[#1E3D73] font-bold px-1.5 py-0.2 rounded font-mono flex-shrink-0">
                    {selectedOption.badge}
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400 font-normal truncate">{placeholder}</span>
            )}
          </div>
        </div>

        {/* Right Side: Chevron Arrow with rotation */}
        <div className="flex items-center pl-1 flex-shrink-0 text-slate-400">
          <span
            className={`material-symbols-outlined text-[20px] transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#1E3D73]" : "text-slate-400"
            }`}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Custom Floating Popover Menu */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1.5 w-full min-w-[200px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-72"
          role="listbox"
        >
          {/* Optional In-Menu Search Input */}
          {isSearchActive && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined text-slate-400 text-[16px] absolute left-2.5 pointer-events-none">
                  search
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pilihan..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1E3D73] focus:ring-1 focus:ring-[#1E3D73]"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1 no-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                Tidak ada pilihan yang cocok.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <div
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#EEF2F9] text-[#1E3D73] font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-[#0A1630]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.icon && (
                        <span className="material-symbols-outlined text-[16px] text-slate-400 flex-shrink-0">
                          {opt.icon}
                        </span>
                      )}
                      <div className="min-w-0">
                        <span
                          className={`block truncate ${
                            fontMono || opt.fontMono ? "font-mono" : ""
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {opt.badge && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <span className="material-symbols-outlined text-[#1E3D73] text-[16px]">
                          check
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
