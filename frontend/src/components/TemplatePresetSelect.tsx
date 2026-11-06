"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { listTemplatePresets } from "@/lib/api";
import type { TemplatePreset, TemplateSpecs } from "@/types/jms";

export function describeSpecs(s: TemplateSpecs): string {
  const cols = s.column_count === 2 ? "2 columns" : "1 column";
  return `${s.page_format} · ${cols} · margins T${s.margin_top_mm} / B${s.margin_bottom_mm} / L${s.margin_left_mm} / R${s.margin_right_mm} mm`;
}

/** Shared preset loader so the select and the Template Vault use the same data. */
export function useTemplatePresets() {
  const [presets, setPresets] = useState<TemplatePreset[]>([]);
  const [defaultId, setDefaultId] = useState<string>("ieee");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listTemplatePresets()
      .then((res) => {
        if (cancelled) return;
        setPresets(res.presets);
        setDefaultId(res.default_id || "ieee");
      })
      .catch((err: any) => !cancelled && setError(err.message || "Failed to load template presets"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { presets, defaultId, loading, error };
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  /** When a template PDF is uploaded it takes precedence over the preset. */
  hasUploadedTemplate?: boolean;
}

export function TemplatePresetSelect({ value, onChange, hasUploadedTemplate }: Props) {
  const { presets, defaultId, loading, error } = useTemplatePresets();

  // Initialise to the server default once presets arrive.
  useEffect(() => {
    if (!value && defaultId) onChange(defaultId);
  }, [value, defaultId, onChange]);

  const selected = presets.find((p) => p.id === value);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading journal presets...
      </div>
    );
  }
  if (error) {
    return <div className="text-[11px] text-error">{error}</div>;
  }

  if (hasUploadedTemplate) {
    return (
      <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-ping" />
            Ekstraksi AST XML Aktif
          </span>
          <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/60">
            Preset Dropdown Dinonaktifkan
          </span>
        </div>
        <p className="text-[10px] text-on-surface-variant leading-relaxed">
          Sistem akan mengekstrak pohon sintaksis abstrak (AST XML) langsung dari berkas template yang Anda unggah untuk menentukan layout, tipografi, dan daftar seksi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="template-preset" className="text-[11px] font-semibold text-on-surface">
        Pilih Starter Preset (Hanya jika tidak ada file template):
      </label>
      <select
        id="template-preset"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-xs text-on-surface"
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-[10px] text-on-surface-variant leading-relaxed">{describeSpecs(selected.specs)}</p>
      )}
    </div>
  );
}
