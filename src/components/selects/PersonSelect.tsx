import { SearchSelect, SearchSelectOption } from "./SearchSelect";
import { searchPeople } from "@/services/people";
import { useEffect, useState } from "react";

interface PersonSelectProps {
  companyId?: string;
  value?: string;
  onChange: (value: string) => void;
  onCreateRequested?: (query: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PersonSelect({
  companyId,
  value,
  onChange,
  onCreateRequested,
  disabled = false,
  className
}: PersonSelectProps) {
  const [allContacts, setAllContacts] = useState<SearchSelectOption[]>([]);

  // Load all contacts for the selected company when companyId changes
  useEffect(() => {
    const loadContacts = async () => {
      if (companyId && companyId !== "all") {
        try {
          // Load all contacts for this company (empty query to get all)
          const people = await searchPeople("", companyId);
          const contacts = people.map(person => ({
            id: person.id,
            label: `${person.firstName} ${person.lastName}`,
            subtitle: (person as any).title || undefined
          }));
          setAllContacts(contacts);
        } catch (error) {
          console.error("Failed to load contacts:", error);
          setAllContacts([]);
        }
      } else {
        setAllContacts([]);
      }
    };

    loadContacts();
  }, [companyId]);

  const handleSearch = async (query: string): Promise<SearchSelectOption[]> => {
    if (!companyId || companyId === "all") {
      return [];
    }

    if (!query.trim()) {
      // Return all contacts for the company when no search query
      return allContacts;
    }

    try {
      const people = await searchPeople(query, companyId);

      return people.map(person => ({
        id: person.id,
        label: `${person.firstName} ${person.lastName}`,
        subtitle: (person as any).title || undefined
      }));
    } catch (error) {
      console.error("Failed to search people:", error);
      return [];
    }
  };

  const handleCreate = (query: string) => {
    if (onCreateRequested) {
      onCreateRequested(query);
    }
  };

  return (
    <SearchSelect
      value={value}
      onChange={onChange}
      onSearch={handleSearch}
      placeholder="Search contact..."
      emptyMessage="No contact found"
      onCreateRequested={handleCreate}
      disabled={disabled}
      className={className}
    />
  );
}
