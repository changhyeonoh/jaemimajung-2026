
export interface AnalysisResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  stepHeight: string;
  obstacles: string[];
  vulnerabilityReport: string;
  recommendations: string[];
}

export interface Investigation {
  id: string;
  imageUrl: string;
  timestamp: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  weather?: string;
  investigator?: string;
  result: AnalysisResult | null;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  errorMessage?: string;
}
