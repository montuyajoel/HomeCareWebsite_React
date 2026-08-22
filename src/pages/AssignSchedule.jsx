// src/pages/AssignSchedule.jsx
// Minimal, demo-ready form: admin types clientCode + employeeCode,
// picks date/time, submits to POST /api/schedules/assign.
// No auto-filtering — that logic can be added later if time allows.
import { useState } from 'react';
import { scheduleService } from '../services/scheduleService';

const initialForm = {
  clientCode: '',
  employeeCode: '',
  date: '',
  startTime: '',
  endTime: '',
  notes: ''
};

export default function AssignSchedule() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, message, rule? }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.clientCode.trim()) return 'Client code is required.';
    if (!form.employeeCode.trim()) return 'Employee code is required.';
    if (!form.date) return 'Date is required.';
    if (!form.startTime) return 'Start time is required.';
    if (!form.endTime) return 'End time is required.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    const validationError = validate();
    if (validationError) {
      setResult({ success: false, message: validationError });
      return;
    }

    setLoading(true);
    try {
      // Backend Schedule model stores startTime/endTime as "HH:MM:SS" strings.
      // <input type="time"> returns "HH:MM", so append seconds for consistency.
      const payload = {
        clientCode: form.clientCode.trim(),
        employeeCode: form.employeeCode.trim(),
        date: form.date,
        startTime: `${form.startTime}:00`,
        endTime: `${form.endTime}:00`,
        notes: form.notes.trim()
      };

      const response = await scheduleService.assignSchedule(payload);
      setResult({ success: true, message: response.message, data: response.data });
      setForm(initialForm);
    } catch (err) {
      // err shape: { success: false, rule: N, message: "..." }
      setResult({
        success: false,
        message: err.message || 'Failed to assign schedule.',
        rule: err.rule
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Assign Schedule</h1>
        <p style={styles.subtitle}>
          Enter a client code and caregiver employee code to create a new schedule.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="clientCode" style={styles.label}>Client Code</label>
            <input
              id="clientCode"
              name="clientCode"
              type="text"
              placeholder="e.g. CLT004"
              value={form.clientCode}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="employeeCode" style={styles.label}>Caregiver Employee Code</label>
            <input
              id="employeeCode"
              name="employeeCode"
              type="text"
              placeholder="e.g. EMP004"
              value={form.employeeCode}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label htmlFor="date" style={styles.label}>Date</label>
              <input
                id="date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label htmlFor="startTime" style={styles.label}>Start Time</label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label htmlFor="endTime" style={styles.label}>End Time</label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label htmlFor="notes" style={styles.label}>Notes (optional)</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
              style={styles.textarea}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Assigning...' : 'Assign Schedule'}
          </button>
        </form>

        {result && (
          <div style={result.success ? styles.successBox : styles.errorBox}>
            {!result.success && result.rule && (
              <strong>Rule {result.rule} failed: </strong>
            )}
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f8fc',
    display: 'flex',
    justifyContent: 'center',
    padding: '32px 16px'
  },
  card: {
    background: '#ffffff',
    borderRadius: 16,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    border: '1px solid #e3edf7',
    padding: '28px',
    width: '100%',
    maxWidth: 480
  },
  title: { margin: 0, fontSize: 22, color: '#1f2d3d' },
  subtitle: { color: '#5b7086', fontSize: 14, marginTop: 6, marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 },
  label: { fontSize: 13, color: '#33465c', fontWeight: 600 },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #cfe0f0',
    fontSize: 14,
    outline: 'none'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #cfe0f0',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical'
  },
  button: {
    marginTop: 6,
    padding: '12px',
    borderRadius: 10,
    border: 'none',
    background: '#4a90e2',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer'
  },
  successBox: {
    marginTop: 18,
    padding: '12px 14px',
    borderRadius: 8,
    background: '#eafaf0',
    border: '1px solid #b7e4c7',
    color: '#1e6b3b',
    fontSize: 14
  },
  errorBox: {
    marginTop: 18,
    padding: '12px 14px',
    borderRadius: 8,
    background: '#fdecea',
    border: '1px solid #f5c2c0',
    color: '#a13a34',
    fontSize: 14
  }
};