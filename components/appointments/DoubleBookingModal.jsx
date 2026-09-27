import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Check,
  Clock3,
  PlusCircle,
  X,
} from 'lucide-react-native';

function formatTime12h(time) {
  if (!time) return 'Booked time';

  const [hourText, minuteText] = String(time).split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return String(time);
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
}

function formatDate(date) {
  if (!date) return 'selected date';

  const [year, month, day] = String(date).split('-').map(Number);

  if (!year || !month || !day) return String(date);

  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) return String(date);

  return parsed.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DoubleBookingModal({
  visible,
  conflict,
  merging = false,
  onClose,
  onMerge,
}) {
  const existing = conflict?.existingAppointment;
  const missingServices = Array.isArray(conflict?.missingServices)
    ? conflict.missingServices
    : [];

  const canMerge = missingServices.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!merging) onClose?.();
      }}
    >
      <View className="flex-1 justify-center bg-black/50 px-4">
        <View className="max-h-[86%] overflow-hidden rounded-3xl bg-card shadow-2xl">
          <View className="border-b border-border px-5 pb-4 pt-5">
            <View className="flex-row items-start gap-3">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <AlertTriangle size={22} color="#C1272D" />
              </View>

              <View className="flex-1">
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Appointment already booked
                </Text>
                <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                  This customer and vehicle already have an appointment at{' '}
                  {formatTime12h(existing?.appointmentTime)} on{' '}
                  {formatDate(existing?.appointmentDate)}.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close duplicate booking dialog"
                disabled={merging}
                onPress={onClose}
                className="h-11 w-11 items-center justify-center rounded-full bg-secondary"
              >
                <X size={20} color="#000000" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingVertical: 18 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="rounded-2xl border border-border bg-background p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <Clock3 size={18} color="#000000" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Existing appointment
                  </Text>
                  <Text className="mt-1 text-sm font-semibold text-foreground">
                    {formatTime12h(existing?.appointmentTime)} ·{' '}
                    {formatDate(existing?.appointmentDate)}
                  </Text>
                </View>
              </View>

              {existing?.trackingNumber ? (
                <Text className="mt-3 text-xs text-muted-foreground">
                  Tracking number: {existing.trackingNumber}
                </Text>
              ) : null}
            </View>

            {canMerge ? (
              <View className="mt-4">
                <View className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <Text className="text-sm font-semibold text-foreground">
                    Add these services to the existing appointment instead?
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                    Choosing Yes keeps the existing appointment and adds only the services that are not already included.
                  </Text>
                </View>

                <View className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                  <View className="border-b border-border px-4 py-3">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Services to add
                    </Text>
                  </View>

                  {missingServices.map((service) => (
                    <View
                      key={service?.id}
                      className="flex-row items-center gap-3 border-b border-border px-4 py-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <PlusCircle size={17} color="#C1272D" />
                      </View>
                      <Text className="flex-1 text-sm font-medium text-foreground">
                        {service?.name || service?.serviceName || service?.id}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <Text className="text-sm font-semibold text-foreground">
                  This booking cannot create another appointment.
                </Text>
                <Text className="mt-1 text-xs leading-5 text-muted-foreground">
                  The selected service is already included in the existing appointment.
                </Text>
              </View>
            )}
          </ScrollView>

          <View className="border-t border-border px-5 pb-5 pt-4">
            {canMerge ? (
              <View className="flex-row gap-3">
                <Pressable
                  accessibilityRole="button"
                  disabled={merging}
                  onPress={onClose}
                  className="h-12 flex-1 items-center justify-center rounded-xl bg-secondary"
                >
                  <Text className="text-sm font-semibold text-foreground">
                    No
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={merging}
                  onPress={onMerge}
                  className="h-12 flex-[1.35] flex-row items-center justify-center rounded-xl bg-primary"
                >
                  {merging ? (
                    <Text className="text-sm font-semibold text-primary-foreground">
                      Adding services...
                    </Text>
                  ) : (
                    <>
                      <Check size={18} color="#FFFFFF" />
                      <Text className="ml-2 text-sm font-semibold text-primary-foreground">
                        Yes, add services
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={merging}
                onPress={onClose}
                className="h-12 items-center justify-center rounded-xl bg-primary"
              >
                <Text className="text-sm font-semibold text-primary-foreground">
                  Okay
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
