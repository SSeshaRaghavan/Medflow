import React, { useState, useEffect, useCallback } from 'react';
import { prescriptionApi, recordsApi, triggerBlobDownload } from '../api';
import toast from 'react-hot-toast';
import {
  XCircle,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Loader2,
  History,
  CloudOff
} from 'lucide-react';

export default function ActiveConsultationWorkspace({ appointment, onClose, onConsultationFinished }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingPrescription, setExistingPrescription] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [items, setItems] = useState([
    { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: 1 }
  ]);

  const patient = appointment.patient;
  const patientProfile = patient.patient_profile || {};
  const cacheKey = `medflow_draft_${appointment.id}`;

  const loadExistingConsultationData = useCallback(async () => {
    try {
      setLoading(true);
      const [rxRes, histRes] = await Promise.all([
        prescriptionApi.list(),
        recordsApi.list({ patient_id: patient.id }),
      ]);

      const foundRx = (rxRes.data.results || rxRes.data).find(
        (rx) => rx.appointment === appointment.id
      );

      if (foundRx) {
        setExistingPrescription(foundRx);
        setDiagnosis(foundRx.diagnosis || '');
        setNotes(foundRx.notes || '');
        if (foundRx.items && foundRx.items.length > 0) {
          setItems(foundRx.items);
        }
      } else {
        const localSaved = localStorage.getItem(cacheKey);
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (parsed.diagnosis || (parsed.items && parsed.items.length > 0)) {
              setDiagnosis(parsed.diagnosis || '');
              setNotes(parsed.notes || '');
              if (parsed.items && parsed.items.length > 0) setItems(parsed.items);
              setIsOfflineCached(true);
              toast('Restored active consultation draft from local cache', { icon: '💾' });
            }
          } catch {}
        } else {
          setDiagnosis('');
          setNotes('');
          setItems([
            { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: 1 }
          ]);
        }
      }

      setPatientHistory(histRes.data.results || histRes.data || []);
    } catch {
      toast.error('Failed to load consultation records.');
    } finally {
      setLoading(false);
    }
  }, [appointment.id, patient.id, cacheKey]);

  useEffect(() => {
    loadExistingConsultationData();
  }, [loadExistingConsultationData]);

  useEffect(() => {
    if (!loading && diagnosis) {
      const draftData = { diagnosis, notes, items };
      localStorage.setItem(cacheKey, JSON.stringify(draftData));
    }
  }, [diagnosis, notes, items, loading, cacheKey]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: 1 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast.error('Prescription requires at least one medication row.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveDraft = async () => {
    if (!diagnosis.trim()) {
      toast.error('Please enter a preliminary diagnosis.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        appointment_id: appointment.id,
        diagnosis,
        notes,
        items: items.filter((it) => it.medication_name.trim() !== ''),
      };

      if (existingPrescription) {
        const { data } = await prescriptionApi.update(existingPrescription.id, payload);
        setExistingPrescription(data);
      } else {
        const { data } = await prescriptionApi.create(payload);
        setExistingPrescription(data);
      }
      toast.success('Prescription draft saved to server and offline cache.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save prescription draft.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeAndApprove = async () => {
    if (!diagnosis.trim()) {
      toast.error('Primary diagnosis is required to finalize.');
      return;
    }

    const validItems = items.filter((it) => it.medication_name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Please enter at least one valid medication item.');
      return;
    }

    try {
      setSubmitting(true);
      let rxId = existingPrescription?.id;

      if (!rxId) {
        const { data: created } = await prescriptionApi.create({
          appointment_id: appointment.id,
          diagnosis,
          notes,
          items: validItems,
        });
        rxId = created.id;
      } else {
        await prescriptionApi.update(rxId, {
          diagnosis,
          notes,
          items: validItems,
          amendment_reason: amendmentReason,
        });
      }

      const { data: finalized } = await prescriptionApi.finalize(rxId);
      setExistingPrescription(finalized);
      localStorage.removeItem(cacheKey);
      setIsOfflineCached(false);
      toast.success('Prescription finalized with authenticated electronic signature!');
      if (onConsultationFinished) {
        onConsultationFinished(finalized);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to finalize prescription.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isFinalized = existingPrescription?.status === 'finalized' || existingPrescription?.status === 'amended';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                Active Consultation Workspace
              </span>
              <span className="text-xs text-emerald-200">Ticket #{appointment.queue_number}</span>
              {isOfflineCached && (
                <span className="text-xs bg-amber-400/30 text-amber-100 border border-amber-300/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CloudOff size={11} /> Offline Cached Draft
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold mt-1">
              Patient: {patient.full_name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((p) => !p)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <History size={14} /> {showHistory ? 'Hide Records' : `Patient Records (${patientHistory.length})`}
            </button>
            <button onClick={onClose} className="text-emerald-200 hover:text-white p-1">
              <XCircle size={22} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Patient Health Profile & Vitals
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Age / Gender:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {patientProfile.gender || 'N/A'} • {patientProfile.date_of_birth || 'DOB unset'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400">Blood Group:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{patientProfile.blood_group || 'Unknown'}</p>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400">Known Allergies:</span>
                <p className={`font-semibold mt-0.5 ${patientProfile.allergies ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {patientProfile.allergies || 'None reported'}
                </p>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400">Chronic Conditions:</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {patientProfile.chronic_conditions || 'None reported'}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <strong>Chief Complaint Today:</strong> {appointment.chief_complaint}
            </div>
          </div>

          {showHistory && (
            <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} /> Historical Consultation Timeline ({patientHistory.length})
              </h4>
              {patientHistory.length === 0 ? (
                <p className="text-xs text-indigo-700">No prior medical records for this patient.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-indigo-100">
                  {patientHistory.map((rec) => (
                    <div key={rec.id} className="pt-2 text-xs">
                      <div className="flex justify-between font-semibold text-indigo-950">
                        <span>{new Date(rec.created_at).toLocaleDateString()} — Dr. {rec.doctor?.full_name}</span>
                        <span className="text-indigo-600">{rec.diagnosis}</span>
                      </div>
                      <p className="text-indigo-900 mt-0.5">{rec.clinical_notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isFinalized && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-600" size={24} />
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    Prescription Finalized & Digitally Signed
                  </p>
                  <p className="text-xs text-emerald-700">
                    Signed on {new Date(existingPrescription.finalized_at).toLocaleString()}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      toast.loading('Downloading prescription PDF...', { id: 'rx-pdf' });
                      const blob = await prescriptionApi.downloadPDF(existingPrescription.id);
                      triggerBlobDownload(blob, `Medflow_Rx_${existingPrescription.id.slice(0, 8)}.pdf`);
                      toast.success('Downloaded successfully!', { id: 'rx-pdf' });
                    } catch {
                      toast.error('Failed to download PDF.', { id: 'rx-pdf' });
                    }
                  }}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                >
                  <Download size={14} /> Download Official PDF
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <FileText size={16} className="text-emerald-600" />
              Clinical Consultation & Diagnosis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Primary Diagnosis *</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Acute Pharyngitis, Contact Dermatitis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Clinical Advice & Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Salt water gargle, increase fluid intake"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Plus size={16} className="text-emerald-600 dark:text-emerald-400" />
                Prescribed Medications (Rx) — Rapid Builder
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <Plus size={14} /> Add Medication
              </button>
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                Rapid Dosage Toolbar (1-Click Prescribe)
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { name: 'Paracetamol 650mg', dosage: '1 Tablet', freq: '1-0-1', dur: '3 days', inst: 'After food' },
                  { name: 'Amoxicillin 500mg', dosage: '1 Capsule', freq: '1-0-1', dur: '5 days', inst: 'After food' },
                  { name: 'Pantoprazole 40mg', dosage: '1 Tablet', freq: '1-0-0', dur: '7 days', inst: 'Before food' },
                  { name: 'Cetirizine 10mg', dosage: '1 Tablet', freq: '0-0-1', dur: '5 days', inst: 'At bedtime' },
                  { name: 'Azithromycin 500mg', dosage: '1 Tablet', freq: '1-0-0', dur: '3 days', inst: 'After food' },
                  { name: 'Metformin 500mg', dosage: '1 Tablet', freq: '1-0-1', dur: '30 days', inst: 'With meals' },
                ].map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => {
                      setItems((prev) => [
                        ...prev.filter((i) => i.medication_name.trim() !== ''),
                        {
                          medication_name: template.name,
                          dosage: template.dosage,
                          frequency: template.freq,
                          duration: template.dur,
                          instructions: template.inst,
                          quantity: 1,
                        },
                      ]);
                      toast.success(`Added ${template.name}`);
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors font-medium shadow-xs"
                  >
                    + {template.name} ({template.freq})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Medication #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Medication Name *</label>
                      <input
                        type="text"
                        required
                        className="input text-xs py-1.5"
                        placeholder="e.g. Amoxicillin 500mg, Paracetamol 650mg"
                        value={item.medication_name}
                        onChange={(e) => handleItemChange(idx, 'medication_name', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Dosage</label>
                      <input
                        type="text"
                        className="input text-xs py-1.5"
                        placeholder="e.g. 1 Tablet, 5ml"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Frequency</label>
                      <input
                        type="text"
                        className="input text-xs py-1.5"
                        placeholder="e.g. 1-0-1, Once daily"
                        value={item.frequency}
                        onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Duration</label>
                      <input
                        type="text"
                        className="input text-xs py-1.5"
                        placeholder="e.g. 5 days"
                        value={item.duration}
                        onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Instructions</label>
                      <input
                        type="text"
                        className="input text-xs py-1.5"
                        placeholder="e.g. After food"
                        value={item.instructions}
                        onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        className="input text-xs py-1.5"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isFinalized && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} /> Prescription Amendment Mode
              </p>
              <p className="text-xs text-amber-800">
                This prescription is finalized. Any changes made now will record an immutable audit snapshot in the patient timeline rather than overwriting medical records silently.
              </p>
              <div>
                <label className="text-xs font-medium text-amber-900">Clinical Reason for Amendment *</label>
                <input
                  type="text"
                  className="input text-xs py-1.5 mt-1"
                  placeholder="e.g. Dosage adjusted due to patient feedback, added nasal spray"
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 p-4 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button type="button" onClick={onClose} className="btn-outline text-xs py-2">
            Close Workspace
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={handleSaveDraft}
              className="btn-outline text-xs py-2"
            >
              Save Draft
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalizeAndApprove}
              className="btn-primary text-xs py-2 flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              {isFinalized ? 'Approve & Save Amendment' : 'Approve & Sign Electronically'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
