import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/form';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  normalizeListEnvelope,
  type ListEnvelope,
} from '@/hooks/useTablePagination';

type Employee = {
  id: string;
  name: string;
  salary: number | null;
  userId: string | null;
};

type AttendanceRow = {
  status: string;
  workedSec: number;
  user: { id: string };
};

export function PayrollPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const employees = useQuery({
    queryKey: ['hrms-employees'],
    queryFn: async () => {
      const res = await apiFetch<ListEnvelope<Employee> | Employee[]>(
        '/api/hrms/employees?limit=200',
        { accessToken },
      );
      return Array.isArray(res) ? res : normalizeListEnvelope(res).data;
    },
  });

  const [year, mon] = month.split('-').map(Number);
  const from = `${month}-01`;
  const last = new Date(year, mon, 0).getDate();
  const to = `${month}-${String(last).padStart(2, '0')}`;
  const workingDays = last;

  const logs = useQuery({
    queryKey: ['payroll-attendance', employeeId, from, to],
    enabled: !!employeeId,
    queryFn: async () => {
      const emp = (employees.data ?? []).find((e) => e.id === employeeId);
      const sp = new URLSearchParams({ from, to, limit: '50' });
      if (emp?.userId) sp.set('userId', emp.userId);
      const res = await apiFetch<ListEnvelope<AttendanceRow>>(
        `/api/attendance/records?${sp}`,
        { accessToken },
      );
      return normalizeListEnvelope(res).data;
    },
  });

  const draft = useMemo(() => {
    const emp = (employees.data ?? []).find((e) => e.id === employeeId);
    const salary = emp?.salary ?? 0;
    const rows = logs.data ?? [];
    const present = rows.filter((r) => r.status === 'PRESENT').length;
    const half = rows.filter((r) => r.status === 'HALF_DAY').length;
    const absent = rows.filter((r) => r.status === 'ABSENT').length;
    const paidDays = present + half * 0.5;
    const gross = salary;
    const attendanceDeduction =
      workingDays > 0 ? Math.round(salary * ((workingDays - paidDays) / workingDays)) : 0;
    const net = Math.max(0, gross - attendanceDeduction);
    return { salary, present, half, absent, paidDays, gross, attendanceDeduction, net };
  }, [employeeId, employees.data, logs.data, workingDays]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payroll Calculator"
        description="Draft net pay from HRMS salary and attendance for the selected month. Statutory rules can be added later."
      />
      <div className="grid gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-panel sm:grid-cols-3">
        <div>
          <Label>Employee</Label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="">Select…</option>
            {(employees.data ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Month</Label>
          <Input
            className="mt-1"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="secondary" disabled>
            Save record — configure statutory rules first
          </Button>
        </div>
      </div>
      {employeeId ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['Gross / salary', `₹${draft.gross.toLocaleString('en-IN')}`],
              ['Present / half / absent', `${draft.present} / ${draft.half} / ${draft.absent}`],
              ['Attendance deduction', `₹${draft.attendanceDeduction.toLocaleString('en-IN')}`],
              ['Draft net pay', `₹${draft.net.toLocaleString('en-IN')}`],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-surface-raised p-3 shadow-panel"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-lg font-semibold text-navy">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
