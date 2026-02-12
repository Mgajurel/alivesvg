"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCcw, Rows3, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { UserNav } from "@/components/ui/UserNav";

type JobStatus = "pending" | "processing" | "completed" | "failed" | "canceled";
type JobType = "zip_ingest" | "animation_generate" | "export_bundle";

type JobRow = {
  id: string;
  icon_set_id: string | null;
  job_type: JobType;
  status: JobStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  metadata?: Record<string, unknown>;
  iconSet?: {
    id: string;
    name: string;
    status: string;
  } | null;
  itemStats?: {
    total: number;
    failed: number;
    completed: number;
  };
};

type PaginationState = {
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
  prevOffset: number | null;
};

type JobItemRow = {
  id: string;
  status: JobStatus;
  icon_id: string | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type JobDetailState = {
  loading: boolean;
  error: string | null;
  items: JobItemRow[];
  totals: {
    items: number;
    byStatus: Record<string, number>;
  };
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
    prevOffset: number | null;
    status: string | null;
  };
};

const STATUS_OPTIONS: Array<{ value: "all" | JobStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "canceled", label: "Canceled" },
];

const JOB_TYPE_OPTIONS: Array<{ value: "all" | JobType; label: string }> = [
  { value: "all", label: "All types" },
  { value: "zip_ingest", label: "ZIP Ingest" },
  { value: "animation_generate", label: "Animation Generate" },
  { value: "export_bundle", label: "Export Bundle" },
];

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function getStatusBadgeClass(status: JobStatus): string {
  if (status === "completed") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (status === "failed" || status === "canceled") return "border-rose-300 bg-rose-50 text-rose-700";
  if (status === "processing") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

function getJobTypeLabel(jobType: JobType): string {
  if (jobType === "zip_ingest") return "ZIP Ingest";
  if (jobType === "animation_generate") return "Animation Generate";
  return "Export Bundle";
}

export default function StudioJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | JobStatus>("all");
  const [jobTypeFilter, setJobTypeFilter] = useState<"all" | JobType>("all");
  const [pagination, setPagination] = useState<PaginationState>({
    limit: 20,
    offset: 0,
    hasMore: false,
    nextOffset: null,
    prevOffset: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingQueuedJob, setProcessingQueuedJob] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detailStatusFilter, setDetailStatusFilter] = useState<"failed" | "all">("failed");
  const [jobDetail, setJobDetail] = useState<JobDetailState | null>(null);
  const [jobDetailOffset, setJobDetailOffset] = useState(0);
  const [downloadingSetId, setDownloadingSetId] = useState<string | null>(null);
  const [setActionKey, setSetActionKey] = useState<string | null>(null);
  const [setActionMessage, setSetActionMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(pagination.limit));
    params.set("offset", String(pagination.offset));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (jobTypeFilter !== "all") params.set("jobType", jobTypeFilter);
    return params.toString();
  }, [jobTypeFilter, pagination.limit, pagination.offset, statusFilter]);

  const fetchJobs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/jobs?${queryString}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load jobs.");
      }
      setJobs((data?.jobs ?? []) as JobRow[]);
      if (data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          hasMore: Boolean(data.pagination.hasMore),
          nextOffset: data.pagination.nextOffset ?? null,
          prevOffset: data.pagination.prevOffset ?? null,
          offset: Number.isFinite(data.pagination.offset) ? data.pagination.offset : prev.offset,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load jobs.";
      setError(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void fetchJobs(true);
  }, [fetchJobs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchJobs(false);
    }, 12000);
    return () => window.clearInterval(interval);
  }, [fetchJobs]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [statusFilter, jobTypeFilter]);

  const fetchJobDetail = useCallback(async (jobId: string, offset = 0, status: "failed" | "all" = detailStatusFilter) => {
    setJobDetail((prev) => ({
      loading: true,
      error: null,
      items: prev?.items ?? [],
      totals: prev?.totals ?? { items: 0, byStatus: {} },
      pagination: prev?.pagination ?? {
        limit: 25,
        offset: 0,
        hasMore: false,
        nextOffset: null,
        prevOffset: null,
        status: status === "all" ? null : "failed",
      },
    }));

    const params = new URLSearchParams();
    params.set("limit", "25");
    params.set("offset", String(offset));
    if (status !== "all") {
      params.set("status", "failed");
    }

    try {
      const res = await fetch(`/api/studio/jobs/${jobId}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load job details.");
      }

      setJobDetail({
        loading: false,
        error: null,
        items: (data?.items ?? []) as JobItemRow[],
        totals: {
          items: data?.totals?.items ?? 0,
          byStatus: data?.totals?.byStatus ?? {},
        },
        pagination: {
          limit: data?.pagination?.limit ?? 25,
          offset: data?.pagination?.offset ?? 0,
          hasMore: Boolean(data?.pagination?.hasMore),
          nextOffset: data?.pagination?.nextOffset ?? null,
          prevOffset: data?.pagination?.prevOffset ?? null,
          status: data?.pagination?.status ?? null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load job details.";
      setJobDetail((prev) => ({
        loading: false,
        error: message,
        items: prev?.items ?? [],
        totals: prev?.totals ?? { items: 0, byStatus: {} },
        pagination: prev?.pagination ?? {
          limit: 25,
          offset: 0,
          hasMore: false,
          nextOffset: null,
          prevOffset: null,
          status: status === "all" ? null : "failed",
        },
      }));
    }
  }, [detailStatusFilter]);

  useEffect(() => {
    if (!selectedJobId) {
      setJobDetail(null);
      return;
    }
    void fetchJobDetail(selectedJobId, 0, detailStatusFilter);
    setJobDetailOffset(0);
  }, [detailStatusFilter, fetchJobDetail, selectedJobId]);

  const processPendingJob = useCallback(async () => {
    setProcessingQueuedJob(true);
    try {
      const res = await fetch("/api/studio/jobs/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to process pending jobs.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process pending jobs.";
      setError(message);
    } finally {
      setProcessingQueuedJob(false);
      void fetchJobs(true);
    }
  }, [fetchJobs]);

  const retryJob = useCallback(async (jobId: string) => {
    setError(null);
    try {
      const retryRes = await fetch(`/api/studio/jobs/${jobId}/retry`, {
        method: "POST",
      });
      const retryData = await retryRes.json().catch(() => null);
      if (!retryRes.ok) {
        throw new Error(retryData?.error || "Failed to retry job.");
      }

      const processRes = await fetch("/api/studio/jobs/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      });
      const processData = await processRes.json().catch(() => null);
      if (!processRes.ok && processRes.status !== 500) {
        throw new Error(processData?.error || "Failed to restart job processor.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to retry job.";
      setError(message);
    } finally {
      void fetchJobs(true);
      if (selectedJobId === jobId) {
        setJobDetail(null);
        setJobDetailOffset(0);
      }
    }
  }, [fetchJobs, selectedJobId]);

  const downloadExportBundle = useCallback(async (iconSetId: string, setName: string) => {
    setDownloadingSetId(iconSetId);
    setError(null);
    try {
      const res = await fetch(`/api/studio/icon-sets/${iconSetId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: "package" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to export icon set.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeName = setName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "icon-set";
      anchor.href = url;
      anchor.download = `${safeName}-package-export.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      void fetchJobs(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export icon set.";
      setError(message);
    } finally {
      setDownloadingSetId(null);
    }
  }, [fetchJobs]);

  const runSetAction = useCallback(async (params: {
    iconSetId: string;
    action: "accept" | "reject" | "regenerate" | "stylePack";
  }) => {
    const actionKey = `${params.iconSetId}:${params.action}`;
    setSetActionKey(actionKey);
    setError(null);
    setSetActionMessage(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {};
      if (params.action === "accept") {
        endpoint = `/api/studio/icon-sets/${params.iconSetId}/bulk-evaluate`;
        body = { outcome: "accepted", benchmarkKey: "studio-feedback-v1" };
      } else if (params.action === "reject") {
        endpoint = `/api/studio/icon-sets/${params.iconSetId}/bulk-evaluate`;
        body = { outcome: "rejected", benchmarkKey: "studio-feedback-v1" };
      } else if (params.action === "stylePack") {
        endpoint = `/api/studio/icon-sets/${params.iconSetId}/bulk-apply-style`;
        body = {
          preset: "scale",
          triggerMode: "hover",
          loopMode: "once",
          source: "manual",
          rationale: "Bulk style pack: subtle hover scale.",
        };
      } else {
        endpoint = `/api/studio/icon-sets/${params.iconSetId}/bulk-regenerate`;
        body = { engine: "deterministic", limit: 200 };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Bulk action failed.");
      }

      if (params.action === "accept" || params.action === "reject") {
        setSetActionMessage(`${params.action === "accept" ? "Accepted" : "Rejected"} ${data?.updatedVersions ?? 0} active versions.`);
      } else if (params.action === "stylePack") {
        setSetActionMessage(`Applied style pack to ${data?.applied ?? 0} icons (${data?.failed ?? 0} failed).`);
      } else {
        setSetActionMessage(`Regenerated ${data?.succeeded ?? 0}/${data?.processed ?? 0} icons.`);
      }

      void fetchJobs(true);
      if (selectedJobId) {
        void fetchJobDetail(selectedJobId, 0, detailStatusFilter);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk action failed.";
      setError(message);
    } finally {
      setSetActionKey(null);
    }
  }, [detailStatusFilter, fetchJobDetail, fetchJobs, selectedJobId]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--alivesvg-bg)_0%,var(--alivesvg-bg-alt)_52%,var(--alivesvg-bg)_100%)] text-[var(--alivesvg-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(0,0,0,0.06),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(0,0,0,0.04),transparent_32%)]" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/studio">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Studio
              </Link>
            </Button>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase backdrop-blur">
              <Rows3 className="h-3.5 w-3.5 text-[var(--alivesvg-accent)]" />
              Batch Jobs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => void fetchJobs(true)}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => void processPendingJob()}
              disabled={processingQueuedJob}
            >
              <Rows3 className="mr-2 h-4 w-4" />
              {processingQueuedJob ? "Processing..." : "Process Pending"}
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/studio">
                <Upload className="mr-2 h-4 w-4" />
                New Upload
              </Link>
            </Button>
            <UserNav />
          </div>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 rounded-[24px] border border-slate-900/10 bg-white/80 p-4 shadow-[0_18px_44px_rgba(15,28,48,0.1)] backdrop-blur sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Status
              <select
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | JobStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Job Type
              <select
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
                value={jobTypeFilter}
                onChange={(event) => setJobTypeFilter(event.target.value as "all" | JobType)}
              >
                {JOB_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </motion.section>

        {setActionMessage && (
          <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
            {setActionMessage}
          </div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="overflow-hidden rounded-[24px] border border-slate-900/10 bg-white/85 shadow-[0_18px_44px_rgba(15,28,48,0.1)]"
        >
          {loading ? (
            <div className="px-5 py-8 text-sm text-slate-600">Loading jobs...</div>
          ) : error ? (
            <div className="px-5 py-8 text-sm text-rose-700">{error}</div>
          ) : jobs.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-600">No jobs found for current filters.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Set</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Updated</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{job.iconSet?.name ?? "Unnamed set"}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{job.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{getJobTypeLabel(job.job_type)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${getStatusBadgeClass(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p>Total: {job.itemStats?.total ?? 0}</p>
                        <p className="text-[12px] text-slate-500">Failed: {job.itemStats?.failed ?? 0}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatTimestamp(job.created_at)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatTimestamp(job.updated_at)}</td>
                      <td className="px-4 py-3">
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <Link href={`/api/studio/jobs/${job.id}`} target="_blank">Open JSON</Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 rounded-full"
                          onClick={() => {
                            setSelectedJobId(job.id);
                          }}
                        >
                          Inspect
                        </Button>
                        {job.iconSet?.id && job.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full"
                            onClick={() => void downloadExportBundle(job.iconSet?.id as string, job.iconSet?.name ?? "icon-set")}
                            disabled={downloadingSetId === job.iconSet?.id}
                          >
                            {downloadingSetId === job.iconSet?.id ? "Exporting..." : "Export ZIP"}
                          </Button>
                        )}
                        {job.iconSet?.id && job.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full"
                            onClick={() => void runSetAction({ iconSetId: job.iconSet?.id as string, action: "accept" })}
                            disabled={setActionKey === `${job.iconSet?.id}:accept`}
                          >
                            {setActionKey === `${job.iconSet?.id}:accept` ? "Applying..." : "Bulk Accept"}
                          </Button>
                        )}
                        {job.iconSet?.id && job.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full"
                            onClick={() => void runSetAction({ iconSetId: job.iconSet?.id as string, action: "reject" })}
                            disabled={setActionKey === `${job.iconSet?.id}:reject`}
                          >
                            {setActionKey === `${job.iconSet?.id}:reject` ? "Applying..." : "Bulk Reject"}
                          </Button>
                        )}
                        {job.iconSet?.id && job.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full"
                            onClick={() => void runSetAction({ iconSetId: job.iconSet?.id as string, action: "stylePack" })}
                            disabled={setActionKey === `${job.iconSet?.id}:stylePack`}
                          >
                            {setActionKey === `${job.iconSet?.id}:stylePack` ? "Applying..." : "Style Pack"}
                          </Button>
                        )}
                        {job.iconSet?.id && job.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full"
                            onClick={() => void runSetAction({ iconSetId: job.iconSet?.id as string, action: "regenerate" })}
                            disabled={setActionKey === `${job.iconSet?.id}:regenerate`}
                          >
                            {setActionKey === `${job.iconSet?.id}:regenerate` ? "Running..." : "Regenerate"}
                          </Button>
                        )}
                        {(job.status === "failed" || job.status === "canceled") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full"
                            onClick={() => void retryJob(job.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={pagination.prevOffset === null}
            onClick={() => {
              if (pagination.prevOffset === null) return;
              setPagination((prev) => ({ ...prev, offset: pagination.prevOffset ?? 0 }));
            }}
          >
            Previous
          </Button>
          <p className="text-xs text-slate-500">
            Offset: {pagination.offset} · Page size: {pagination.limit}
          </p>
          <Button
            variant="outline"
            className="rounded-full"
            disabled={!pagination.hasMore || pagination.nextOffset === null}
            onClick={() => {
              if (pagination.nextOffset === null) return;
              setPagination((prev) => ({ ...prev, offset: pagination.nextOffset ?? prev.offset }));
            }}
          >
            Next
          </Button>
        </div>

        {selectedJobId && (
          <section className="mt-6 rounded-[24px] border border-slate-900/10 bg-white/85 p-4 shadow-[0_16px_36px_rgba(15,28,48,0.1)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Job Inspection</p>
                <p className="font-mono text-xs text-slate-600">{selectedJobId}</p>
              </div>
              <div className="inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetailStatusFilter("failed")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    detailStatusFilter === "failed"
                      ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  Failed only
                </button>
                <button
                  type="button"
                  onClick={() => setDetailStatusFilter("all")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    detailStatusFilter === "all"
                      ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  All items
                </button>
              </div>
            </div>

            {jobDetail?.loading ? (
              <p className="text-sm text-slate-600">Loading item details...</p>
            ) : jobDetail?.error ? (
              <p className="text-sm text-rose-700">{jobDetail.error}</p>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500">
                  Total filtered items: {jobDetail?.totals.items ?? 0} · Failed: {jobDetail?.totals.byStatus.failed ?? 0}
                </p>
                <div className="max-h-[340px] overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50/80">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">File</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(jobDetail?.items ?? []).map((item) => {
                        const filePath = typeof item.payload?.file_path === "string" ? item.payload.file_path : "n/a";
                        const reason = typeof item.payload?.reason === "string"
                          ? item.payload.reason
                          : item.error_message ?? "—";
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${getStatusBadgeClass(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-700">{filePath}</td>
                            <td className="px-3 py-2 text-xs text-slate-700">{reason}</td>
                          </tr>
                        );
                      })}
                      {(jobDetail?.items ?? []).length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-sm text-slate-600">
                            No items for this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={!jobDetail?.pagination.prevOffset && jobDetail?.pagination.prevOffset !== 0}
                    onClick={() => {
                      if (!selectedJobId) return;
                      const nextOffset = jobDetail?.pagination.prevOffset;
                      if (nextOffset === null || nextOffset === undefined) return;
                      setJobDetailOffset(nextOffset);
                      void fetchJobDetail(selectedJobId, nextOffset, detailStatusFilter);
                    }}
                  >
                    Previous
                  </Button>
                  <p className="text-xs text-slate-500">Offset: {jobDetailOffset}</p>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={!jobDetail?.pagination.hasMore || jobDetail?.pagination.nextOffset === null}
                    onClick={() => {
                      if (!selectedJobId) return;
                      const nextOffset = jobDetail?.pagination.nextOffset;
                      if (nextOffset === null || nextOffset === undefined) return;
                      setJobDetailOffset(nextOffset);
                      void fetchJobDetail(selectedJobId, nextOffset, detailStatusFilter);
                    }}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
