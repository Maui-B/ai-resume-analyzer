import type { Route } from './+types/dashboard.reports';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listApplications, ApplicationFilters } from '~/lib/services/applications';
import { getJob } from '~/lib/services/jobs';

// ── types ───────────────────────────────────────────────────────────────
interface JobReportData {
  jobId: string;
  title: string;
  totalApps: number;
  hiredCount: number;
  avgTimeToHireDays: number | null;
  scoreDistribution: Record<string, number>;
  statusBreakdown: Record<ApplicationStatus, number>;
}

type ReportTab = 'overview' | 'perJob';

// ── helpers ─────────────────────────────────────────────────────────────
const SCORE_BUCKETS = ['0–30', '31–50', '51–70', '71–85', '86–100'];

function scoreBucket(score: number): string {
  if (score <= 30) return '0–30';
  if (score <= 50) return '31–50';
  if (score <= 70) return '51–70';
  if (score <= 85) return '71–85';
  return '86–100';
}

function scoreColor(bucket: string): string {
  const colors: Record<string, string> = {
    '0–30': 'bg-red-400',
    '31–50': 'bg-orange-400',
    '51–70': 'bg-yellow-400',
    '71–85': 'bg-green-400',
    '86–100': 'bg-green-600',
  };
  return colors[bucket] ?? 'bg-gray-400';
}

// ── component ───────────────────────────────────────────────────────────
export async function clientLoader(_args: Route.ClientLoaderArgs) {
  return null;
}

