import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

import { Card } from "../ui/card"
import type { Hypothesis } from "../../types"


interface Props {
  data: Hypothesis[]
}

export function HypothesisChart({ data }: Props) {
  const getStability = (volatility?: number) => {
    if (volatility === undefined) return { label: "Unknown", color: "#6B7280" }
    if (volatility < 0.05) return { label: "Stable", color: "#22C55E" }
    if (volatility < 0.15) return { label: "Unstable", color: "#FACC15" }
    return { label: "Chaotic", color: "#EF4444" }
  }

  return (
    <Card className="h-full w-full bg-gray-900/40 border-gray-800 p-4">
      <div className="h-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                borderColor: "#1F2937",
                color: "#E5E7EB",
              }}
              formatter={(value) =>
  typeof value === "number" ? value.toFixed(2) : value
              }
            />
            <Bar dataKey="confidence_score" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => {
                const stability = getStability(entry.volatility)
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={stability.color}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stability Labels */}
      <div className="mt-4 space-y-1">
        {data.map((h) => {
          const stability = getStability(h.volatility)
          return (
            <div
              key={h.id}
              className="flex justify-between text-xs text-gray-300"
            >
              <span>{h.label}</span>
              <span style={{ color: stability.color }}>
                {stability.label}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
