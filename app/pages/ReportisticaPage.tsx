"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CATEGORIES_URL = "/n8n/webhook-test/get-categories";

export default function ReportisticaPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    setCategoriesError(null);

    fetch(CATEGORIES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { categories: string[] }[]) => {
        if (!cancelled) {
          const cats = data?.[0]?.categories ?? [];
          setCategories(cats);
        }
      })
      .catch((err) => {
        if (!cancelled) setCategoriesError(err.message);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="flex flex-col w-full gap-4 items-start justify-start"
      tabIndex={0}
    >
      <p className="text-primary text-xl font-heading font-bold">
        Reportistica
      </p>

      {/* Riga superiore: 2 Select + Form dinamica */}
      <div className="flex flex-row gap-4 w-full">
        <Card className="w-[220px] shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filtro 1</CardTitle>
          </CardHeader>
          <CardContent>
            <Select>
              <SelectTrigger disabled={categoriesLoading}>
                <SelectValue
                  placeholder={
                    categoriesLoading
                      ? "Caricamento..."
                      : categoriesError
                        ? "Errore caricamento"
                        : "Seleziona..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="w-[220px] shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filtro 2</CardTitle>
          </CardHeader>
          <CardContent>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder">Placeholder</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Form dinamica</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary text-sm">
              Form dinamica &mdash; in attesa di configurazione JSON
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Riga inferiore: Tabella grande */}
      <Card className="min-h-[70vh] w-[80%]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tabella dati</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-secondary">&mdash;</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-secondary text-sm">
                  Tabella &mdash; in attesa di configurazione JSON
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
