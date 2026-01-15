export interface Signal {
    id: string;
    timestamp: string;
    axis: string;
    direction: number;
    weight: number;
    decay_factor: number;
}

export interface Hypothesis {
  id: number
  label: string
  confidence_score: number
  volatility?: number
}


export interface EntropyResponse {
    status: "stable" | "uncertainty";
    message: string;
}
