"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ModelPreset = "flash" | "pro25" | "pro3";
type ThinkingLevel = "low" | "high" | undefined;

interface SmokeResult {
  ok: true;
  modelUsed: string;
  text: string;
  elapsedMs: number;
}

interface SmokeError {
  ok: false;
  error: {
    message: string;
    status?: number;
  };
}

type SmokeResponse = SmokeResult | SmokeError;

const MODEL_OPTIONS: { value: ModelPreset; label: string }[] = [
  { value: "flash", label: "2.5 Flash (gemini-2.5-flash)" },
  { value: "pro25", label: "2.5 Pro (gemini-2.5-pro)" },
  { value: "pro3", label: "3 Pro Preview (gemini-3-pro-preview)" },
];

const THINKING_OPTIONS: { value: ThinkingLevel; label: string }[] = [
  { value: undefined, label: "Default" },
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
];

export default function GeminiSmokePage() {
  const [model, setModel] = useState<ModelPreset>("flash");
  const [prompt, setPrompt] = useState("Say hello in Japanese.");
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(undefined);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmokeResponse | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/dev/gemini/smoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          thinkingLevel,
        }),
      });

      const data: SmokeResponse = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        ok: false,
        error: {
          message: err instanceof Error ? err.message : "Network error",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gemini Smoke Test</CardTitle>
            <CardDescription>
              Test Gemini API connection with different models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <div className="flex flex-wrap gap-2">
                {MODEL_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={model === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setModel(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Thinking Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Thinking Level</label>
              <div className="flex gap-2">
                {THINKING_OPTIONS.map((opt) => (
                  <Button
                    key={opt.label}
                    variant={thinkingLevel === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setThinkingLevel(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prompt</label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt..."
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !prompt.trim()}
              className="w-full"
            >
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Result Display */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className={result.ok ? "text-green-600" : "text-red-600"}>
                {result.ok ? "Success" : "Error"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.ok ? (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Model Used:</div>
                    <div className="font-mono">{result.modelUsed}</div>
                    <div className="text-muted-foreground">Elapsed:</div>
                    <div className="font-mono">{result.elapsedMs}ms</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Response:</div>
                    <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                      {result.text}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Status: </span>
                    <span className="font-mono">{result.error.status ?? "N/A"}</span>
                  </div>
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {result.error.message}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
