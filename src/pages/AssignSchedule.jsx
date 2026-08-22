import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { clientService } from '../services/clientService';
import { scheduleService } from '../services/scheduleService';
import {
  buildSlots,
  DEFAULT_TIME_ROWS,
  DEFAULT_WEEKDAYS,
  detectSlotOverlaps,
  expandDateRange,
  formatTimeDisplay,
  getDateRangeHint,
  getWeekdayName,
  MAX_SLOTS,
  todayIso,
} from '../utils/scheduleSlots';
import '../styles/adminScheduling.css';

const STEPS = ['Select Client', 'Create Schedules', 'Assign Caregiver', 'Confirm'];
const WEEKDAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DATE_MODES = [
  { id: 'single', label: 'Single day' },
  { id: 'range', label: 'Date range' },
  { id: 'pick', label: 'Pick dates' },
];

let timeRowIdCounter = 2;

export default function AssignSchedule() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillClient = searchParams.get('clientCode') || '';

  const [step, setStep] = useState(0);
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  const [dateMode, setDateMode] = useState('single');
  const [singleDate, setSingleDate] = useState(todayIso());
  const [rangeStart, setRangeStart] = useState(todayIso());
  const [rangeEnd, setRangeEnd] = useState(todayIso());
  const [rangeWeekdays, setRangeWeekdays] = useState([...DEFAULT_WEEKDAYS]);
  const [pickedDates, setPickedDates] = useState([]);
  const [pickDateInput, setPickDateInput] = useState(todayIso());
  const [timeRows, setTimeRows] = useState([...DEFAULT_TIME_ROWS]);

  const [existingSchedules, setExistingSchedules] = useState([]);
  const [availableData, setAvailableData] = useState(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingCaregivers, setLoadingCaregivers] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await clientService.getClients();
        const list = response?.list || [];
        setClients(list);
        if (prefillClient) {
          const match = list.find((c) => c.clientCode === prefillClient);
          if (match) setSelectedClient(match);
        }
      } catch {
        setResult({ success: false, message: 'Unable to load clients.' });
      }
    };
    loadClients();
  }, [prefillClient]);

  const selectedDates = useMemo(() => {
    if (dateMode === 'single') return singleDate ? [singleDate] : [];
    if (dateMode === 'range') return expandDateRange(rangeStart, rangeEnd, rangeWeekdays);
    return [...pickedDates].sort();
  }, [dateMode, singleDate, rangeStart, rangeEnd, rangeWeekdays, pickedDates]);

  const slots = useMemo(() => buildSlots(selectedDates, timeRows), [selectedDates, timeRows]);

  const slotValidation = useMemo(() => detectSlotOverlaps(slots), [slots]);

  const dateRangeHint = useMemo(() => {
    if (dateMode !== 'range') return null;
    return getDateRangeHint(rangeStart, rangeEnd, rangeWeekdays, selectedDates.length);
  }, [dateMode, rangeStart, rangeEnd, rangeWeekdays, selectedDates.length]);

  const loadExistingSchedules = useCallback(async () => {
    if (selectedDates.length === 0) {
      setExistingSchedules([]);
      return;
    }
    const start = selectedDates[0];
    const end = selectedDates[selectedDates.length - 1];
    try {
      const response =
        start === end
          ? await scheduleService.getSchedulesByDate(start)
          : await scheduleService.getSchedulesInRange(start, end);
      setExistingSchedules(response?.data || []);
    } catch {
      setExistingSchedules([]);
    }
  }, [selectedDates]);

  useEffect(() => {
    if (step === 1) loadExistingSchedules();
  }, [step, loadExistingSchedules]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const activeFirst = [...clients].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
    if (!q) return activeFirst;
    return activeFirst.filter(
      (c) =>
        (c.fullName || '').toLowerCase().includes(q) ||
        (c.clientCode || '').toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const clientExistingOnDate = (date) =>
    existingSchedules.filter(
      (s) =>
        s.client?.clientCode === selectedClient?.clientCode &&
        new Date(s.date).toISOString().slice(0, 10) === date
    );

  const toggleWeekday = (day) => {
    setRangeWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addTimeRow = () => {
    setTimeRows((prev) => [
      ...prev,
      { id: timeRowIdCounter++, startTime: '14:00', endTime: '16:00' },
    ]);
  };

  const removeTimeRow = (id) => {
    setTimeRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const updateTimeRow = (id, field, value) => {
    setTimeRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addPickedDate = () => {
    if (!pickDateInput) return;
    setPickedDates((prev) => (prev.includes(pickDateInput) ? prev : [...prev, pickDateInput].sort()));
  };

  const removePickedDate = (date) => {
    setPickedDates((prev) => prev.filter((d) => d !== date));
  };

  const loadAvailableCaregivers = async () => {
    if (!selectedClient || slots.length === 0) return;
    setLoadingCaregivers(true);
    setAvailableData(null);
    setSelectedCaregiver(null);
    try {
      const response = await scheduleService.getAvailableCaregiversBatch({
        clientCode: selectedClient.clientCode,
        slots,
      });
      setAvailableData(response);
      if (response.eligible?.length === 1) {
        setSelectedCaregiver(response.eligible[0]);
      }
    } catch (err) {
      setResult({ success: false, message: err.message || 'Failed to load available caregivers.' });
    } finally {
      setLoadingCaregivers(false);
    }
  };

  const goNext = async () => {
    setResult(null);
    if (step === 0) {
      if (!selectedClient) {
        setResult({ success: false, message: 'Please select a client.' });
        return;
      }
      if (selectedClient.status !== 'active') {
        setResult({ success: false, message: 'Selected client is not active.' });
        return;
      }
      setStep(1);
    } else if (step === 1) {
      if (dateMode === 'range' && rangeWeekdays.length === 0) {
        setResult({ success: false, message: 'Select at least one weekday for the date range.' });
        return;
      }
      if (selectedDates.length === 0) {
        setResult({ success: false, message: 'Add at least one date.' });
        return;
      }
      if (!slotValidation.valid) {
        setResult({ success: false, message: slotValidation.message });
        return;
      }
      setStep(2);
      await loadAvailableCaregivers();
    } else if (step === 2) {
      if (!selectedCaregiver) {
        setResult({ success: false, message: 'Please select an available caregiver.' });
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    setResult(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handleAssign = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await scheduleService.assignScheduleBatch({
        clientCode: selectedClient.clientCode,
        employeeCode: selectedCaregiver.employeeCode,
        slots,
        notes: notes.trim(),
      });
      setResult({
        success: true,
        message: response.message,
        created: response.created,
        failed: response.failed,
        results: response.results,
        data: response,
      });
    } catch (err) {
      setResult({
        success: false,
        message: err.message || 'Failed to assign schedules.',
        rule: err.rule,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(0);
    setSelectedClient(null);
    setSelectedCaregiver(null);
    setAvailableData(null);
    setNotes('');
    setResult(null);
    setDateMode('single');
    setSingleDate(todayIso());
    setPickedDates([]);
    setTimeRows([...DEFAULT_TIME_ROWS]);
    timeRowIdCounter = 2;
  };

  return (
    <div className="scheduling-page">
      <Navbar />
      <div className="scheduling-container">
        <div className="scheduling-header">
          <h1>Assign Schedule</h1>
          <p>
            Select a client, build schedule slots, then assign one caregiver.{' '}
            <Link to="/admin/schedule">View schedule board</Link>
          </p>
        </div>

        <div className="scheduling-steps">
          {STEPS.map((label, idx) => (
            <div
              key={label}
              className={`scheduling-step ${idx === step ? 'active' : ''} ${idx < step ? 'done' : ''}`}
            >
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        {result && step !== 3 && (
          <div className={`scheduling-alert ${result.success ? 'success' : 'error'}`}>
            {result.message}
          </div>
        )}

        {step === 0 && (
          <div className="scheduling-card">
            <h2>Which client needs coverage?</h2>
            {selectedClient && (
              <div className="scheduling-alert info" style={{ marginBottom: 12 }}>
                Selected: <strong>{selectedClient.fullName}</strong> ({selectedClient.clientCode})
              </div>
            )}
            <div className="scheduling-field">
              <label htmlFor="clientSearch">Search clients</label>
              <input
                id="clientSearch"
                type="text"
                placeholder="Search by name or code..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <div className="client-search-list">
              {filteredClients.length === 0 ? (
                <p className="client-meta" style={{ padding: 14 }}>No clients found.</p>
              ) : (
                filteredClients.map((c) => (
                  <div
                    key={c.clientCode}
                    className={`client-search-item ${selectedClient?.clientCode === c.clientCode ? 'selected' : ''} ${c.status !== 'active' ? 'inactive' : ''}`}
                    onClick={() => c.status === 'active' && setSelectedClient(c)}
                  >
                    <strong>{c.fullName}</strong> ({c.clientCode})
                    <div className="client-meta">
                      Status: {c.status} · Needs: {(c.careNeeds || []).join(', ') || 'None'} · Gender pref:{' '}
                      {c.preferredCaregiverGender || 'No Preference'}
                      {c.hasPets ? ' · Has pets' : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="scheduling-actions">
              <button type="button" className="scheduling-btn scheduling-btn-primary" onClick={goNext}>
                Next: Create Schedules
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="scheduling-card">
            <h2>Create schedules for {selectedClient?.fullName}</h2>

            <div className="date-mode-tabs">
              {DATE_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`date-mode-tab ${dateMode === mode.id ? 'active' : ''}`}
                  onClick={() => setDateMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {dateMode === 'single' && (
              <div className="scheduling-form-row">
                <div className="scheduling-field">
                  <label htmlFor="singleDate">Date</label>
                  <input
                    id="singleDate"
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {dateMode === 'range' && (
              <>
                <div className="scheduling-form-row">
                  <div className="scheduling-field">
                    <label htmlFor="rangeStart">From</label>
                    <input id="rangeStart" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                  </div>
                  <div className="scheduling-field">
                    <label htmlFor="rangeEnd">To</label>
                    <input id="rangeEnd" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                  </div>
                </div>
                <div className="weekday-picker">
                  <span className="weekday-picker-label">Weekdays</span>
                  {WEEKDAY_OPTIONS.map((day) => (
                    <label key={day} className="weekday-checkbox">
                      <input
                        type="checkbox"
                        checked={rangeWeekdays.includes(day)}
                        onChange={() => toggleWeekday(day)}
                      />
                      {day.slice(0, 3)}
                    </label>
                  ))}
                </div>
                <p className="client-meta">{selectedDates.length} day(s) selected in range</p>
                {dateRangeHint && (
                  <div className="scheduling-alert info" style={{ marginTop: 8 }}>{dateRangeHint}</div>
                )}
              </>
            )}

            {dateMode === 'pick' && (
              <>
                <div className="scheduling-form-row">
                  <div className="scheduling-field">
                    <label htmlFor="pickDate">Add date</label>
                    <input id="pickDate" type="date" value={pickDateInput} onChange={(e) => setPickDateInput(e.target.value)} />
                  </div>
                  <div className="scheduling-field" style={{ justifyContent: 'flex-end' }}>
                    <label>&nbsp;</label>
                    <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={addPickedDate}>
                      + Add date
                    </button>
                  </div>
                </div>
                {pickedDates.length > 0 ? (
                  <div className="picked-dates-list">
                    {pickedDates.map((d) => (
                      <span key={d} className="picked-date-chip">
                        {d} ({getWeekdayName(d).slice(0, 3)})
                        <button type="button" aria-label={`Remove ${d}`} onClick={() => removePickedDate(d)}>×</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="client-meta">No dates picked yet.</p>
                )}
              </>
            )}

            <div className="time-slots-panel">
              <div className="time-slots-panel-header">
                <div>
                  <h3 className="slot-section-title">Time slots</h3>
                  <p className="client-meta">Applied to each selected day. Add multiple slots for morning/afternoon visits.</p>
                </div>
                <button type="button" className="scheduling-btn scheduling-btn-primary time-slot-add-btn" onClick={addTimeRow}>
                  + Add time slot
                </button>
              </div>
              {timeRows.map((row, index) => (
                <div key={row.id} className="scheduling-form-row time-row">
                  <span className="time-row-label">Slot {index + 1}</span>
                  <div className="scheduling-field">
                    <label>Start</label>
                    <input type="time" value={row.startTime} onChange={(e) => updateTimeRow(row.id, 'startTime', e.target.value)} />
                  </div>
                  <div className="scheduling-field">
                    <label>End</label>
                    <input type="time" value={row.endTime} onChange={(e) => updateTimeRow(row.id, 'endTime', e.target.value)} />
                  </div>
                  {timeRows.length > 1 && (
                    <button type="button" className="scheduling-btn scheduling-btn-danger time-row-remove" onClick={() => removeTimeRow(row.id)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {selectedDates.length === 0 && (
              <div className="scheduling-alert error" style={{ marginTop: 12 }}>
                No dates selected — choose a date or adjust your range/weekday filter before continuing.
              </div>
            )}

            {!slotValidation.valid && slots.length > 0 && (
              <div className="scheduling-alert error" style={{ marginTop: 12 }}>{slotValidation.message}</div>
            )}

            {slots.length > 0 && (
              <div className="slot-preview">
                <h3>
                  Preview: {slots.length} schedule{slots.length !== 1 ? 's' : ''}
                  {slots.length >= MAX_SLOTS && ' (maximum reached)'}
                </h3>
                <div className="slot-preview-table-wrap">
                  <table className="slot-preview-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Existing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.slice(0, 20).map((slot, idx) => {
                        const existing = clientExistingOnDate(slot.date);
                        return (
                          <tr key={`${slot.date}-${slot.startTime}-${idx}`}>
                            <td>{slot.date}</td>
                            <td>{getWeekdayName(slot.date).slice(0, 3)}</td>
                            <td>{formatTimeDisplay(slot.startTime)}</td>
                            <td>{formatTimeDisplay(slot.endTime)}</td>
                            <td>{existing.length > 0 ? `${existing.length} shift(s)` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {slots.length > 20 && (
                    <p className="client-meta">Showing first 20 of {slots.length} slots</p>
                  )}
                </div>
              </div>
            )}

            <div className="scheduling-actions">
              <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={goBack}>Back</button>
              <button
                type="button"
                className="scheduling-btn scheduling-btn-primary"
                onClick={goNext}
                disabled={!slotValidation.valid || slots.length === 0}
              >
                Next: Assign Caregiver ({slots.length} slot{slots.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="scheduling-card">
            <h2>
              Caregivers available for all {slots.length} slot{slots.length !== 1 ? 's' : ''}
            </h2>
            {loadingCaregivers && <p className="client-meta">Checking availability across all dates and times...</p>}
            {!loadingCaregivers && availableData && (
              <>
                <p className="client-meta">
                  {availableData.eligibleCount} eligible for entire batch · {availableData.ineligibleCount} unavailable
                </p>
                <div className="caregiver-grid">
                  {availableData.eligible.length === 0 ? (
                    <div className="scheduling-alert info">
                      No caregiver is available for every slot. Adjust dates/times or assign slots separately.
                    </div>
                  ) : (
                    availableData.eligible.map((cg) => (
                      <div
                        key={cg.employeeCode}
                        className={`caregiver-card ${selectedCaregiver?.employeeCode === cg.employeeCode ? 'selected' : ''}`}
                        onClick={() => setSelectedCaregiver(cg)}
                      >
                        <h4>
                          {cg.fullName} <span className="caregiver-badge">Available</span>
                        </h4>
                        <div className="client-meta">
                          {cg.employeeCode} · {cg.gender} · Skills: {(cg.skills || []).slice(0, 4).join(', ')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {availableData.ineligible.length > 0 && (
                  <details className="ineligible-section">
                    <summary>{availableData.ineligible.length} unavailable caregiver(s)</summary>
                    <div className="caregiver-grid" style={{ marginTop: 10 }}>
                      {availableData.ineligible.map((cg) => (
                        <div key={cg.employeeCode} className="caregiver-card ineligible">
                          <h4>
                            {cg.fullName} <span className="caregiver-badge unavailable">Unavailable</span>
                          </h4>
                          <div className="client-meta">{cg.employeeCode}</div>
                          <div className="reason">{cg.reason}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
            <div className="scheduling-actions">
              <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={goBack}>Back</button>
              <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={loadAvailableCaregivers} disabled={loadingCaregivers}>
                Refresh
              </button>
              <button type="button" className="scheduling-btn scheduling-btn-primary" onClick={goNext} disabled={!selectedCaregiver}>
                Next: Confirm
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="scheduling-card">
            <h2>Confirm {slots.length} schedule{slots.length !== 1 ? 's' : ''}</h2>
            <div className="scheduling-summary">
              <dl>
                <dt>Client</dt>
                <dd>{selectedClient?.fullName} ({selectedClient?.clientCode})</dd>
                <dt>Caregiver</dt>
                <dd>{selectedCaregiver?.fullName} ({selectedCaregiver?.employeeCode})</dd>
                <dt>Total slots</dt>
                <dd>{slots.length}</dd>
              </dl>
            </div>

            <div className="slot-preview-table-wrap">
              <table className="slot-preview-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, idx) => (
                    <tr key={`confirm-${slot.date}-${idx}`}>
                      <td>{slot.date}</td>
                      <td>{getWeekdayName(slot.date).slice(0, 3)}</td>
                      <td>{formatTimeDisplay(slot.startTime)} – {formatTimeDisplay(slot.endTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="scheduling-field" style={{ marginTop: 16 }}>
              <label htmlFor="notes">Notes (optional, applied to all schedules)</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions..."
              />
            </div>

            {result && (
              <div className={`scheduling-alert ${result.success ? 'success' : 'error'}`} style={{ marginTop: 12 }}>
                {result.message}
                {result.success && result.created != null && (
                  <span> — {result.created} created{result.failed ? `, ${result.failed} failed` : ''}</span>
                )}
              </div>
            )}

            {result?.success && result.results?.some((r) => r.status === 'failed') && (
              <div className="slot-preview" style={{ marginTop: 12 }}>
                <h3>Failed slots</h3>
                <ul className="failed-slots-list">
                  {result.results.filter((r) => r.status === 'failed').map((r, i) => (
                    <li key={i}>{r.date?.slice?.(0, 10) || r.date} {formatTimeDisplay(r.startTime)}–{formatTimeDisplay(r.endTime)}: {r.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="scheduling-actions">
              <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={goBack} disabled={loading}>
                Back
              </button>
              {!result?.success && (
                <button type="button" className="scheduling-btn scheduling-btn-primary" onClick={handleAssign} disabled={loading}>
                  {loading ? 'Creating...' : `Confirm & create ${slots.length} schedule${slots.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
            {result?.success && (
              <div className="scheduling-actions">
                <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={resetWizard}>
                  Assign Another
                </button>
                <button type="button" className="scheduling-btn scheduling-btn-secondary" onClick={() => navigate('/admin/schedule')}>
                  View Schedule Board
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
