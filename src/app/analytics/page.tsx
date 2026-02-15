"use client";

import { useAnalytics } from "@/lib/hooks";
import { Card, Badge, Button, Input, Skeleton, EmptyState } from "@/components/ui";
import { BarChart3, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const platformKeys = ["linkedin", "youtube", "instagram", "email", "whatsapp", "twitter", "assessment"];

const mainMetric: Record<string, string> = {
  linkedin: "followers",
  youtube: "subscribers",
  instagram: "followers",
  email: "subscribers",
  whatsapp: "members",
  twitter: "followers",
  assessment: "completions",
};

export default function AnalyticsPage() {
  const { platforms, loading, addEntry } = useAnalytics();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntries, setNewEntries] = useState<Record<string, Record<string, string>>>({});

  const today = new Date().toISOString().split("T")[0];

  const getLatestValue = (platformKey: string): number | null => {
    const platform = platforms[platformKey];
    if (!platform?.entries?.length) return null;
    const latest = platform.entries[platform.entries.length - 1];
    const metric = mainMetric[platformKey];
    return (latest[metric] as number) ?? null;
  };

  const getTrend = (platformKey: string): "up" | "down" | "flat" => {
    const platform = platforms[platformKey];
    if (!platform?.entries?.length || platform.entries.length < 2) return "flat";
    const entries = platform.entries;
    const latest = entries[entries.length - 1];
    const prev = entries[entries.length - 2];
    const metric = mainMetric[platformKey];
    const latestVal = (latest[metric] as number) ?? 0;
    const prevVal = (prev[metric] as number) ?? 0;
    if (latestVal > prevVal) return "up";
    if (latestVal < prevVal) return "down";
    return "flat";
  };

  const trendIcon = {
    up: <TrendingUp size={16} className="text-success" />,
    down: <TrendingDown size={16} className="text-danger" />,
    flat: <Minus size={16} className="text-text-secondary" />,
  };

  const handleAddEntry = async (platformKey: string) => {
    const entry = newEntries[platformKey];
    if (!entry) return;
    const parsed: Record<string, unknown> = { date: today };
    Object.entries(entry).forEach(([key, val]) => {
      if (val) parsed[key] = isNaN(Number(val)) ? val : Number(val);
    });
    await addEntry(platformKey, parsed);
    setNewEntries((prev) => ({ ...prev, [platformKey]: {} }));
    toast.success(`${platforms[platformKey]?.name} data added`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const selectedData = selectedPlatform ? platforms[selectedPlatform] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl">Analytics</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> Log This Week
          </span>
        </Button>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-3 gap-4">
        {platformKeys.map((key) => {
          const platform = platforms[key];
          if (!platform) return null;
          const value = getLatestValue(key);
          const trend = getTrend(key);

          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${
                selectedPlatform === key ? "ring-1 ring-accent" : ""
              }`}
            >
              <button
                onClick={() => setSelectedPlatform(selectedPlatform === key ? null : key)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{platform.name}</h3>
                  {trendIcon[trend]}
                </div>
                <p className="font-mono text-2xl">
                  {value !== null ? value.toLocaleString() : "—"}
                </p>
                <p className="text-xs text-text-secondary capitalize">{mainMetric[key]}</p>
              </button>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      {selectedData && selectedData.entries.length > 0 && (
        <Card>
          <h3 className="font-heading text-base mb-4">{selectedData.name} — Historical</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={selectedData.entries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#44403C" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#A8A29E", fontSize: 12 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#A8A29E", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#292524",
                  border: "1px solid #44403C",
                  borderRadius: 8,
                  color: "#FAFAF9",
                }}
              />
              <Line
                type="monotone"
                dataKey={mainMetric[selectedPlatform!]}
                stroke="#D97706"
                strokeWidth={2}
                dot={{ fill: "#D97706", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Weekly Data Entry */}
      {showAddForm && (
        <Card>
          <h3 className="font-heading text-base mb-4">Log Weekly Numbers</h3>
          <div className="space-y-4">
            {platformKeys.map((key) => {
              const platform = platforms[key];
              if (!platform) return null;
              const metric = mainMetric[key];
              const entry = newEntries[key] || {};

              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-32">{platform.name}</span>
                  <Input
                    value={entry[metric] || ""}
                    onChange={(v) =>
                      setNewEntries((prev) => ({
                        ...prev,
                        [key]: { ...entry, [metric]: v },
                      }))
                    }
                    placeholder={metric}
                    type="number"
                    className="w-32"
                  />
                  <Input
                    value={entry.notes || ""}
                    onChange={(v) =>
                      setNewEntries((prev) => ({
                        ...prev,
                        [key]: { ...entry, notes: v },
                      }))
                    }
                    placeholder="Notes..."
                    className="flex-1"
                  />
                  <Button size="sm" variant="secondary" onClick={() => handleAddEntry(key)}>
                    Save
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
