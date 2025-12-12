import { useState, useRef, useEffect } from 'react';

interface SearchableSelectProps {
  value: string;
  options: string[];
  placeholder?: string;
  label?: string;
  onChange: (value: string) => void;
  onLoadOptions?: () => Promise<void>;
  className?: string;
  compact?: boolean;
  autoSave?: () => void;
}

export default function SearchableSelect({
  value,
  options,
  placeholder = '请选择',
  label,
  onChange,
  onLoadOptions,
  className = '',
  compact = false,
  autoSave,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 过滤选项
  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async () => {
    if (!isOpen && options.length === 0 && onLoadOptions) {
      // 如果选项列表为空，先加载选项
      await onLoadOptions();
    }
    setIsOpen(!isOpen);
    setSearch('');
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearch('');
    if (autoSave) {
      autoSave();
    }
  };

  const baseClasses = compact
    ? 'w-full px-3 py-2 bg-card-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary cursor-pointer flex items-center justify-between hover:border-accent-primary transition-colors'
    : 'w-full px-3 py-2 bg-workspace-bg border border-accent-secondary rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary cursor-pointer flex items-center justify-between';

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}
      <div ref={selectRef} className="relative">
        <div onClick={handleToggle} className={baseClasses}>
          <span className={value ? (compact ? 'text-sm' : '') : 'text-text-muted'}>
            {value || placeholder}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-workspace-bg border border-accent-secondary rounded-md shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-accent-secondary">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="搜索..."
                className="w-full px-3 py-2 bg-card-bg border border-accent-secondary rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-sm"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={`px-3 py-2 cursor-pointer hover:bg-hover-bg ${
                      compact ? 'text-sm' : ''
                    } ${
                      value === option ? 'bg-selected-bg text-accent-primary' : 'text-text-primary'
                    }`}
                  >
                    {option}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-text-muted text-sm">未找到匹配的选项</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

