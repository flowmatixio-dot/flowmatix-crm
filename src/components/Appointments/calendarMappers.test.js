import { describe, it, expect } from 'vitest';
import { getOpDuration, computeEndTime, getDayStats, apptToEvent, mapAllEvents } from './calendarMappers.js';

// ── getOpDuration ──

describe('getOpDuration', () => {
  it('returns 6h fallback for 0 grafts', () => {
    expect(getOpDuration(0)).toBe(6);
  });

  it('returns 6h fallback for null grafts', () => {
    expect(getOpDuration(null)).toBe(6);
  });

  it('returns 4h for 1500 grafts', () => {
    expect(getOpDuration(1500)).toBe(4);
  });

  it('returns 6h for 3000 grafts', () => {
    expect(getOpDuration(3000)).toBe(6);
  });

  it('returns 8h for 4500 grafts', () => {
    expect(getOpDuration(4500)).toBe(8);
  });

  it('returns 10h for 5000+ grafts', () => {
    expect(getOpDuration(5000)).toBe(10);
  });

  it('uses custom doctor settings', () => {
    expect(getOpDuration(1500, { duration_1500: 5 })).toBe(5);
    expect(getOpDuration(3000, { duration_3000: 7 })).toBe(7);
  });
});

// ── computeEndTime ──

describe('computeEndTime', () => {
  it('adds minutes to start time', () => {
    expect(computeEndTime('09:00', 360)).toBe('15:00');
  });

  it('handles 30-min offset', () => {
    expect(computeEndTime('08:30', 90)).toBe('10:00');
  });

  it('wraps past midnight', () => {
    expect(computeEndTime('23:00', 120)).toBe('01:00');
  });

  it('returns null for missing start', () => {
    expect(computeEndTime(null, 60)).toBeNull();
  });

  it('returns null for missing duration', () => {
    expect(computeEndTime('09:00', 0)).toBeNull();
  });
});

// ── getDayStats ──

describe('getDayStats', () => {
  it('returns empty object for empty array', () => {
    expect(getDayStats([])).toEqual({});
  });

  it('counts one surgery correctly', () => {
    const stats = getDayStats([{ date: '2026-04-10', treatment: 'FUE', grafts: 2000, doctor_id: 'd1' }]);
    expect(stats['2026-04-10'].ops).toBe(1);
    expect(stats['2026-04-10'].consults).toBe(0);
    expect(stats['2026-04-10'].grafts).toBe(2000);
    expect(stats['2026-04-10'].doctors).toEqual(['d1']);
  });

  it('counts consultation separately', () => {
    const stats = getDayStats([{ date: '2026-04-10', treatment: 'consultation', doctor_id: 'd1' }]);
    expect(stats['2026-04-10'].ops).toBe(0);
    expect(stats['2026-04-10'].consults).toBe(1);
  });

  it('treats "beratung" as consultation', () => {
    const stats = getDayStats([{ date: '2026-04-10', treatment: 'Beratung', doctor_id: 'd1' }]);
    expect(stats['2026-04-10'].consults).toBe(1);
  });

  it('aggregates multiple appointments on same day', () => {
    const stats = getDayStats([
      { date: '2026-04-10', treatment: 'FUE', grafts: 2000, doctor_id: 'd1' },
      { date: '2026-04-10', treatment: 'DHI', grafts: 3000, doctor_id: 'd2' },
      { date: '2026-04-10', treatment: 'consultation', doctor_id: 'd1' },
    ]);
    expect(stats['2026-04-10'].ops).toBe(2);
    expect(stats['2026-04-10'].consults).toBe(1);
    expect(stats['2026-04-10'].grafts).toBe(5000);
    expect(stats['2026-04-10'].doctors).toHaveLength(2);
  });
});

// ── apptToEvent ──

describe('apptToEvent', () => {
  it('maps basic appointment to event', () => {
    const event = apptToEvent({ id: '123', patient: 'John Doe', date: '2026-04-10', time: '09:00', status: 'booked', treatment: 'FUE', grafts: 2000 });
    expect(event.id).toBe('123');
    expect(event.title).toBe('John Doe');
    expect(event.start).toBe('2026-04-10T09:00');
  });

  it('returns null for missing date', () => {
    expect(apptToEvent({ id: '123', patient: 'Test' })).toBeNull();
  });

  it('derives date from scheduledAt', () => {
    const event = apptToEvent({ id: '123', scheduledAt: '2026-04-10T09:00:00Z', status: 'booked' });
    expect(event).not.toBeNull();
    expect(event.start).toContain('2026-04-10');
  });

  it('sets cancelled styling', () => {
    const event = apptToEvent({ id: '123', patient: 'Test', date: '2026-04-10', time: '09:00', status: 'cancelled' });
    expect(event.extendedProps.status).toBe('cancelled');
  });

  it('defaults patient to "Patient"', () => {
    const event = apptToEvent({ id: '123', date: '2026-04-10', status: 'booked' });
    expect(event.title).toBe('Patient');
  });

  it('uses title when patient is missing', () => {
    const event = apptToEvent({ id: '123', title: 'Termin', date: '2026-04-10', status: 'booked' });
    expect(event.title).toBe('Termin');
  });
});

// ── mapAllEvents ──

describe('mapAllEvents', () => {
  it('returns empty array for empty inputs', () => {
    expect(mapAllEvents([], [], [])).toEqual([]);
  });

  it('combines appointments and blocked days', () => {
    const appts = [{ id: '1', patient: 'Test', date: '2026-04-10', time: '09:00', status: 'booked' }];
    const blocked = [{ id: 'b1', date: '2026-04-11', reason: 'Holiday' }];
    const events = mapAllEvents(appts, blocked);
    expect(events).toHaveLength(2);
    expect(events[0].extendedProps.type).toBe('appointment');
    expect(events[1].extendedProps.type).toBe('blocked');
  });

  it('filters out null appointments', () => {
    const appts = [
      { id: '1', patient: 'Test', date: '2026-04-10', status: 'booked' },
      { id: '2' }, // no date → null
    ];
    const events = mapAllEvents(appts);
    expect(events).toHaveLength(1);
  });
});
