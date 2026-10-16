'use client';

import { useEffect, useState } from 'react';
import { formatDurationMinutes } from '@/app-utils/services/helpers';

interface OverallProgressBarProps {
  tasks: any[];
}

export default function OverallProgressBar({
  tasks,
}: OverallProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const total = tasks.reduce((sum, task) => sum + Math.max(0, Number(task.durationMinutes) || 0), 0);
      const allDone = tasks.length > 0 && tasks.every((task) => task.status === 'DONE');
      if (!total) {
        const done = tasks.filter((task) => task.status === 'DONE').length;
        setProgress(tasks.length ? Math.round((done / tasks.length) * 100) : 0);
        return;
      }
      const completedMs = tasks.reduce((sum, task) => {
        const durationMs = Math.max(0, Number(task.durationMinutes) || 0) * 60000;
        if (task.status === 'DONE') return sum + durationMs;
        if (task.status !== 'IN_PROGRESS' || !task.startedAt) return sum;
        const startedAt = new Date(task.startedAt).getTime();
        if (!Number.isFinite(startedAt)) return sum;
        return sum + Math.max(0, Math.min(durationMs, Date.now() - startedAt));
      }, 0);
      setProgress(allDone ? 100 : Math.min(100, Math.max(0, Math.round(completedMs / (total * 60000) * 100))));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">
            Overall Progress
          </p>

          <p className="text-[11px] text-muted-foreground">
            {tasks.reduce((sum, task) => sum + Math.max(0, Number(task.durationMinutes) || 0), 0) > 0
              ? `Planned time: ${formatDurationMinutes(tasks.reduce((sum, task) => sum + Math.max(0, Number(task.durationMinutes) || 0), 0))}`
              : 'Based on completed task count'}
          </p>
        </div>

        <span className="text-sm font-semibold text-primary">
          {progress}%
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}