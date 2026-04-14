import { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  onQueryChange,
  placeholder = '',
  className = '',
  id,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const activeDescendant = highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined;

  const filtered = useMemo(
    () => suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())),
    [suggestions, value],
  );

  const shouldShowDropdown = isOpen && filtered.length > 0;

  const selectItem = useCallback(
    (item: string) => {
      onChange(item);
      onQueryChange?.(item);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onChange, onQueryChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    onQueryChange?.(newVal);
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

  return (
    <div ref={containerRef} className={`mapui:relative ${className}`.trim()}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={shouldShowDropdown}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500"
      />
      {shouldShowDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="mapui:absolute mapui:z-10 mapui:mt-1 mapui:w-full mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:shadow-lg mapui:max-h-48 mapui:overflow-y-auto mapui:p-0 mapui:m-0 mapui:list-none"
        >
          {filtered.map((item, index) => (
            <li
              key={`${index}-${item}`}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                selectItem(item);
              }}
              className={`mapui:cursor-pointer mapui:px-2 mapui:py-1 mapui:text-sm ${
                index === highlightedIndex ? 'mapui:bg-blue-100' : 'hover:mapui:bg-slate-50'
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
