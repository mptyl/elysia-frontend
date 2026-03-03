"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";

const CATEGORIES_URL = "/n8n/webhook/get-categories";
const REPORTS_URL = "/n8n/webhook/get-reports";
const FETCH_TIMEOUT_MS = 30_000;

export default function ReportisticaPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reports, setReports] = useState<Array<{ id: number; report_name: string; report_description: string }>>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [reportsFetchKey, setReportsFetchKey] = useState(0);

  const retryCategories = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  const retryReports = useCallback(() => {
    setReportsFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    setCategoriesLoading(true);
    setCategoriesError(null);

    fetch(CATEGORIES_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!text) throw new Error("Risposta vuota dal server");
        return JSON.parse(text) as { categories: string[] } | { categories: string[] }[];
      })
      .then((data) => {
        if (!cancelled) {
          const cats = Array.isArray(data)
            ? data?.[0]?.categories ?? []
            : data?.categories ?? [];
          setCategories(cats);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.name === "AbortError") {
            setCategoriesError("Timeout: il server non ha risposto entro 30 secondi");
          } else {
            setCategoriesError(err.message);
          }
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [fetchKey]);

  useEffect(() => {
    if (!selectedCategory) {
      setReports([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    setReportsLoading(true);
    setReportsError(null);

    const url = `${REPORTS_URL}?category=${encodeURIComponent(selectedCategory)}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!text) throw new Error("Risposta vuota dal server");
        return JSON.parse(text) as { reports: Array<{ id: number; report_name: string; report_description: string }> };
      })
      .then((data) => {
        if (!cancelled) {
          setReports(data?.reports ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.name === "AbortError") {
            setReportsError("Timeout: il server non ha risposto entro 30 secondi");
          } else {
            setReportsError(err.message);
          }
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!cancelled) setReportsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [selectedCategory, reportsFetchKey]);

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
            <CardTitle className="text-sm">Categoria Report</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Select disabled={categoriesLoading || !!categoriesError} onValueChange={setSelectedCategory}>
              <SelectTrigger>
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
            {categoriesError && (
              <div className="flex flex-col gap-1">
                <p className="text-destructive text-xs">{categoriesError}</p>
                <Button variant="outline" size="sm" onClick={retryCategories}>
                  Riprova
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="w-[220px] shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Nome Report</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Select disabled={!selectedCategory || reportsLoading || !!reportsError}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedCategory
                      ? "Seleziona categoria..."
                      : reportsLoading
                        ? "Caricamento..."
                        : reportsError
                          ? "Errore caricamento"
                          : "Seleziona..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={String(report.id)}>
                    {report.report_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reportsError && (
              <div className="flex flex-col gap-1">
                <p className="text-destructive text-xs">{reportsError}</p>
                <Button variant="outline" size="sm" onClick={retryReports}>
                  Riprova
                </Button>
              </div>
            )}
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
