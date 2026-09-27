'use client';

import React, {
  useState,
} from 'react';

import {
  Button,
} from '@/components/ui/button';

import {
  Input,
} from '@/components/ui/input';

import {
  Textarea,
} from '@/components/ui/textarea';

import {
  Label,
} from '@/components/ui/label';

import {
  Checkbox,
} from '@/components/ui/checkbox';

import {
  Separator,
} from '@/components/ui/separator';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  AlertCircle,
  FileText,
  History,
  Layers,
  Package,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import {
  findingsApi,
} from '@/lib/service-tracking/findings';

import {
  toast,
} from 'sonner';

import InventoryPicker from '@/components/inventory/inventory-picker';

import DefaultFindingPickerModal from './default-finding-picker-modal';

import HistoryFindingPickerModal from './history-finding-picker-modal';

interface FindingPart {
  id: string;
  inventoryItemId?: string;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

interface Finding {
  id: string;
  description: string;
  parts: FindingPart[];
}

interface FindingPickerPart {
  inventoryItemId?: string;
  partName: string;
  quantity: number;
  priceAtTime: number;
  isPms: boolean;
}

interface FindingPickerData {
  description: string;
  parts: FindingPickerPart[];
}

interface FindingModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  onSaved: () => void;
}

export default function FindingModal({
  open,
  onClose,
  appointmentId,
  onSaved,
}: FindingModalProps) {
  const [
    findings,
    setFindings,
  ] = useState<Finding[]>(
    [
      {
        id: Date.now().toString(),
        description: '',
        parts: [],
      },
    ],
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    defaultPickerOpen,
    setDefaultPickerOpen,
  ] = useState(false);

  const [
    historyPickerOpen,
    setHistoryPickerOpen,
  ] = useState(false);

  const [
    isAddingFromPicker,
    setIsAddingFromPicker,
  ] = useState(false);

  const addFinding = () => {
    setFindings([
      ...findings,
      {
        id: Date.now().toString(),
        description: '',
        parts: [],
      },
    ]);
  };

  const removeFinding = (
    id: string,
  ) => {
    if (
      findings.length ===
      1
    ) {
      return;
    }

    setFindings(
      findings.filter(
        (
          f,
        ) =>
          f.id !==
          id,
      ),
    );
  };

  const updateFindingDescription = (
    id: string,
    description: string,
  ) => {
    setFindings(
      findings.map(
        (
          f,
        ) =>
          f.id ===
          id
            ? {
                ...f,
                description,
              }
            : f,
      ),
    );
  };

  const addPart = (
    findingId: string,
  ) => {
    setFindings(
      findings.map(
        (
          f,
        ) => {
          if (
            f.id ===
            findingId
          ) {
            return {
              ...f,
              parts: [
                ...f.parts,
                {
                  id: Date.now().toString(),
                  inventoryItemId:
                    undefined,
                  partName: '',
                  quantity: 1,
                  priceAtTime: 0,
                  isPms: false,
                },
              ],
            };
          }

          return f;
        },
      ),
    );
  };

  const removePart = (
    findingId: string,
    partId: string,
  ) => {
    setFindings(
      findings.map(
        (
          f,
        ) => {
          if (
            f.id ===
            findingId
          ) {
            return {
              ...f,
              parts:
                f.parts.filter(
                  (
                    p,
                  ) =>
                    p.id !==
                    partId,
                ),
            };
          }

          return f;
        },
      ),
    );
  };

  const updatePart = (
    findingId: string,
    partId: string,
    field: keyof FindingPart,
    value: any,
  ) => {
    setFindings(
      findings.map(
        (
          f,
        ) => {
          if (
            f.id ===
            findingId
          ) {
            return {
              ...f,
              parts:
                f.parts.map(
                  (
                    p,
                  ) => {
                    if (
                      p.id ===
                      partId
                    ) {
                      const nextPart =
                        {
                          ...p,
                          [field]:
                            field ===
                            'isPms'
                              ? value
                              : field ===
                                  'quantity'
                                ? parseInt(
                                    value,
                                    10,
                                  ) || 0
                                : value,
                        } as FindingPart;

                      /*
                       * If staff manually edits the part name after
                       * selecting an inventory item, it is no longer
                       * a guaranteed inventory-linked part.
                       *
                       * Clear the inventory reference so the backend
                       * does not reserve the wrong inventory item.
                       */
                      if (
                        field ===
                        'partName'
                      ) {
                        nextPart.inventoryItemId =
                          undefined;
                      }

                      return nextPart;
                    }

                    return p;
                  },
                ),
            };
          }

          return f;
        },
      ),
    );
  };

  const handleInventorySelect = (
    findingId: string,
    partId: string,
    item: {
      id?: string;
      name: string;
      price: number;
      quantity: number;
      unit?: string;
      reorderLevel?: number;
      lowStock?: boolean;
      outOfStock?: boolean;
    },
  ) => {
    if (
      !item.id
    ) {
      toast.error(
        'The selected inventory item is missing its ID.',
      );

      return;
    }

    if (
      item.outOfStock ||
      Number(
        item.quantity,
      ) <=
        0
    ) {
      toast.error(
        `${item.name} is out of stock and cannot be added.`,
      );

      return;
    }

    setFindings(
      findings.map(
        (
          f,
        ) => {
          if (
            f.id ===
            findingId
          ) {
            return {
              ...f,
              parts:
                f.parts.map(
                  (
                    p,
                  ) => {
                    if (
                      p.id ===
                      partId
                    ) {
                      return {
                        ...p,
                        inventoryItemId:
                          item.id,
                        partName:
                          item.name,
                        priceAtTime:
                          item.price,
                        quantity:
                          Math.max(
                            1,
                            Math.min(
                              Number(
                                p.quantity,
                              ) ||
                                1,
                              Number(
                                item.quantity,
                              ) ||
                                1,
                            ),
                          ),
                      };
                    }

                    return p;
                  },
                ),
            };
          }

          return f;
        },
      ),
    );

    if (
      item.lowStock
    ) {
      toast.warning(
        `${item.name} is low on stock (${item.quantity} ${item.unit || 'unit'} remaining).`,
      );
    }
  };

  const handleAddFindingFromPicker = (
    findingData: FindingPickerData,
  ) => {
    const newFinding: Finding =
      {
        id: Date.now().toString(),
        description:
          findingData.description,
        parts:
          findingData.parts.map(
            (
              p,
              index,
            ) => ({
              id:
                `${Date.now()}-${index}`,
              inventoryItemId:
                p.inventoryItemId,
              partName:
                p.partName ||
                '',
              quantity:
                Math.max(
                  1,
                  Number(
                    p.quantity,
                  ) ||
                    1,
                ),
              priceAtTime:
                Number(
                  p.priceAtTime,
                ) ||
                0,
              isPms:
                Boolean(
                  p.isPms,
                ),
            }),
          ),
      };

    setFindings([
      ...findings,
      newFinding,
    ]);
  };

  const handleDefaultFindingSelect = (
    finding: any,
  ) => {
    handleAddFindingFromPicker(
      {
        description:
          finding.title,
        parts:
          Array.isArray(
            finding.parts,
          )
            ? finding.parts.map(
                (
                  p: any,
                  index: number,
                ) => ({
                  /*
                   * Preserve the inventory reference when a default
                   * finding contains one.
                   */
                  inventoryItemId:
                    p.inventoryItemId,
                  partName:
                    p.partName,
                  quantity:
                    p.quantity,
                  priceAtTime:
                    parseFloat(
                      p.priceAtTime,
                    ) ||
                    0,
                  isPms:
                    p.isPms,
                }),
              )
            : [],
      },
    );

    setDefaultPickerOpen(
      false,
    );
  };

  const handleHistoryFindingsSelect =
    async (
      selectedFindings: Array<{
        description: string;
        parts: FindingPickerPart[];
      }>,
    ) => {
      setIsAddingFromPicker(
        true,
      );

      try {
        for (
          const f of
            selectedFindings
        ) {
          handleAddFindingFromPicker(
            f,
          );
        }

        toast.success(
          `${selectedFindings.length} finding(s) added from history.`,
        );

        setHistoryPickerOpen(
          false,
        );
      } catch (err) {
        toast.error(
          'Error adding findings from history.',
        );
      } finally {
        setIsAddingFromPicker(
          false,
        );
      }
    };

  const handleSave = async () => {
    const invalid =
      findings.some(
        (
          f,
        ) =>
          !f.description.trim(),
      );

    if (
      invalid
    ) {
      toast.error(
        'Each finding must have a description.',
      );

      return;
    }

    const invalidPart = findings.some(
      (finding) =>
        finding.parts.some(
          (part) =>
            !part.partName.trim() || Number(part.quantity) <= 0,
        ),
    );

    if (
      invalidPart
    ) {
      toast.error(
        'Each part must have a valid name and quantity.',
      );

      return;
    }

    setSaving(
      true,
    );

    try {
      const payload = {
        appointmentId,
        findings:
          findings.map(
            (
              f,
            ) => ({
              description:
                f.description.trim(),

              parts:
                f.parts.map(
                  (
                    p,
                  ) => ({
                    /*
                     * IMPORTANT:
                     * Keep the inventory item ID when the part
                     * came from InventoryPicker.
                     *
                     * Without this property the server stores
                     * only partName, so keepAppointmentInventory()
                     * correctly sees no linked inventory rows and
                     * returns an empty allocations array.
                     */
                    ...(p.inventoryItemId
                      ? {
                          inventoryItemId:
                            p.inventoryItemId,
                        }
                      : {}),

                    partName:
                      p.partName.trim() ||
                      undefined,

                    quantity:
                      Math.max(
                        1,
                        Number(
                          p.quantity,
                        ) ||
                          1,
                      ),

                    priceAtTime:
                      Number(
                        p.priceAtTime,
                      ) ||
                      0,

                    isPms:
                      Boolean(
                        p.isPms,
                      ),
                  }),
                ),
            }),
          ),
      };

      const res =
        await findingsApi.create(
          payload,
        );

      if (
        res.error
      ) {
        toast.error(
          res.errorMessage ||
            'Failed to record findings.',
        );

        return;
      }

      toast.success(
        'Findings recorded.',
      );

      onSaved();
    } catch (err: any) {
      toast.error(
        err?.message ||
          'Error recording findings.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={
        onClose
      }
    >
      <DialogContent
        className="
          flex
          h-[94vh]
          w-[calc(100%-1rem)]
          max-w-3xl
          flex-col
          rounded-xl
          border
          border-border
          bg-card
          p-0
          shadow-xl
          sm:h-auto
          sm:max-h-[92vh]
        "
      >
        {/* =======================================================
         * HEADER
         * ===================================================== */}
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
                Record Findings
              </DialogTitle>

              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Add diagnostic observations and parts
                used during the inspection.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* =======================================================
         * CONTENT
         * ===================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-5 p-4 sm:p-5">
            {/* Picker toolbar */}
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Add from source
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDefaultPickerOpen(
                      true,
                    )
                  }
                  className="
                    h-11
                    justify-start
                    rounded-md
                    bg-background
                    md:h-9
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                >
                  <Layers className="mr-2 h-4 w-4 text-primary" />
                  <span>
                    Default Findings
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setHistoryPickerOpen(
                      true,
                    )
                  }
                  className="
                    h-11
                    justify-start
                    rounded-md
                    bg-background
                    md:h-9
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                >
                  <History className="mr-2 h-4 w-4 text-primary" />
                  <span>
                    History Findings
                  </span>
                </Button>
              </div>
            </div>

            {/* Finding cards */}
            <div className="space-y-4">
              {findings.map(
                (
                  finding,
                  idx,
                ) => (
                  <section
                    key={
                      finding.id
                    }
                    className="
                      overflow-hidden
                      rounded-lg
                      border
                      border-border
                      bg-background
                    "
                  >
                    {/* Finding header */}
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                          {idx + 1}
                        </span>

                        <div>
                          <p className="text-sm font-semibold">
                            Finding #
                            {idx +
                              1}
                          </p>

                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Diagnostic observation
                          </p>
                        </div>
                      </div>

                      {findings.length >
                        1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeFinding(
                              finding.id,
                            )
                          }
                          aria-label="Remove finding"
                          className="
                            h-10
                            w-10
                            rounded-md
                            text-muted-foreground
                            hover:bg-destructive/10
                            hover:text-destructive
                            md:h-8
                            md:w-8
                          "
                        >
                          <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-5 p-4">
                      {/* Description */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Description *
                        </Label>

                        <Textarea
                          value={
                            finding.description
                          }
                          onChange={(
                            e,
                          ) =>
                            updateFindingDescription(
                              finding.id,
                              e.target.value,
                            )
                          }
                          placeholder="Describe the issue discovered..."
                          className="
                            min-h-[100px]
                            resize-none
                            rounded-md
                            text-base
                            md:min-h-[80px]
                            md:text-sm
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-ring
                            focus-visible:ring-offset-2
                          "
                        />
                      </div>

                      {/* Parts */}
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Parts & Supplies
                            </Label>

                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Materials associated with this finding.
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addPart(
                                finding.id,
                              )
                            }
                            className="
                              h-10
                              w-full
                              rounded-md
                              sm:w-auto
                              md:h-9
                            "
                          >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add Part
                          </Button>
                        </div>

                        {finding.parts.length >
                        0 ? (
                          <div className="space-y-3">
                            {finding.parts.map(
                              (
                                part,
                              ) => (
                                <div
                                  key={
                                    part.id
                                  }
                                  className="rounded-lg border border-border bg-muted/20 p-3"
                                >
                                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_90px_120px_auto] md:items-end">
                                    {/* Part name */}
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Part Name
                                      </Label>

                                      <div className="flex gap-2">
                                        <Input
                                          value={
                                            part.partName
                                          }
                                          onChange={(
                                            e,
                                          ) =>
                                            updatePart(
                                              finding.id,
                                              part.id,
                                              'partName',
                                              e
                                                .target
                                                .value,
                                            )
                                          }
                                          placeholder="e.g., Oil Filter"
                                          className="
                                            h-11
                                            min-w-0
                                            flex-1
                                            rounded-md
                                            text-base
                                            md:h-9
                                            md:text-sm
                                          "
                                        />

                                        <InventoryPicker
                                          onSelect={(
                                            item,
                                          ) =>
                                            handleInventorySelect(
                                              finding.id,
                                              part.id,
                                              item,
                                            )
                                          }
                                          className="
                                            h-11
                                            shrink-0
                                            rounded-md
                                            px-3
                                            md:h-9
                                          "
                                        >
                                          <Package className="h-4 w-4" />
                                          <span className="ml-1 hidden text-xs md:inline">
                                            Pick
                                          </span>
                                        </InventoryPicker>
                                      </div>

                                      {part.inventoryItemId && (
                                        <div className="flex items-center gap-2">
                                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                            Inventory linked
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Quantity */}
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Qty
                                      </Label>

                                      <Input
                                        type="number"
                                        min="1"
                                        value={
                                          part.quantity
                                        }
                                        onChange={(
                                          e,
                                        ) =>
                                          updatePart(
                                            finding.id,
                                            part.id,
                                            'quantity',
                                            e
                                              .target
                                              .value,
                                          )
                                        }
                                        className="
                                          h-11
                                          rounded-md
                                          text-base
                                          md:h-9
                                          md:text-sm
                                        "
                                      />
                                    </div>

                                    {/* Price */}
                                    <div className="space-y-1.5">
                                      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Price
                                      </Label>

                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={
                                          part.priceAtTime
                                        }
                                        onChange={(
                                          e,
                                        ) =>
                                          updatePart(
                                            finding.id,
                                            part.id,
                                            'priceAtTime',
                                            parseFloat(
                                              e
                                                .target
                                                .value,
                                            ) || 0,
                                          )
                                        }
                                        disabled={
                                          part.isPms
                                        }
                                        className="
                                          h-11
                                          rounded-md
                                          text-base
                                          md:h-9
                                          md:text-sm
                                        "
                                      />
                                    </div>

                                    {/* PMS + delete */}
                                    <div className="flex min-h-11 items-center justify-between gap-3 md:min-h-9 md:justify-end">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={
                                            part.isPms
                                          }
                                          onCheckedChange={(
                                            checked,
                                          ) =>
                                            updatePart(
                                              finding.id,
                                              part.id,
                                              'isPms',
                                              !!checked,
                                            )
                                          }
                                          id={`pms-${part.id}`}
                                        />

                                        <Label
                                          htmlFor={`pms-${part.id}`}
                                          className="cursor-pointer text-xs font-semibold"
                                        >
                                          PMS
                                        </Label>
                                      </div>

                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          removePart(
                                            finding.id,
                                            part.id,
                                          )
                                        }
                                        className="
                                          h-10
                                          w-10
                                          rounded-md
                                          text-muted-foreground
                                          hover:bg-destructive/10
                                          hover:text-destructive
                                          md:h-8
                                          md:w-8
                                        "
                                        aria-label="Remove part"
                                      >
                                        <X className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  {part.inventoryItemId && (
                                    <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/10 bg-primary/5 px-3 py-2">
                                      <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />

                                      <p className="text-[11px] leading-5 text-muted-foreground">
                                        This part is linked to inventory. Its stock will be kept when the estimate is submitted to billing.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center">
                            <Package className="mx-auto h-5 w-5 text-muted-foreground" />

                            <p className="mt-2 text-xs font-medium">
                              No parts added
                            </p>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Add a part or material associated with
                              this finding.
                            </p>
                          </div>
                        )}

                        <div className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                          <p className="text-[11px] leading-5 text-muted-foreground">
                            Checking PMS sets the price to ₱0.00
                            because it is included in the package.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                ),
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={
                addFinding
              }
              className="
                h-11
                w-full
                rounded-md
                border-dashed
                md:h-9
              "
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Finding
            </Button>
          </div>
        </div>

        {/* =======================================================
         * FOOTER
         * ===================================================== */}
        <DialogFooter className="shrink-0 border-t border-border bg-muted/20 p-4 sm:p-5">
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={
                onClose
              }
              disabled={
                saving
              }
              className="h-11 rounded-md md:h-9"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={
                handleSave
              }
              disabled={
                saving
              }
              className="
                h-11
                rounded-md
                md:h-9
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
                focus-visible:ring-offset-2
              "
            >
              {saving
                ? 'Saving...'
                : 'Save Findings'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Picker modals */}
      <DefaultFindingPickerModal
        open={
          defaultPickerOpen
        }
        onOpenChange={
          setDefaultPickerOpen
        }
        onSelect={
          handleDefaultFindingSelect
        }
      />

      <HistoryFindingPickerModal
        open={
          historyPickerOpen
        }
        onOpenChange={
          setHistoryPickerOpen
        }
        onAddFindings={
          handleHistoryFindingsSelect
        }
        isAdding={
          isAddingFromPicker
        }
        phase="INSPECTION"
      />
    </Dialog>
  );
}