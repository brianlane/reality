"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type SectionItem = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  isActive: boolean;
  deletedAt: string | null;
  questionCount: number;
};

export default function AdminQuestionnaireSectionsTable() {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const loadSections = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const res = await fetch(
          `/api/admin/questionnaire/sections?page=${page}`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load sections.");
          return;
        }
        setSections(json.sections ?? []);
        setPages(json.pagination?.pages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load sections.");
        }
      }
    };

    loadSections();

    return () => controller.abort();
  }, [page]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Sections</h2>
        <Link
          href="/admin/questionnaire/sections/new"
          className="text-xs font-semibold text-copper hover:underline"
        >
          New Section
        </Link>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <Table className="mt-4">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-400">
              <th className="py-2 text-left">Title</th>
              <th className="py-2 text-left">Order</th>
              <th className="py-2 text-left">Questions</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.id} className="border-b text-sm text-navy-soft">
                <td className="py-2">{section.title}</td>
                <td className="py-2">{section.order}</td>
                <td className="py-2">{section.questionCount}</td>
                <td className="py-2">
                  {section.isActive ? "Active" : "Inactive"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/questionnaire/sections/${section.id}`}
                    className="text-xs font-medium text-copper hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="mt-4 flex items-center justify-between text-sm text-navy-soft">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
            disabled={page >= pages}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
