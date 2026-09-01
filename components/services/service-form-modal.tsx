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
                type: value,
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
              <SelectItem value="REPAIR">
                Repair
              </SelectItem>

              <SelectItem value="PMS">
                PMS
              </SelectItem>

              <SelectItem value="CHECKUP">
                Checkup
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

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
            <Label
              htmlFor="service-duration"
              className="text-sm font-medium text-foreground"
            >
              Duration (Mins)
            </Label>

            <div className="relative">
              <Clock
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
                id="service-duration"
                type="number"
                value={
                  form.durationMinutes
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    durationMinutes:
                      e.target.value,
                  })
                }
                placeholder="30"
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
        </div>
      </div>
    </DataModal>
  );
}