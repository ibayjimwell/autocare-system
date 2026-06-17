import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { Staffs } from '@/database/models/staffs/staffs.model';
import { StaffAccess } from '@/database/models/staffs/staffs.model';

type Staff = InferSelectModel<typeof Staffs>;
type NewStaff = InferInsertModel<typeof Staffs>;
type StaffAccess = InferInsertModel<typeof StaffAccess>;
// Expose globally
declare global {
  type StaffType = Staff;
  type NewStaffType = NewStaff;
  type StaffAccessType = StaffAccess;
  
  // A version without the password for API responses
  type StaffWithoutPasswordType = Omit<Staff, 'password'>;
}