export default function DashboardReports() {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [jobs, setJobs] = useState<Record<string, JobRow>>({});
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const refresh = useCallback(async () => {
    const apps = await listApplications();
    setApplications(apps);

    const jobIds = Array.from(new Set(apps.map((a) => a.job_id)));
    const jobMap: Record<string, JobRow> = {};
    await Promise.all(
      jobIds.map(async (id) => {
        try {
          const j = await getJob(id);
          if (j) jobMap[id] = j;
        } catch { /* ignore */ }
      }),
    );
    setJobs(jobMap);
    if (jobIds.length === 1) setSelectedJobId(jobIds[0]);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // ── computed report data ──────────────────────────────────────────
  const overviewData = useMemo(() => {
    const apps = applications;
    const hiredApps = apps.filter((a) => a.status === 'hired');

    // time-to-hire
    let totalDays = 0;
    let hiredCount = 0;
    hiredApps.forEach((a) => {
      const created = new Date(a.created_at).getTime();
      // Use updated_at as approximation for when hired was set
      const hiredAt = new Date(a.updated_at).getTime();
      totalDays += (hiredAt - created) / (1000 * 60 * 60 * 24);
      hiredCount++;
    });
    const avgTimeToHire = hiredCount > 0 ? Math.round(totalDays / hiredCount) : null;

    // overall score distribution
    const allScores = apps.filter((a) => a.match_score != null);
    const scoreDist: Record<string, number> = {};
    SCORE_BUCKETS.forEach((b) => { scoreDist[b] = 0; });
    allScores.forEach((a) => {
      const b = scoreBucket(a.match_score!);
      scoreDist[b]++;
    });

    // overall status breakdown
    const statusBreakdown: Record<ApplicationStatus, number> = {
      submitted: 0, reviewed: 0, shortlisted: 0,
      interviewing: 0, rejected: 0, hired: 0,
    };
    apps.forEach((a) => { statusBreakdown[a.status]++; });

    // hire rate
    const hireRate = apps.length > 0 ? Math.round((hiredCount / apps.length) * 100) : 0;

    return { avgTimeToHire, scoreDist, statusBreakdown, hireRate, totalApps: apps.length, hiredCount };
  }, [applications]);

  const perJobData = useMemo(() => {
    const openJobs = Object.entries(jobs).filter(([, j]) => j.status === 'open' || j.status === 'paused');
    if (!selectedJobId && openJobs.length > 0) setSelectedJobId(openJobs[0][0]);

    const results: JobReportData[] = openJobs.map(([jobId, job]) => {
      const jobApps = applications.filter((a) => a.job_id === jobId);
      const hiredApps = jobApps.filter((a) => a.status === 'hired');

      let totalDays = 0;
      hiredApps.forEach((a) => {
        const created = new Date(a.created_at).getTime();
        const hiredAt = new Date(a.updated_at).getTime();
        totalDays += (hiredAt - created) / (1000 * 60 * 60 * 24);
      });
      const avgTTH = hiredApps.length > 0 ? Math.round(totalDays / hiredApps.length) : null;

      const scoreDist: Record<string, number> = {};
      SCORE_BUCKETS.forEach((b) => { scoreDist[b] = 0; });
      jobApps.filter((a) => a.match_score != null).forEach((a) => {
        scoreDist[scoreBucket(a.match_score!)]++;
      });

      const statusBreakdown: Record<ApplicationStatus, number> = {
        submitted: 0, reviewed: 0, shortlisted: 0,
        interviewing: 0, rejected: 0, hired: 0,
      };
      jobApps.forEach((a) => { statusBreakdown[a.status]++; });

      return {
        jobId, title: job.title, totalApps: jobApps.length,
        hiredCount: hiredApps.length, avgTimeToHireDays: avgTTH,
        scoreDistribution: scoreDist, statusBreakdown,
      };
    });

    return results;
  }, [jobs, applications, selectedJobId]);

  const currentJobReport = perJobData.find((r) => r.jobId === selectedJobId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="!text-3xl">Reports</h1>

      {/* ── Tab navigation ─────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-dark-200 hover:bg-gray-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('perJob')}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${
            activeTab === 'perJob'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-dark-200 hover:bg-gray-200'
          }`}
        >
          Per Job
        </button>
      </div>

      {/* ── Overview tab ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile label="Total Applications" value={overviewData.totalApps} />
            <KpiTile label="Hired" value={overviewData.hiredCount} />
            <KpiTile
              label="Avg Time to Hire"
              value={overviewData.avgTimeToHire != null ? `${overviewData.avgTimeToHire} days` : 'N/A'}
            />
            <KpiTile label="Hire Rate" value={`${overviewData.hireRate}%`} />
          </div>

          {/* Score distribution bar */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="!text-lg font-semibold mb-4">Score Distribution (All Jobs)</h2>
            <div className="flex items-end gap-3 h-40">
              {SCORE_BUCKETS.map((bucket) => {
                const maxVal = Math.max(...Object.values(overviewData.scoreDist), 1);
                const count = overviewData.scoreDist[bucket] ?? 0;
                const height = Math.max((count / maxVal) * 100, 4);
                return (
                  <div key={bucket} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-[10px] font-medium">{count}</span>
                    <div
                      className={`w-full rounded-t-md ${scoreColor(bucket)} transition-all`}
                      style={{ height: `${height}%`, minHeight: 8 }}
                    />
                    <span className="text-[9px] text-dark-200 mt-1">{bucket}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Status funnel */}
          <section className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="!text-lg font-semibold mb-4">Application Funnel</h2>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(overviewData.statusBreakdown) as ApplicationStatus[]).map((status) => {
                const pct = overviewData.totalApps > 0
                  ? Math.round(((overviewData.statusBreakdown[status] as number) / overviewData.totalApps) * 100)
                  : 0;
                return (
                  <div key={status} className="flex-1 min-w-[100px] bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{overviewData.statusBreakdown[status]}</p>
                    <p className="text-xs text-dark-200 capitalize">{status}</p>
                    <p className="text-[10px] text-dark-300">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ── Per-Job tab ────────────────────────────────────────────── */}
      {activeTab === 'perJob' && (
        <div className="flex flex-col gap-6">
          {/* Job selector */}
          {perJobData.length > 0 ? (
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 bg-white"
            >
              {perJobData.map((r) => (
                <option key={r.jobId} value={r.jobId}>
                  {r.title} ({r.totalApps} applications)
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-dark-200">No open or paused jobs to report on.</p>
          )}

          {currentJobReport && (
            <>
              <h2 className="!text-xl font-semibold">{currentJobReport.title}</h2>

              {/* Job-level KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiTile label="Total Applications" value={currentJobReport.totalApps} />
                <KpiTile label="Hired" value={currentJobReport.hiredCount} />
                <KpiTile
                  label="Avg Time to Hire"
                  value={currentJobReport.avgTimeToHireDays != null
                    ? `${currentJobReport.avgTimeToHireDays} days`
                    : 'N/A'}
                />
              </div>

              {/* Job score distribution */}
              <section className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="!text-base font-semibold mb-3">Score Distribution</h3>
                <div className="flex items-end gap-2 h-32">
                  {SCORE_BUCKETS.map((bucket) => {
                    const maxVal = Math.max(...Object.values(currentJobReport.scoreDistribution), 1);
                    const count = currentJobReport.scoreDistribution[bucket] ?? 0;
                    const height = Math.max((count / maxVal) * 100, 4);
                    return (
                      <div key={bucket} className="flex flex-col items-center flex-1 gap-1">
                        <span className="text-[10px]">{count}</span>
                        <div
                          className={`w-full rounded-t-md ${scoreColor(bucket)}`}
                          style={{ height: `${height}%`, minHeight: 8 }}
                        />
                        <span className="text-[9px] text-dark-200">{bucket}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Job status breakdown */}
              <section className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="!text-base font-semibold mb-3">Status Breakdown</h3>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(currentJobReport.statusBreakdown) as ApplicationStatus[]).map((status) => {
                    const count = currentJobReport.statusBreakdown[status];
                    const pct = currentJobReport.totalApps > 0
                      ? Math.round((count / currentJobReport.totalApps) * 100)
                      : 0;
                    return (
                      <span
                        key={status}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-100"
                      >
                        <span className="capitalize">{status}</span>
                        <span className="font-bold">{count}</span>
                        <span className="text-dark-200">({pct}%)</span>
                      </span>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <span className="text-sm text-dark-200">{label}</span>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
