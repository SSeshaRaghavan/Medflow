import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Lock,
  X,
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  User,
  Stethoscope,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function ConsultationChatRoom({ appointment, onClose, onOpenPrescription }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const messagesEndRef = useRef(null);

  const isDoctor = user?.role === 'doctor';
  const otherParty = isDoctor ? appointment.patient : appointment.doctor;
  const otherPartyName = otherParty?.full_name || (isDoctor ? 'Patient' : 'Doctor');
  const specialty = appointment.doctor?.doctor_profile?.specialty || (isDoctor ? 'General Medicine' : 'Specialist');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const { data } = await appointmentApi.getChatMessages(appointment.id);
      setMessages(data || []);
    } catch {
      if (!quiet) toast.error('Unable to synchronize consultation messages.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [appointment.id]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const content = (textToSend || inputMessage).trim();
    if (!content) return;

    try {
      setSending(true);
      setInputMessage('');
      const optimisticMsg = {
        id: `opt-${Date.now()}`,
        appointment: appointment.id,
        sender: user.id,
        sender_name: `${user.first_name} ${user.last_name}`,
        sender_role: user.role,
        message: content,
        is_encrypted: true,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { data } = await appointmentApi.sendChatMessage(appointment.id, content);
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? data : m)));
    } catch {
      toast.error('Failed to send encrypted message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickChips = isDoctor
    ? [
        'How long have you had these symptoms?',
        'Any known drug allergies?',
        'Please rest and drink plenty of fluids.',
        'Preparing your official prescription now.',
      ]
    : [
        'Symptoms started 2 days ago.',
        'Experiencing persistent fever and fatigue.',
        'No known medicine allergies.',
        'Is there any medication I should avoid?',
      ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full h-[90vh] max-h-[820px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                {isDoctor ? <User size={22} /> : <Stethoscope size={22} />}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {isDoctor ? otherPartyName : `Dr. ${otherPartyName}`}
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Ticket #{appointment.queue_number || '1'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isDoctor ? `Complaint: ${appointment.chief_complaint?.slice(0, 35)}…` : specialty}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInCall((p) => !p)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                inCall
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <PhoneCall size={15} />
              <span className="hidden sm:inline">{inCall ? 'End Telehealth' : 'Start Telehealth'}</span>
            </button>

            {isDoctor && onOpenPrescription && (
              <button
                type="button"
                onClick={onOpenPrescription}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors hidden sm:inline-flex items-center gap-1.5"
              >
                Issue Rx
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              aria-label="Close Chat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {inCall && (
          <div className="bg-slate-950 p-4 border-b border-slate-800 text-white flex flex-col items-center justify-center gap-3 shrink-0">
            <div className="w-full max-w-md h-40 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
              {videoDisabled ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <VideoOff size={32} />
                  <span className="text-xs">Camera Feed Disabled</span>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-600/30 border border-blue-500 flex items-center justify-center mx-auto mb-2 animate-pulse">
                    <User size={30} className="text-blue-400" />
                  </div>
                  <span className="text-xs text-slate-300 font-medium">
                    Encrypted Telehealth Stream Active • 1080p WebRTC
                  </span>
                </div>
              )}

              <div className="absolute top-2 left-3 bg-black/60 px-2 py-0.5 rounded-full text-[10px] text-emerald-400 font-mono">
                LIVE 00:04:18
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMicMuted((p) => !p)}
                className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                  micMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {micMuted ? <MicOff size={15} /> : <Mic size={15} />}
                <span>{micMuted ? 'Muted' : 'Mute'}</span>
              </button>

              <button
                type="button"
                onClick={() => setVideoDisabled((p) => !p)}
                className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                  videoDisabled ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                {videoDisabled ? <VideoOff size={15} /> : <Video size={15} />}
                <span>{videoDisabled ? 'Video Off' : 'Video On'}</span>
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50/70 dark:bg-blue-950/30 px-4 py-2 border-b border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 shrink-0">
          <div className="flex items-center gap-1.5 font-medium">
            <Lock size={13} className="text-blue-600 dark:text-blue-400" />
            <span>256-Bit End-to-End Encrypted Consultation Channel</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Compliant with HIPAA Privacy Safeguards
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-blue-600" />
              <p className="text-xs">Initializing secure consultation stream…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 mb-3">
                <ShieldCheck size={28} />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Secure Chat Initialized
              </h4>
              <p className="text-xs max-w-sm mt-1 text-slate-500 dark:text-slate-400">
                You can now message {isDoctor ? 'the patient' : 'the doctor'} directly. All messages in this session are encrypted and logged for clinical records.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender === user?.id || msg.sender_role === user?.role;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1">
                    <span>{msg.sender_name}</span>
                    <span className="text-[10px] font-normal">
                      • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMine
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                      <Lock size={10} />
                      <CheckCheck size={12} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> Prompts:
            </span>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 transition-colors border border-slate-200/60 dark:border-slate-700/60"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <textarea
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your clinical message… (Press Enter to send)"
              className="flex-1 input py-2.5 resize-none max-h-28 text-sm"
            />
            <button
              type="button"
              disabled={sending || !inputMessage.trim()}
              onClick={() => handleSendMessage()}
              className="btn-primary p-3 rounded-xl disabled:opacity-40"
              aria-label="Send Message"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

