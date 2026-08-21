import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { authService } from '../services/authService';
import '../styles/upcomingShifts.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const HOUR_ROW_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const pad = (value) => String(value).padStart(2, '0');

const toLocalDateKey = (date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const createNext2Weeks = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 14 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);

    return {
      key: toLocalDateKey(day),
      weekday: day.toLocaleDateString([], { weekday: 'short' }),
      dayMonth: day.toLocaleDateString([], { day: '2-digit', month: 'short' })
    };
  });
};

const toMinutes = (timeString = '00:00:00') => {
  const [hours = '0', minutes = '0', seconds = '0'] = timeString.split(':');
  return Number(hours) * 60 + Number(minutes) + Number(seconds) / 60;
};

const formatHourLabel = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:00 ${period}`;
};

export default function CaregiverUpcomingShifts() {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedShift, setSelectedShift] = useState(null);

  const days = useMemo(() => createNext2Weeks(), []);

  useEffect(() => {
    const fetchFutureShifts = async () => {
      const token = authService.getToken();
      if (!token) {
        setError('Session expired. Please sign in again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await axios.get(`${API_URL}/api/visit-logs/upcoming-shifts`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data?.success) {
          setShifts(response.data.body || []);
        } else {
          setError(response.data?.message || 'Unable to load upcoming shifts.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Unable to load upcoming shifts.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFutureShifts();
  }, []);

  const calendarShifts = useMemo(() => {
    return shifts
      .map((shift) => {
        const dayKey = shift.date ? shift.date.split('T')[0] : '';
        const dayIndex = days.findIndex((day) => day.key === dayKey);

        if (dayIndex < 0) {
          return null;
        }

        const startMinutes = toMinutes(shift.startTime);
        const endMinutesRaw = toMinutes(shift.endTime);
        const endMinutes = endMinutesRaw <= startMinutes ? endMinutesRaw + 24 * 60 : endMinutesRaw;
        const durationMinutes = Math.max(30, endMinutes - startMinutes);

        return {
          id: shift.scheduleId,
          dayIndex,
          clientName: shift.client?.fullName || 'Assigned Client',
          clientCode: shift.client?.clientCode || 'N/A',
          date: shift.date || '',
          address: shift.client?.address?.addressLine || 'Address unavailable',
          eircode: shift.client?.address?.postCode || 'N/A',
          startTime: shift.startTime || '00:00:00',
          endTime: shift.endTime || '00:00:00',
          startMinutes,
          durationMinutes,
          startHour: Math.floor(startMinutes / 60),
          minuteOffset: startMinutes % 60
        };
      })
      .filter(Boolean);
  }, [days, shifts]);

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content upcoming-shifts-page">
        <div className="upcoming-shifts-header">
          <div>
            <h2>Upcoming Shifts (2 Weeks)</h2>
            <p>Days are shown as columns and hours as rows. Shift cards are placed in their assigned time slots.</p>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/caregiver/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>

        {isLoading ? (
          <div className="card upcoming-state-card">
            Loading upcoming shifts...
          </div>
        ) : error ? (
          <div className="card upcoming-state-card error">
            {error}
          </div>
        ) : (
          <div className="card upcoming-calendar-shell">
            <div className="upcoming-calendar-scroll">
              <div
                className="upcoming-calendar-grid"
                style={{
                  gridTemplateColumns: `88px repeat(${days.length}, minmax(140px, 1fr))`,
                  gridTemplateRows: `64px repeat(24, ${HOUR_ROW_HEIGHT}px)`
                }}
              >
                  <div className="calendar-corner" style={{ gridColumn: 1, gridRow: 1 }}>Time</div>

                  {days.map((day, dayIndex) => (
                    <div key={day.key} className="calendar-day-header" style={{ gridColumn: dayIndex + 2, gridRow: 1 }}>
                    <span>{day.weekday}</span>
                    <strong>{day.dayMonth}</strong>
                  </div>
                ))}

                {HOURS.map((hour) => (
                  <React.Fragment key={hour}>
                      <div className="calendar-time-cell" style={{ gridColumn: 1, gridRow: hour + 2 }}>{formatHourLabel(hour)}</div>
                      {days.map((day, dayIndex) => (
                      <div
                        key={`${day.key}-${hour}`}
                        className="calendar-slot-cell"
                          style={{ gridColumn: dayIndex + 2, gridRow: hour + 2 }}
                        aria-hidden="true"
                      />
                    ))}
                  </React.Fragment>
                ))}

                {calendarShifts.map((shift) => (
                    <button
                    key={shift.id}
                      type="button"
                    className="calendar-shift-card"
                      onClick={() => setSelectedShift(shift)}
                      title={`View shift details for ${shift.clientName}`}
                    style={{
                      gridColumn: shift.dayIndex + 2,
                      gridRow: shift.startHour + 2,
                      marginTop: `${(shift.minuteOffset / 60) * HOUR_ROW_HEIGHT}px`,
                      height: `${Math.max(44, (shift.durationMinutes / 60) * HOUR_ROW_HEIGHT - 6)}px`
                    }}
                  >
                    <div className="calendar-shift-client">{shift.clientName}</div>
                    </button>
                ))}
              </div>
            </div>

            {!calendarShifts.length && (
              <div className="upcoming-empty-note">
                No upcoming shifts found in the next 2 weeks.
              </div>
            )}
          </div>
        )}
      </main>

      {selectedShift && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="upcoming-shift-title">
          <div className="modal-content card upcoming-shift-modal">
            <h3 id="upcoming-shift-title">Shift Details</h3>
            <div className="upcoming-shift-details-grid">
              <div>
                <strong>Client</strong>
                <p>{selectedShift.clientName} ({selectedShift.clientCode})</p>
              </div>
              <div>
                <strong>Date</strong>
                <p>{selectedShift.date ? new Date(selectedShift.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
              </div>
              <div>
                <strong>Time</strong>
                <p>{selectedShift.startTime.slice(0, 5)} - {selectedShift.endTime.slice(0, 5)}</p>
              </div>
              <div>
                <strong>Address</strong>
                <p>{selectedShift.address}</p>
              </div>
              <div>
                <strong>Eircode</strong>
                <p>{selectedShift.eircode}</p>
              </div>
            </div>

            <div className="upcoming-shift-modal-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedShift(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
