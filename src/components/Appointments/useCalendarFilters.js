import { useState, useMemo } from "react";

/**
 * Hook for doctor-based calendar filtering.
 * selectedDoctorIds: null = show all, string[] = show only selected.
 */
export function useCalendarFilters(events) {
  const [selectedDoctorIds, setSelectedDoctorIds] = useState(null);

  const filteredEvents = useMemo(() => {
    if (!selectedDoctorIds) return events;
    return events.filter((ev) => {
      const docId = ev.extendedProps?.doctorId;
      // Blocked days always visible
      if (ev.extendedProps?.type === "blocked") return true;
      // If event has no doctor, hide when filtering (Google imports etc.)
      if (!docId || docId === "undefined" || docId === "null") return false;
      return selectedDoctorIds.includes(docId);
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
