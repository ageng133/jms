"use client";

import { useEffect, useState } from "react";
import { Box, HardDrive, Sparkles, Cpu } from "lucide-react";
import { getSystemStatus, type SystemStatus } from "@/lib/api";

const POLL_MS = 30_000;

const STORAGE_LABEL: Record<string, string> = {
  "box-cloud": "Box Cloud",
  "local-disk": "Local storage",
  minio: "MinIO (S3)",
};

function engineLabel(name: string): string {
  if (name === "pymupdf-embedded") return "Monolithic Audit Engine";
  if (name === "pymupdf-worker") return "PyMuPDF Worker";
  if (name.startsWith("gemini:")) return "Gemini fallback";
  return name;
}

const STATUS_STYLE: Record<string, { text: string; className: string }> = {
  online: { text: "Online", className: "text-[#34c759]" },
  configured: { text: "Configured", className: "text-[#0071e3]" },
  offline: { text: "Offline", className: "text-[#ff3b30]" },
};

function Row({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  const s = STATUS_STYLE[status] ?? { text: status, className: "text-[#86868b]" };
  return (
    <div className="flex items-center justify-between text-[#1d1d1f]">
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`font-medium ${s.className}`}>{s.text}</span>
    </div>
  );
}

/** Admin sidebar card showing the real storage driver and audit engine liveness. */
export function SystemStatusPanel() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = () => {
      getSystemStatus()
        .then((res) => {
          if (cancelled) return;
          setData(res);
          setError(false);
        })
        .catch(() => !cancelled && setError(true))
        .finally(() => {
          if (!cancelled) timer = setTimeout(load, POLL_MS);
        });
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="px-4 py-3 mx-3 my-2 rounded-2xl bg-black/[0.02] border border-black/[0.04] text-[11px] space-y-1.5">
      <div className="font-semibold text-[#86868b] uppercase tracking-wider text-[10px]">System Status</div>

      {error && <Row icon={<Cpu className="w-3 h-3 text-[#86868b]" />} label="Gateway" status="offline" />}
      {!error && !data && <div className="text-[#86868b]">Checking...</div>}

      {data && (
        <>
          <Row
            icon={
              data.storage === "box-cloud" ? (
                <Box className="w-3 h-3 text-[#0071e3]" />
              ) : (
                <HardDrive className="w-3 h-3 text-[#0071e3]" />
              )
            }
            label={STORAGE_LABEL[data.storage] ?? data.storage}
            status="online"
          />
          {data.engines.length === 0 && (
            <Row icon={<Cpu className="w-3 h-3 text-[#ff3b30]" />} label="Audit engine" status="offline" />
          )}
          {data.engines.map((e) => (
            <Row
              key={e.name}
              icon={
                e.name.startsWith("gemini:") ? (
                  <Sparkles className="w-3 h-3 text-[#af52de]" />
                ) : (
                  <Cpu className="w-3 h-3 text-[#34c759]" />
                )
              }
              label={engineLabel(e.name)}
              status={e.status}
            />
          ))}
          {data.status === "DEGRADED" && (
            <p className="text-[10px] text-[#ff3b30] leading-snug pt-0.5">
              No audit engine reachable. New audits will fail until the worker is started.
            </p>
          )}
        </>
      )}
    </div>
  );
}
