"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type QuestionItem = {
  id: string;
  sectionId: string;
  sectionTitle: string;
  prompt: string;
  type: string;
  order: number;
  isRequired: boolean;
  isActive: boolean;
};

type AdminQuestionnaireQuestionsTableProps = {
  sectionId?: string;
  hideSection?: boolean;
};

export default function AdminQuestionnaireQuestionsTable({
  sectionId,
  hideSection = false,
}: AdminQuestionnaireQuestionsTableProps) {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const loadQuestions = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const params = new URLSearchParams({ page: String(page) });
        if (sectionId) {
          params.set("sectionId", sectionId);
        }

        const res = await fetch(
          `/api/admin/questionnaire/questions?${params.toString()}`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load questions.");
          return;
        }
        setQuestions(json.questions ?? []);
        setPages(json.pagination?.pages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load questions.");
        }
      }
    };

    loadQuestions();

    return () => controller.abort();
  }, [page, sectionId]);

  const newQuestionLink = sectionId
    ? `/admin/questionnaire/questions/new?sectionId=${sectionId}`
    : "/admin/questionnaire/questions/new";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Questions</h2>
        <Link
          href={newQuestionLink}
          className="text-xs font-semibold text-copper hover:underline"
        >
          New Question
        </Link>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table className="min-w-full">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                {!hideSection ? (
                  <th className="py-2 pr-6 text-left">Section</th>
                ) : null}
                <th className="py-2 px-6 text-left">Prompt</th>
                <th className="py-2 px-6 text-left">Type</th>
                <th className="py-2 px-6 text-left">Order</th>
                <th className="py-2 px-6 text-left">Required</th>
                <th className="py-2 px-6 text-left">Status</th>
                <th className="py-2 pl-6 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr
                  key={question.id}
                  className="border-b text-sm text-navy-soft"
                >
                  {!hideSection ? (
                    <td className="py-2 pr-6 whitespace-nowrap">
                      {question.sectionTitle}
                    </td>
                  ) : null}
                  <td className="py-2 px-6 whitespace-nowrap">
                    {question.prompt}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {question.type}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {question.order}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {question.isRequired ? "Yes" : "No"}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {question.isActive ? "Active" : "Inactive"}
                  </td>
                  <td className="py-2 pl-6 whitespace-nowrap">
                    <Link
                      href={`/admin/questionnaire/questions/${question.id}`}
                      className="text-xs font-medium text-copper hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
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
