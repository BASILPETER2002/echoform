import { useEffect, useState, type ChangeEvent } from "react";
import axios from "axios";
import { Brain, Cpu, AlertTriangle, Zap, Send, Activity, Clock, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea"; 
import { HypothesisChart } from "../components/charts/HypothesisChart";
import { type Hypothesis, type EntropyResponse } from "../types";

const API_URL = "http://localhost:8000";

type ExtendedHypothesis = Hypothesis & {
  signals?: Array<any>;
  confidence_score?: number;
  volatility?: number; // Added volatility field
};

export default function Dashboard() {
    const [hypotheses, setHypotheses] = useState<ExtendedHypothesis[]>([]);
    const [entry, setEntry] = useState("");
    const [entropy, setEntropy] = useState<EntropyResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [inferenceLogs, setInferenceLogs] = useState<string[]>([]);
    const [showEntropy, setShowEntropy] = useState(true);
    const [clarifyingQuery, setClarifyingQuery] = useState<string | null>(null);
    

    // NEW: Track context for the next submission
    const [entryContext, setEntryContext] = useState<"normal" | "clarification">("normal");

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [dashboardRes, entropyRes, logsRes] = await Promise.all([
                axios.get(`${API_URL}/dashboard`),
                axios.get(`${API_URL}/entropy-check`),
                axios.get(`${API_URL}/inference-logs?limit=5`).catch(() => ({ data: { logs: [] } }))
            ]);
            
            const hypothesesData = dashboardRes.data.hypotheses?.map((h: any) => ({
                ...h,
                signals: h.signals || []
            })) || [];
            
            setHypotheses(hypothesesData);
            setEntropy(entropyRes.data);
            setInferenceLogs(logsRes.data.logs || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!entry.trim()) return;

        setLoading(true);
        try {
            // UPDATED: Sending content with context tag
            await axios.post(`${API_URL}/entry`, { 
                content: entry,
                context: entryContext 
            });
            
            // Reset states after successful injection
            setEntry("");
            setEntryContext("normal");
            setClarifyingQuery(null);
            
            await fetchData();
        } catch (error) {
            console.error("Failed to submit entry", error);
        } finally {
            setLoading(false);
        }
    };

    const totalSignals = hypotheses.reduce((acc, h) => acc + (h.signals?.length || 0), 0);
    
    const avgConfidence = hypotheses.length > 0 
        ? (hypotheses.reduce((acc, h) => acc + (h.confidence_score || 0), 0) / hypotheses.length).toFixed(2)
        : "0.00";
    const handleExport = () => {
  if (!hypotheses.length) return;

  const rows = hypotheses.map((h) => {
    const stability =
      h.volatility === undefined
        ? "Unknown"
        : h.volatility < 0.05
        ? "Stable"
        : h.volatility < 0.15
        ? "Unstable"
        : "Chaotic";

    return {
      Label: h.label,
      Confidence: h.confidence_score.toFixed(3),
      Volatility: h.volatility?.toFixed(3) ?? "0.000",
      Stability: stability,
    };
  });

  const header = Object.keys(rows[0]).join(",");
  const csv = [
    header,
    ...rows.map((row) => Object.values(row).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `echoform_export_${new Date()
    .toISOString()
    .slice(0, 19)}.csv`;

  link.click();
  URL.revokeObjectURL(url);
};

    // Calculate average volatility
    const avgVolatility = hypotheses.length > 0
        ? hypotheses.reduce((a, h) => a + (h.volatility || 0), 0) / hypotheses.length
        : 0;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
            <div className="fixed inset-0 pointer-events-none opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:80px_80px]" />
            </div>

            <div className="relative z-10 p-6 max-w-7xl mx-auto">
                {/* Global Volatility Warning */}
                {avgVolatility > 0.15 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300"
                    >
                        High behavioral volatility detected. Predictions may be unreliable.
                    </motion.div>
                )}

                <header className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <Brain className="w-7 h-7 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-950 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    Echoform <span className="text-blue-400 text-xl align-super">v2.5</span>
                                </h1>
                                <p className="text-gray-400 text-sm font-mono tracking-wider">
                                    Probabilistic Identity Engine
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <div className="hidden md:flex items-center space-x-3 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800 backdrop-blur-sm">
                                <Cpu className="w-4 h-4 text-green-400" />
                                <div>
                                    <div className="text-xs text-gray-400">Inference Engine</div>
                                    <div className="text-sm font-mono text-green-400">ACTIVE</div>
                                </div>
                            </div>
                            <Button variant="outline" onClick={handleExport}>
                                    Export Data
                                    </Button>

                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Active Hypotheses", value: hypotheses.length, icon: Target, color: "text-blue-400" },
                            { label: "Total Signals", value: totalSignals, icon: Activity, color: "text-green-400" },
                            { label: "Avg Confidence", value: avgConfidence, icon: Brain, color: "text-purple-400" },
                            { label: "Update Frequency", value: "5s", icon: Clock, color: "text-amber-400" }
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="bg-gray-900/30 border-gray-800 backdrop-blur-sm">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</div>
                                                <div className="text-2xl font-bold mt-1 text-gray-100">  {stat.value} </div>
                                            </div>
                                            <stat.icon className={`w-6 h-6 ${stat.color} opacity-80`} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </header>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <AnimatePresence>
                            {entropy && entropy.status === "uncertainty" && showEntropy && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-900/10 to-amber-900/5 p-5"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
                                    <div className="relative z-10">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-amber-300">Entropy Detected</h3>
                                                <p className="text-sm text-gray-400">High uncertainty in identity model</p>
                                            </div>
                                        </div>
                                        <p className="text-gray-300 leading-relaxed">{entropy.message}</p>
                                        <div className="mt-4 flex space-x-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-amber-500/30 text-amber-400"
                                                onClick={() => {
                                                    // UPDATED: Auto-inject query into input and tag context
                                                    const question = entropy?.message || null;
                                                    setClarifyingQuery(question);
                                                    setEntry(question || "");
                                                    setEntryContext("clarification");
                                                    setShowEntropy(false);
                                                }}
                                            >
                                                Generate Query
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-gray-400"
                                                onClick={() => setShowEntropy(false)}
                                            >
                                                Dismiss
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Card className="border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-xl">
                            <CardHeader className="border-b border-gray-800 pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg font-semibold flex items-center">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse" />
                                        Identity Model Hypothesis Space
                                    </CardTitle>
                                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                                        <Zap className="w-4 h-4" />
                                        <span>Real-time Inference</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="h-[400px]">
                                    <HypothesisChart data={hypotheses} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Signal Injection */}
                        <Card className="border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                                        <Send className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-semibold">Signal Injection</div>
                                        <div className="text-sm text-gray-400">
                                            {entryContext === "clarification" ? "Clarifying entropy..." : "Enter behavioral data"}
                                        </div>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {clarifyingQuery && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="border border-blue-400/40 bg-blue-950/60 rounded-lg p-4"
                                        >
                                            <div className="text-sm font-semibold text-blue-300 mb-1">
                                            Clarifying Question
                                            </div>
                                            <div className="text-sm text-gray-100 leading-relaxed">
                                            {clarifyingQuery}
                                            </div>
                                        </motion.div>
                                        )}

                                    <div className="relative">
                                        <Textarea
                                            placeholder="Describe behavior or state..."
                                            value={entry}
                                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEntry(e.target.value)}
                                            className={`min-h-[80px] transition-colors duration-500 ${
                                                entryContext === "clarification" ? "border-blue-500/50 bg-blue-500/5" : ""
                                            }`}
                                            maxLength={500}
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                                            {entry.length}/500
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading || !entry.trim()}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                                    >
                                        {loading ? (
                                            <div className="flex items-center">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                                                Processing Inference...
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center">
                                                <Zap className="w-4 h-4 mr-2" />
                                                {entryContext === "clarification" ? "Resolve & Update Model" : "Inject & Update Model"}
                                            </div>
                                        )}
                                    </Button>
                                    {entryContext === "clarification" && (
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setEntryContext("normal");
                                                setEntry("");
                                            }}
                                            className="w-full text-center text-xs text-gray-500 hover:text-gray-300"
                                        >
                                            Cancel Clarification
                                        </button>
                                    )}
                                </form>
                            </CardContent>
                        </Card>

                        {/* Inference Logs */}
                        <Card className="border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center">
                                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3" />
                                    Recent Inference Logs
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {inferenceLogs.length > 0 ? (
                                        inferenceLogs.map((log, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="text-sm p-3 bg-gray-900/30 rounded-lg border border-gray-800"
                                            >
                                                <div className="font-mono text-xs text-gray-400">{log}</div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-gray-500">
                                            <div className="w-8 h-8 mx-auto mb-2 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
                                            <div>Awaiting inference data...</div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* System Status */}
                        <Card className="border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-xl">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-400">Engine Status</div>
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                                            <span className="text-green-400 font-medium">Optimal</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-xs text-gray-500 uppercase tracking-wider">Module Health</div>
                                        <div className="space-y-1">
                                            {[
                                                { name: "Signal Extractor", status: "healthy", value: 98 },
                                                { name: "Hypothesis Engine", status: "healthy", value: 95 },
                                                { name: "Entropy Detector", status: "healthy", value: 92 },
                                                { name: "Memory Bank", status: "healthy", value: 96 }
                                            ].map((module, i) => (
                                                <div key={module.name} className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-300">{module.name}</div>
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${module.value}%` }}
                                                                transition={{ delay: i * 0.1 }}
                                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-400">{module.value}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <footer className="mt-8 pt-6 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4 mb-4 md:mb-0">
                            <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                <span>Live Data Stream</span>
                            </div>
                            <div className="w-px h-4 bg-gray-800" />
                            <div className="font-mono">Model ID: EF-{Date.now().toString(36).toUpperCase()}</div>
                        </div>
                        <div>
                            Temporal Decay: Exponential • Learning Rate: 0.1 • Confidence Threshold: 0.15
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}