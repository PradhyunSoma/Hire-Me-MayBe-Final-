import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Briefcase, Loader2, Play, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDropzone, FileList } from "@/components/upload/FileDropzone";
import { screeningsApi } from "@/api/screenings";
import type { UploadedFile } from "@/types";
import { generateId } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";

const MAX_RESUMES = 18;
const MIN_RESUMES = 1;

export default function NewScreeningPage() {
  const navigate = useNavigate();
  const [jdFile, setJdFile] = useState<UploadedFile | null>(null);
  const [resumes, setResumes] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const addErrors = (msgs: string[]) => setErrors((e) => Array.from(new Set([...e, ...msgs])));
  const clearErrors = () => setErrors([]);

  const handleJD = async (files: File[]) => {
    clearErrors();
    const f = files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      addErrors(["Job description must be a PDF."]);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      addErrors(["JD is too large (max 10MB)."]);
      return;
    }
    const row: UploadedFile = {
      id: generateId("jd"),
      name: f.name,
      size: f.size,
      uploaded: false,
      uploading: true,
      progress: 0,
    };
    setJdFile(row);

    const existing = await screeningsApi.create();
    sessionStorage.setItem("hmm_screening_id", existing.screeningId);

    const timer = setInterval(() => {
      setJdFile((r) => r && { ...r, progress: Math.min(95, r.progress + 22) });
    }, 150);
    try {
      await screeningsApi.uploadJD(existing.screeningId, f);
    } finally {
      clearInterval(timer);
    }
    setJdFile((r) => r && { ...r, progress: 100, uploading: false, uploaded: true });
  };

  const handleResumes = async (files: File[]) => {
    clearErrors();
    const capacity = MAX_RESUMES - resumes.length;
    if (files.length > capacity) {
      addErrors([`Only ${capacity} more resume${capacity === 1 ? "" : "s"} allowed (max ${MAX_RESUMES}).`]);
    }
    const accepted = files.slice(0, capacity);

    const invalid = accepted.filter((f) => !f.name.toLowerCase().endsWith(".pdf"));
    if (invalid.length) addErrors([`${invalid.length} file(s) are not PDFs and were skipped.`]);

    const rows: UploadedFile[] = accepted
      .filter((f) => f.name.toLowerCase().endsWith(".pdf"))
      .map((f) => ({
        id: generateId("res"),
        name: f.name,
        size: f.size,
        uploaded: false,
        uploading: false,
        progress: 0,
      }));
    if (!rows.length) return;
    setResumes((r) => [...r, ...rows]);

    const sid = sessionStorage.getItem("hmm_screening_id") || (await screeningsApi.create()).screeningId;
    sessionStorage.setItem("hmm_screening_id", sid);

    for (let i = 0; i < rows.length; i++) {
      const f = accepted[i];
      const row = rows[i];
      setResumes((all) => all.map((x) => (x.id === row.id ? { ...x, uploading: true } : x)));
      const timer = setInterval(() => {
        setResumes((all) =>
          all.map((x) => (x.id === row.id ? { ...x, progress: Math.min(95, x.progress + 20) } : x))
        );
      }, 140);
      try {
        await screeningsApi.uploadResume(sid, f, row.id);
      } catch (e: any) {
        setResumes((all) =>
          all.map((x) =>
            x.id === row.id
              ? { ...x, uploading: false, error: e?.message || "Upload failed", progress: 0 }
              : x
          )
        );
      } finally {
        clearInterval(timer);
      }
      setResumes((all) => all.map((x) => (x.id === row.id ? { ...x, uploading: false, uploaded: true, progress: 100 } : x)));
    }
  };

  const removeResume = (id: string) => setResumes((r) => r.filter((x) => x.id !== id));
  const removeJD = () => {
    setJdFile(null);
  };

  const canStart = jdFile?.uploaded && resumes.some((r) => r.uploaded) && resumes.length >= MIN_RESUMES;

  const startMutation = useMutation({
    mutationFn: async () => {
      const sid = sessionStorage.getItem("hmm_screening_id");
      if (!sid) throw new Error("No screening created yet.");
      await screeningsApi.run(sid);
      return sid;
    },
    onSuccess: (sid) => navigate(`/screening/${sid}/processing`),
    onError: (e: any) => addErrors([e?.message || "Failed to start screening."]),
  });

  const jdReady = useMemo(() => !!jdFile?.uploaded, [jdFile]);
  const resumeCount = resumes.filter((r) => r.uploaded).length;
  const resumesReady = resumeCount >= MIN_RESUMES;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="muted" className="uppercase tracking-wide">Step 1 of 3</Badge>
          <span>Upload documents · JD + Resumes</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">New Screening</h1>
        <p className="text-muted-foreground max-w-2xl">
          Upload a job description and up to 18 resumes. We'll extract requirements, run BM25 + MiniLM matching,
          and produce a fully explainable shortlist.
        </p>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload issues</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm space-y-0.5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={jdFile?.uploaded ? "ring-2 ring-success/40" : ""}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Job Description</CardTitle>
                  <CardDescription>Exactly 1 PDF. Used to extract requirement atoms.</CardDescription>
                </div>
              </div>
              <Badge variant={jdReady ? "success" : "muted"}>
                {jdReady ? "✓ Uploaded" : "Required"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!jdFile && (
              <FileDropzone
                onFiles={handleJD}
                label="Drop your job description PDF"
                description="or click to browse"
                icon={<Briefcase className="h-7 w-7" />}
              />
            )}
            {jdFile && (
              <div className="space-y-3">
                <FileList
                  files={[jdFile]}
                  onRemove={removeJD}
                />
                <Button size="sm" variant="ghost" onClick={removeJD}>
                  Replace JD
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={resumesReady ? "ring-2 ring-success/40" : ""}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Candidate Resumes</CardTitle>
                  <CardDescription>1–18 PDFs. Each is chunked and scored.</CardDescription>
                </div>
              </div>
              <Badge variant={resumesReady ? "success" : "muted"}>
                {resumeCount} / {MAX_RESUMES}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileDropzone
              onFiles={handleResumes}
              multiple
              maxFiles={Math.max(1, MAX_RESUMES - resumeCount)}
              label="Drop resume PDFs here"
              description="or click to browse · up to 18 files"
              icon={<UserPlus className="h-7 w-7" />}
            />
            {resumes.length > 0 && (
              <>
                <Separator />
                <FileList
                  files={resumes}
                  onRemove={removeResume}
                  maxFiles={MAX_RESUMES}
                  currentCount={resumes.length}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-6 z-30">
        <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="font-semibold">Ready to process?</div>
            <div className="text-sm text-muted-foreground">
              {jdFile?.uploaded
                ? resumesReady
                  ? `${resumeCount} resume${resumeCount === 1 ? "" : "s"} loaded · Ready to run BM25 + MiniLM matching.`
                  : `Add at least ${MIN_RESUMES} resume to start.`
                : "Upload a job description first."}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" disabled className="hidden sm:inline-flex">
              Save Draft
            </Button>
            <Button
              size="lg"
              variant="gradient"
              disabled={!canStart || startMutation.isPending}
              onClick={() => startMutation.mutate()}
              className="w-full sm:w-auto"
            >
              {startMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Screening
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
