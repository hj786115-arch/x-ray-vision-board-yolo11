/**
 * React Query mutation hook for image analysis.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyzeApi } from "@/lib/api";
import type { ScanResult } from "@/lib/types";

interface AnalyzeParams {
  file: File;
  scanType: string;
  sessionLabel?: string;
  notes?: string;
  boneArea?: string;
}

export function useAnalyze() {
  const qc = useQueryClient();

  return useMutation<ScanResult, Error, AnalyzeParams>({
    mutationFn: ({ file, scanType, sessionLabel, notes, boneArea }) =>
      analyzeApi.submit(file, scanType, sessionLabel, notes, boneArea),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scans"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
