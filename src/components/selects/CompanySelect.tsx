import { useState, useEffect } from "react";
import { SearchSelect, SearchSelectOption } from "./SearchSelect";
import { searchCompanies } from "@/services/companies";
import { Company } from "@/lib/schemas/company";

interface CompanySelectProps {
  value?: string;
  onChange: (value: string) => void;
  onCreateRequested?: (query: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CompanySelect({
  value,
  onChange,
  onCreateRequested,
  disabled = false,
  className
}: CompanySelectProps) {
  const [duplicateHint, setDuplicateHint] = useState<string | null>(null);

  const handleSearch = async (query: string): Promise<SearchSelectOption[]> => {
    try {
      const companies = await searchCompanies(query);

      // Check for exact matches (case-insensitive) for duplicate detection
      if (query.trim()) {
        const exactMatches = companies.filter(c =>
          c.name.toLowerCase() === query.toLowerCase()
        );

        if (exactMatches.length > 0 && onCreateRequested) {
          setDuplicateHint(`Existing: ${exactMatches[0].name}`);
        } else {
          setDuplicateHint(null);
        }
      } else {
        setDuplicateHint(null);
      }

      return companies.map(company => ({
        id: company.id,
        label: company.name,
        subtitle: company.website ? `(${company.website})` : undefined
      }));
    } catch (error) {
      console.error("Failed to search companies:", error);
      return [];
    }
  };

  const handleCreate = (query: string) => {
    if (onCreateRequested) {
      onCreateRequested(query);
      setDuplicateHint(null);
    }
  };

  return (
    <div className="space-y-2">
      <SearchSelect
        value={value}
        onChange={onChange}
        onSearch={handleSearch}
        placeholder="Search company..."
        emptyMessage="No company found"
        onCreateRequested={handleCreate}
        disabled={disabled}
        className={className}
      />
      {duplicateHint && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          {duplicateHint}
        </div>
      )}
    </div>
  );
}
