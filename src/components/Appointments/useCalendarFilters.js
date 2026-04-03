import { useState, useMemo } from "react";

/**
 * Hook for doctor-based calendar filtering.
 * selectedDoctorIds: null = show all, string[] = show only selected.
 */
export function useCalendarFilters(events) {
  const [selectedDoctorIds, setSelectedDoctorIds] = useState(null);

  const filteredEvents = useMemo(() => {
    if (!selectedDoctorIds) return events.filter(ev => (ev.extendedProps?.type !== "vacation"));
    return events.filter((ev) => {
      const props = ev.extendedProps || {};
      const appt = props.appt || {};
      // Blocked days always visible
      if (props.type === "blocked") return true;
      // Vacation: only show for the selected doctor
      if (props.type === "vacation") return props.doctorId && selectedDoctorIds.includes(props.doctorId);
      // Check all possible doctor ID fields (staff_members.id OR doctors.id)
      const ids = [props.doctorId, appt.staffMemberId, appt.doctorsTableId, appt.doctorId, appt.doctor_id, appt.staffId, appt.staff_id].filter(Boolean);
      if (ids.length === 0) return false;
      return ids.some(id => selectedDoctorIds.includes(id));
    });
  }, [events, selectedDoctorIds]);

  const toggleDoctor = (doctorId) => {
    setSelectedDoctorIds((prev) => {
      if (!prev) return [doctorId];
      if (prev.includes(doctorId)) {
        const next = prev.filter((id) => id !== doctorId);
        return next.length === 0 ? null : next;
      }
      return [...prev, doctorId];
    });
  };

  const selectAll = () => setSelectedDoctorIds(null);

  const selectSingle = (doctorId) => {
    setSelectedDoctorIds((prev) => {
      if (prev && prev.length === 1 && prev[0] === doctorId) return null;
      return [doctorId];
    });
  };

  return {
    selectedDoctorIds,
    setSelectedDoctorIds,
    filteredEvents,
    toggleDoctor,
    selectAll,
    selectSingle,
  };
}
