// components/service-tracking/QueueList.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, ArrowRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomerCard from '@/components/customers/customer-card';
import VehicleCard from '@/components/customers/vehicle-card';
import ServiceCard from '@/components/services/service-card';

interface QueueListProps {
  queue: any[];
  loading: boolean;
  onMoveUp: (appointmentId: string, currentPos: number) => void;
  onMoveDown: (appointmentId: string, currentPos: number, maxPos: number) => void;
  onStartInspection: (appointmentId: string) => void;
}

export default function QueueList({ queue, loading, onMoveUp, onMoveDown, onStartInspection }: QueueListProps) {
  if (loading) {
    return <div className="text-center py-8">Loading queue...</div>;
  }

  if (queue.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No confirmed appointments for today.</div>;
  }

  return (
    <div className="space-y-4">
      {queue.map((item) => (
        <Card key={item.queueId} className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="text-4xl font-black text-primary w-12 text-center">
              {item.queueNumber}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{item.customer?.fullname || 'Customer'}</span>
                <Badge variant="outline">{item.vehicle?.plateNumber || 'N/A'}</Badge>
                <span className="text-sm text-muted-foreground">{item.appointmentTime}</span>
              </div>
              <div className="flex gap-2">
                {item.services?.map((sid: string) => (
                  <ServiceCard key={sid} serviceId={sid} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMoveUp(item.appointmentId, item.queueNumber)}
              disabled={item.queueNumber <= 1}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMoveDown(item.appointmentId, item.queueNumber, queue.length)}
              disabled={item.queueNumber >= queue.length}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white h-8 px-3 text-xs"
              onClick={() => onStartInspection(item.appointmentId)}
            >
              <Play className="h-3 w-3 mr-1" /> Inspect
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}