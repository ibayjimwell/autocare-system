'use client';

import React, {
  useEffect,
} from 'react';

import DataModal from '@/components/shared/data-modal';
import ErrorHandler from '@/components/shared/error-handler';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Textarea,
} from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Wrench,
  Tag,
  Clock,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  useServiceForm,
} from '@/hooks/services/useServiceForm';

import { SERVICE_TYPES, SERVICE_TYPE_LABELS, REPAIR_SUBCATEGORIES, splitDurationMinutes, combineDurationMinutes, formatDurationMinutes } from '@/app-utils/services/helpers';
interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService?: any | null;
  onSuccess: () => void;
}

export default function ServiceFormModal({
  open,
  onOpenChange,
  editingService,
  onSuccess,
}: ServiceFormModalProps) {
  const {
    form,
    setForm,
    saving,
    apiError,
    openCreate,
    openEdit,
    handleSave,
  } = useServiceForm(onSuccess);

  useEffect(() => {
    if (open) {
      if (editingService) {
        openEdit(editingService);
      } else {
        openCreate();
      }
    }
  }, [
    open,
    editingService,
  ]);

  const duration = splitDurationMinutes(form.durationMinutes);

  const updateDuration = (hours: unknown, minutes: unknown) => {
    setForm((previous) => ({
      ...previous,
      durationMinutes: String(combineDurationMinutes(hours, minutes)),
    }));
  };

  const onSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <DataModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        editingService
          ? 'Edit Service Details'
          : 'New Service Type'
      }
      onSubmit={onSubmit}
      isLoading={saving}
    >
      <div
        className="
          max-h-[70vh]
          space-y-5
          overflow-y-auto
          px-1 pb-2
        "
      >
        {apiError && (
          <ErrorHandler
            type={apiError.type}
            title={apiError.title}
            message={apiError.message}
          />
        )}

        {/* Intro */}
        <div
          className="
            rounded-lg
            border border-border
            bg-muted/30
            p-3.5
          "
        >
          <div className="flex items-start gap-3">
            <div
              className="
                flex h-9 w-9
                shrink-0
                items-center
                justify-center
                rounded-md
                bg-primary/10
                text-primary
              "
            >
              <Wrench className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">
                Service configuration
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Define the service name, category,
                pricing, and estimated completion
                time.
              </p>
            </div>
          </div>
        </div>

        {/* Service name */}
        <div className="space-y-2">
          <Label
            htmlFor="service-name"
            className="text-sm font-medium text-foreground"
          >
            Service Name
          </Label>

          <Input
            id="service-name"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            placeholder="e.g. Executive Oil Change"
            className="
              h-11 rounded-md
              border-input
              bg-background
              text-base
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-1
              md:h-9 md:text-sm
            "
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <Label
            className="text-sm font-medium text-foreground"
          >
            Service Type
          </Label>

          <Select
            value={form.type}
            onValueChange={(
              value
            ) =>
              setForm({
                ...form,
                type: value as 'PMS' | 'REPAIR' | 'DIAGNOSTIC',
                subcategory: value === 'REPAIR' ? form.subcategory : '',
              })
            }
          >
            <SelectTrigger
              className="
                h-11 rounded-md
                bg-background
                text-base
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
                md:h-9 md:text-sm
              "
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent className="rounded-lg">
              {SERVICE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {SERVICE_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Repair subcategory */}
        {form.type === 'REPAIR' && (
          <div className="space-y-2">
            <Label>Repair Subcategory</Label>
            <Select value={form.subcategory || undefined} onValueChange={(value) => setForm({ ...form, subcategory: value })}>
              <SelectTrigger className="h-11 rounded-md bg-background md:h-9"><SelectValue placeholder="Choose repair subcategory" /></SelectTrigger>
              <SelectContent>
                {REPAIR_SUBCATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Required when the service category is REPAIR.</p>
          </div>
        )}

        {/* Labor inclusion */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/20 p-4">
          <input type="checkbox" checked={form.isLaborInclude} onChange={(event) => setForm({ ...form, isLaborInclude: event.target.checked })}
            className="h-5 w-5 accent-primary" />
          <span className="flex-1">
            <span className="block text-sm font-semibold">Base price includes labor</span>
            <span className="mt-1 block text-xs text-muted-foreground">If enabled, labor is already included in the service's base price.</span>
          </span>
        </label>

        {/* Description */}
        <div className="space-y-2">
          <Label
            htmlFor="service-description"
            className="text-sm font-medium text-foreground"
          >
            Description
          </Label>

          <Textarea
            id="service-description"
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
            placeholder="Detail the inclusions of this service..."
            className="
              min-h-[110px]
              resize-none
              rounded-md
              border-input
              bg-background
              text-base
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-1
              md:text-sm
            "
          />
        </div>

        {/* Price + duration */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="service-price"
              className="text-sm font-medium text-foreground"
            >
              Base Price (₱)
            </Label>

            <div className="relative">
              <Tag
                className="
                  pointer-events-none
                  absolute left-3
                  top-1/2
                  h-4 w-4
                  -translate-y-1/2
                  text-muted-foreground
                "
              />

              <Input
                id="service-price"
                type="number"
                step="0.01"
                value={
                  form.basePrice
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    basePrice:
                      e.target.value,
                  })
                }
                placeholder="0.00"
                className="
                  h-11 rounded-md
                  bg-background
                  pl-10
                  text-base
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-1
                  md:h-9 md:text-sm
                "
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              <Clock className="mr-1 inline h-4 w-4 text-muted-foreground" />
              Estimated Duration
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="service-hours" className="mb-1 block text-xs text-muted-foreground">Hours</Label>
                <Input
                  id="service-hours" type="number" inputMode="numeric" min="0" step="1"
                  value={form.durationMinutes === '' ? '' : duration.hours}
                  onChange={(e) => updateDuration(e.target.value, duration.minutes)}
                  placeholder="0" className="h-11 bg-background md:h-9"
                />
              </div>
              <div>
                <Label htmlFor="service-minutes" className="mb-1 block text-xs text-muted-foreground">Minutes (0–59)</Label>
                <Input
                  id="service-minutes" type="number" inputMode="numeric" min="0" max="59" step="1"
                  value={form.durationMinutes === '' ? '' : duration.minutes}
                  onChange={(e) => updateDuration(duration.hours, e.target.value)}
                  placeholder="30" className="h-11 bg-background md:h-9"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {form.durationMinutes && Number(form.durationMinutes) > 0
                ? `Estimated completion: ${formatDurationMinutes(form.durationMinutes)}`
                : 'Enter at least 1 minute; e.g. 2 hours and 30 minutes.'}
            </p>
          </div>
        </div>
      </div>
    </DataModal>
  );
}