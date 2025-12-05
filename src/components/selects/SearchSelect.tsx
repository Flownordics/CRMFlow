import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';

export interface SearchSelectOption {
  id: string;
  label: string;
  subtitle?: string;
}

interface SearchSelectProps {
  value?: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => Promise<SearchSelectOption[]>;
  placeholder?: string;
  emptyMessage?: string;
  onCreateRequested?: (query: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SearchSelect({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  emptyMessage = "No results found",
  onCreateRequested,
  disabled = false,
  className
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [options, setOptions] = useState<SearchSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SearchSelectOption | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const hasLoadedInitialOptions = useRef(false);

  // Debounced search - define this first
  const performSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const results = await onSearch(query);
      setOptions(results);
    } catch (error) {
      logger.error("Search failed:", error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [onSearch]);

  // Find selected option when value changes
  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find(opt => opt.id === value);
      if (found) {
        setSelectedOption(found);
      }
    }
  }, [value, options]);

  // Load initial options when dropdown opens (only once)
  useEffect(() => {
    if (open && options.length === 0 && !isLoading && !hasLoadedInitialOptions.current) {
      hasLoadedInitialOptions.current = true;
      performSearch("");
    }
  }, [open, options.length, isLoading, performSearch]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if there's a query or if we don't have options yet
    if (searchQuery.trim() || options.length === 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 250);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch, options.length]);

  const handleSelect = (option: SearchSelectOption) => {
    setSelectedOption(option);
    onChange(option.id);
    setOpen(false);
    setSearchQuery("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset the flag when closing so we can load fresh options next time
      hasLoadedInitialOptions.current = false;
      setSearchQuery("");
    }
  };

  const handleCreate = () => {
    if (onCreateRequested && searchQuery.trim()) {
      onCreateRequested(searchQuery.trim());
      setOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedOption && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto min-w-[300px] sm:min-w-[400px] max-w-[90vw] sm:max-w-[600px] p-0 z-[10000]" 
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : options.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">{emptyMessage}</p>
                {onCreateRequested && searchQuery.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreate}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create "{searchQuery.trim()}"
                  </Button>
                )}
              </div>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.label}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {option.subtitle}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
