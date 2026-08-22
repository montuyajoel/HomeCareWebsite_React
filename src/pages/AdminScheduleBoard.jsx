import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { scheduleService } from '../services/scheduleService';
import '../styles/adminScheduling.css';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (t) => (t ? String(t).slice(0, 5) : '');

export default function AdminScheduleBoard() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [reassignId, setReassignId] = useState(null);
  const [reassignCode, setReassignCode] = useState('');

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await scheduleService.getSchedulesByDate(date);
      setSchedules(response?.data || []);
    } catch (err) {
      setError(err.message || 'Unable to load schedules.');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCancel = async (scheduleId) => {
    if (!window.confirm('Cancel this schedule?')) return;
    setActionMessage('');
    try {
      await scheduleService.cancelSchedule(scheduleId);
      setActionMessage('Schedule cancelled.');
      loadSchedules();
    } catch (err) {
      setActionMessage(err.message || 'Failed to cancel schedule.');
    }
  };

  const handleReassign = async (scheduleId) => {
    if (!reassignCode.trim()) {
      setActionMessage('Enter a caregiver employee code.');
      return;
    }
    setActionMessage('');
    try {
      await scheduleService.reassignSchedule(scheduleId, reassignCode.trim());
      setActionMessage('Schedule reassigned successfully.');
      setReassignId(null);
      setReassignCode('');
      loadSchedules();
    } catch (err) {
      setActionMessage(err.message || 'Failed to reassign.');
    }
  };

  return (
    <div className="scheduling-page">
      <Navbar />
      <div className="schedule-board-container">
        <div className="scheduling-header">
          <h1>Schedule Board</h1>
          <p>
            View and manage shifts for a selected day.{' '}
            <Link to="/admin/assign-schedule">Assign new schedule</Link>
          </p>
        </div>

        <div className="schedule-board-toolbar">
          <div className="scheduling-field schedule-board-date-field">
            <label htmlFor="boardDate">Date</label>
            <input
              id="boardDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="schedule-board-toolbar-actions">
            <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={loadSchedules}>
              Refresh
            </button>
            <button
              type="button"
              className="scheduling-btn scheduling-btn-primary"
              onClick={() => navigate('/admin/assign-schedule')}
            >
              + New Assignment
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className={`scheduling-alert ${actionMessage.includes('success') || actionMessage.includes('cancelled') ? 'success' : 'error'}`}>
            {actionMessage}
          </div>
        )}

        {error && <div className="scheduling-alert error">{error}</div>}

        {loading ? (
          <p className="client-meta">Loading schedules...</p>
        ) : schedules.length === 0 ? (
          <div className="schedule-board-empty">
            <p>No shifts scheduled for {date}.</p>
            <button
              type="button"
              className="scheduling-btn scheduling-btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/admin/assign-schedule')}
            >
              Assign First Shift
            </button>
          </div>
        ) : (
          <div className="schedule-board-list">
            {schedules.map((s) => (
              <div key={s.scheduleId} className="schedule-board-item">
                <div className="time">
                  {formatTime(s.startTime)}–{formatTime(s.endTime)}
                </div>
                <div>
                  <strong>{s.client?.fullName}</strong>
                  <div className="client-meta">{s.client?.clientCode}</div>
                </div>
                <div>
                  <strong>{s.caregiver?.fullName || '—'}</strong>
                  <div className="client-meta">{s.caregiver?.employeeCode || 'Unassigned'}</div>
                </div>
                <div className="actions">
                  {reassignId === s.scheduleId ? (
                    <>
                      <input
                        type="text"
                        placeholder="EMP001"
                        value={reassignCode}
                        onChange={(e) => setReassignCode(e.target.value)}
                        style={{ width: 90, padding: '6px 8px', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        className="scheduling-btn scheduling-btn-primary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => handleReassign(s.scheduleId)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="scheduling-btn scheduling-btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setReassignId(null);
                          setReassignCode('');
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="scheduling-btn scheduling-btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setReassignId(s.scheduleId);
                          setReassignCode('');
                        }}
                      >
                        Reassign
                      </button>
                      <button
                        type="button"
                        className="scheduling-btn scheduling-btn-danger"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        onClick={() => handleCancel(s.scheduleId)}
                      >
                        Cancel shift
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
