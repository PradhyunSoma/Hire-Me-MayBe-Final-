import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import LandingPage from "@/pages/LandingPage";
import NewScreeningPage from "@/pages/NewScreeningPage";
import ProcessingPage from "@/pages/ProcessingPage";
import ResultsPage from "@/pages/ResultsPage";
import CandidateDetailPage from "@/pages/CandidateDetailPage";
import ComparePage from "@/pages/ComparePage";
import InsightsPage from "@/pages/InsightsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/screening/new" element={<NewScreeningPage />} />
            <Route path="/screening/:id/processing" element={<ProcessingPage />} />
            <Route path="/screening/:id/results" element={<ResultsPage />} />
            <Route path="/screening/:id/candidate/:candidateId" element={<CandidateDetailPage />} />
            <Route path="/screening/:id/compare" element={<ComparePage />} />
            <Route path="/screening/:id/insights" element={<InsightsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
