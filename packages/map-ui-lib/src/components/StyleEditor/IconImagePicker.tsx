import { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';

interface IconImagePickerProps {
  value: string;
  onChange: (value: string) => void;
  availableIcons?: string[];
}

export function IconImagePicker({ value, onChange, availableIcons }: IconImagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const activeDescendant = highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined;

  const filtered = useMemo(() => {
    if (!availableIcons || availableIcons.length === 0) return [];
    if (!value) return availableIcons;
    const lower = value.toLowerCase();
    return availableIcons.filter((icon) => icon.toLowerCase().includes(lower));
  }, [availableIcons, value]);

  const shouldShowDropdown = isOpen && filtered.length > 0;

  const selectItem = useCallback(
    (item: string) => {
      onChange(item);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShowDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      selectItem(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const inputClass =
    'mapui:w-full mapui:rounded mapui:border mapui:border-gray-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

  if (!availableIcons || availableIcons.length === 0) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value || '')}
        placeholder="icon-name"
        className={inputClass}
      />
    );
  }

  return (
    <div ref={containerRef} className="mapui:relative">
      <input
        type="text"
        value={value}
        placeholder="Search icons…"
        role="combobox"
        aria-expanded={shouldShowDropdown}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputClass}
      />
      {shouldShowDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="mapui:absolute mapui:z-10 mapui:mt-1 mapui:w-full mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:shadow-lg mapui:max-h-48 mapui:overflow-y-auto mapui:p-0 mapui:m-0 mapui:list-none"
        >
          {filtered.map((icon, index) => (
            <li
              key={`${index}-${icon}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectItem(icon);
              }}
              className={`mapui:cursor-pointer mapui:px-2 mapui:py-1 mapui:text-sm mapui:font-mono ${
                index === highlightedIndex ? 'mapui:bg-blue-100' : 'hover:mapui:bg-gray-50'
              }`}
            >
              {icon}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
