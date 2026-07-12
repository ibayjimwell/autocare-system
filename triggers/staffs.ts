import { triggerPush } from './invoke';

interface StaffPayload {
  fullname: string;
  username?: string;
  role?: string;
}

export const staffsTriggers = {
  /**
   * Fired when a new staff member is created.
   */
  async onNew(payload: StaffPayload) {
    const title = '🧑‍💼 New Team Member';
    const body = payload.username
      ? `${payload.fullname} (@${payload.username}) has been onboarded as ${payload.role || 'staff'}.`
      : `${payload.fullname} has been onboarded.`;
    await triggerPush('staffs', 'new', title, body, '/staffs');
  },

  /**
   * Fired when a staff member is updated.
   */
  async onUpdated(payload: StaffPayload) {
    const title = '✏️ Staff Member Updated';
    const body = `${payload.fullname}'s details have been updated.`;
    await triggerPush('staffs', 'updated', title, body, '/staffs');
  },

  /**
   * Fired when a staff member goes online.
   */
  async onOnline(payload: StaffPayload) {
    const title = '🟢 Staff Online';
    const body = `${payload.fullname} is now online.`;
    await triggerPush('staffs', 'online', title, body, '/staffs');
  },

  /**
   * Fired when a staff member goes offline.
   */
  async onOffline(payload: StaffPayload) {
    const title = '🔴 Staff Offline';
    const body = `${payload.fullname} is now offline.`;
    await triggerPush('staffs', 'offline', title, body, '/staffs');
  },
};