'use client';
import { useEffect, useState } from "react";

interface OverallProgressBarProps {
  tasks: any[];
}

export default function OverallProgressBar({ tasks }: OverallProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const totalDuration = tasks.reduce((sum, t) => sum + (t.durationMinutes || 0), 0);
      if (totalDuration === 0) {
        setProgress(0);
        return;
      }

      const completedMs = tasks.reduce((sum, t) => {
        if (t.status === 'DONE') return sum + (t.durationMinutes || 0) * 60 * 1000;
        if (t.status === 'IN_PROGRESS' && t.startedAt) {
          const elapsed = Math.min(
            (t.durationMinutes || 0) * 60 * 1000,
            Date.now() - new Date(t.startedAt).getTime()
          );
          return sum + elapsed;
        }
        return sum;
      }, 0);

      const totalMs = totalDuration * 60 * 1000;
      setProgress(Math.min(100, Math.round((completedMs / totalMs) * 100)));
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span>Overall Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="h-3 rounded-full bg-primary transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}