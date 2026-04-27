"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ParamComboboxOption {
  value: string;
  label: string;
}

interface ParamComboboxProps {
  options: ParamComboboxOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Valore di un'opzione da fissare in cima al dropdown. */
  pinnedValue?: string;
  /** Label custom per l'opzione pinnata (es. "Tutti" per i jolly). */
  pinnedLabel?: string;
}

const ParamCombobox: React.FC<ParamComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder,
  pinnedValue,
  pinnedLabel,
}) => {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  // Pinned in cima, resto ordinato alfabeticamente per label (locale IT).
  const orderedOptions = useMemo(() => {
    const decorated = options.map((o) => ({
      value: o.value,
      label:
        pinnedValue !== undefined && o.value === pinnedValue && pinnedLabel
          ? pinnedLabel
          : (o.label ?? o.value),
    }));
    const pinned: typeof decorated = [];
    const rest: typeof decorated = [];
    for (const o of decorated) {
      if (pinnedValue !== undefined && o.value === pinnedValue) pinned.push(o);
      else rest.push(o);
    }
    rest.sort((a, b) =>
      a.label.localeCompare(b.label, "it", { sensitivity: "base" })
    );
    return [...pinned, ...rest];
  }, [options, pinnedValue, pinnedLabel]);

  const selectedLabel = useMemo(() => {
    if (!value) return undefined;
    const found = orderedOptions.find((o) => o.value === value);
    return found?.label ?? value;
  }, [value, orderedOptions]);

  const [searchValue, setSearchValue] = useState("");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedLabel ?? placeholder ?? tc("select")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[12rem] max-w-[calc(100vw-2rem)] p-0"
        align="start"
      >
        <Command
          // Permette il match anche su `value` oltre che su `label`.
          filter={(itemValue, search) => {
            const haystack = itemValue.toLowerCase();
            const needle = search.toLowerCase().trim();
            return haystack.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={tc("search")}
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>{tc("noItemsFound")}</CommandEmpty>
            <CommandGroup>
              {orderedOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  // value passato a Command è quello su cui filtra:
                  // include sia label che value così la search trova entrambi.
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ParamCombobox;
