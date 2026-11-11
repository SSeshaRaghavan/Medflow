import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Loader2,
  Smartphone,
  Wallet,
  Calendar,
  Clock,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { appointmentApi, doctorApi } from '../../api';
import ThemeToggle from '../../components/ThemeToggle';

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const appointmentId = searchParams.get('appointment_id');
  const doctorId = searchParams.get('doctor_id');
  const dateParam = searchParams.get('date');
  const slotParam = searchParams.get('slot') || '10:00 AM';

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('482');
  const [cardName, setCardName] = useState('Alex Chen');
  const [upiId, setUpiId] = useState('alex.chen@okaxis');

  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);

  const consultationFee = Number(doctorInfo?.doctor_profile?.consultation_fee) || 500.00;
  const platformFee = 15.00;
  const doctorCommission = consultationFee * 0.10;
  const doctorNet = consultationFee - doctorCommission;
  const totalAmount = consultationFee + platformFee;

  useEffect(() => {
    if (doctorId) {
      doctorApi.listPublic({ id: doctorId })
        .then(({ data }) => {
          const list = data.results || data;
          if (list && list.length > 0) setDoctorInfo(list[0]);
        })
        .catch(() => {});
    }
  }, [doctorId]);

  const handlePay = async (e) => {
    e.preventDefault();
    try {
      setProcessing(true);
      await new Promise((res) => setTimeout(res, 1200));

      const { data } = await appointmentApi.processPayment({
        appointment_id: appointmentId || undefined,
        doctor_id: doctorId || undefined,
        amount: totalAmount,
        payment_method: paymentMethod,
      });

      setReceiptData({
        transaction_id: data.transaction_id,
        amount: totalAmount,
        method: paymentMethod,
        timestamp: new Date().toLocaleString(),
        appointment_id: appointmentId,
        date: dateParam || new Date().toISOString().split('T')[0],
        slot: slotParam,
      });
      setPaymentSuccess(true);
      toast.success('Consultation payment verified and processed!');
    } catch {
      toast.error('Payment authorization failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to="/patient" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <ArrowLeft size={16} /> Return to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              <Lock size={12} /> 256-Bit SSL Secured
            </div>
          </div>
        </div>

        {paymentSuccess ? (
          <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 mx-auto mb-6 shadow-inner">
              <CheckCircle2 size={44} />
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              Payment Confirmed!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Your consultation booking fee has been processed. A digital invoice and receipt has been logged in your patient account.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 text-left border border-slate-200/80 dark:border-slate-700/80 mb-6 space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{receiptData?.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Scheduled Date:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{receiptData?.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Time Slot:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{receiptData?.slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Paid:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{receiptData?.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate('/patient')}
                className="btn-primary flex-1 py-3"
              >
                Go to My Consultations
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Consultation Payment Gateway
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Choose your preferred payment method to finalize clinical ticket reservation.
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                  }`}
                >
                  <CreditCard className="mx-auto mb-1.5" size={20} />
                  <span className="text-xs block">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                  }`}
                >
                  <Smartphone className="mx-auto mb-1.5" size={20} />
                  <span className="text-xs block">UPI / Instant</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3.5 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'wallet'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium'
                  }`}
                >
                  <Wallet className="mx-auto mb-1.5" size={20} />
                  <span className="text-xs block">Apple / GPay</span>
                </button>
              </div>

              <form onSubmit={handlePay} className="space-y-4">
                {paymentMethod === 'card' && (
                  <>
                    <div>
                      <label className="label">Name on Card</label>
                      <input
                        type="text"
                        required
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="input"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="label">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="input pr-10 font-mono"
                          placeholder="4532 0000 0000 0000"
                        />
                        <CreditCard size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Expiry Date</label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="input text-center font-mono"
                          placeholder="MM/YY"
                        />
                      </div>

                      <div>
                        <label className="label">CVV / CVC</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="input text-center font-mono"
                          placeholder="•••"
                        />
                      </div>
                    </div>
                  </>
                )}

                {paymentMethod === 'upi' && (
                  <div>
                    <label className="label">Virtual Payment Address (UPI ID)</label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="input"
                      placeholder="username@bank"
                    />
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Supported: Google Pay, PhonePe, Paytm, BHIM UPI
                    </p>
                  </div>
                )}

                {paymentMethod === 'wallet' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Express one-touch biometric verification enabled for your device.
                    </p>
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <Lock size={14} className="text-emerald-500" /> Apple Pay & Google Wallet Ready
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing}
                  className="btn-primary w-full py-3.5 text-sm font-bold tracking-wide mt-6 shadow-xl shadow-blue-500/20"
                >
                  {processing ? <Loader2 size={18} className="animate-spin" /> : null}
                  {processing ? 'Authorizing Payment…' : `Pay ₹${totalAmount.toFixed(2)} & Confirm Ticket`}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" /> Cancellation policy: 50% refund up to 1h prior
                </span>
                <span>PCI-DSS Level 1</span>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Transparent Consultation Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standardized pricing with ₹15 platform convenience fee
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {doctorInfo?.full_name || 'Dr. Medical Specialist'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doctorInfo?.doctor_profile?.specialty || 'General Practitioner'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Calendar size={13} className="text-blue-500" />
                    <span>{dateParam || 'Today'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Clock size={13} className="text-blue-500" />
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{slotParam}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Specialist Consultation Fee</span>
                  <span className="font-semibold">₹{consultationFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Platform Convenience Fee</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">₹{platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Doctor Net Share (90%)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">₹{doctorNet.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Verified SHA-256 Digital Rx</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Included</span>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-extrabold text-slate-900 dark:text-white">
                  <span>Total Payable Amount</span>
                  <span className="text-xl text-blue-600 dark:text-blue-400">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

