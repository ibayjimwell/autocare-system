'use client';

import { useState, useEffect } from 'react';
import { staffApi } from '@/lib/staffs/staffs';
import { toast } from 'sonner';

export function useStaffForm(onSuccess: () => void, onHighlight: (id: string) => void) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form, setForm] = useState({
    fullname: '',
    username: '',
    role: 'Mechanic',
    customRole: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<any>(null);

  // Temp password state (exposed for the dialog)
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [tempStaffName, setTempStaffName] = useState('');
  const [tempStaffId, setTempStaffId] = useState('');

  const generateUsername = (fullName: string) => {
    const first = fullName.trim().split(' ')[0]?.toLowerCase() || '';
    return `autocare@${first}`;
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(prev => ({
      ...prev,
      fullname: val,
      username: generateUsername(val),
    }));
  };

  const openCreate = () => {
    setEditingStaff(null);
    setForm({ fullname: '', username: '', role: 'Mechanic', customRole: '' });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (staff: any) => {
    setEditingStaff(staff);
    setForm({
      fullname: staff.fullname || '',
      username: staff.username || '',
      role: staff.role || 'Mechanic',
      customRole: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const finalRole = form.role === 'custom' ? form.customRole.trim() : form.role;
    if (!form.fullname.trim() || !form.username.trim() || !finalRole) {
      setFormError({
        type: 'fve',
        title: 'Validation Error',
        message: 'Full name, username, and role are required.',
      });
      setSaving(false);
      return;
    }

    try {
      if (editingStaff) {
        const payload = {
          fullname: form.fullname.trim(),
          username: form.username.trim(),
          role: finalRole,
        };
        const res = await staffApi.update(editingStaff.id, payload);
        if (res.error) {
          setFormError({
            type: res.errorType || 'fve',
            title: res.errorTitle || 'Update failed',
            message: res.errorMessage || 'Could not update staff.',
          });
        } else {
          toast.success('Staff updated successfully.');
          setModalOpen(false);
          onSuccess();
          onHighlight(editingStaff.id);
        }
      } else {
        const res = await staffApi.create({
          fullname: form.fullname.trim(),
          username: form.username.trim(),
          role: finalRole,
        });
        if (res.error) {
          setFormError({
            type: res.errorType || 'fve',
            title: res.errorTitle || 'Creation failed',
            message: res.errorMessage || 'Could not create staff.',
          });
        } else {
          const newStaff = res.data;
          setTempPassword(res.data.tempPasswordPlain);
          setTempStaffName(newStaff.fullname);
          setTempStaffId(newStaff.id);
          setModalOpen(false);
          onSuccess();
          onHighlight(newStaff.id);
        }
      }
    } catch (err: any) {
      setFormError({
        type: 'se',
        title: 'Unexpected Error',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    modalOpen,
    setModalOpen,
    editingStaff,
    form,
    setForm,
    saving,
    formError,
    setFormError,
    openCreate,
    openEdit,
    handleSave,
    handleFullNameChange,
    tempPassword,
    tempStaffName,
    tempStaffId,
    setTempPassword,
  };
}