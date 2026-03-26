import { create } from 'zustand';
import * as fmApi from '../api/client';
import { genId } from '../utils/helpers';

/**
 * Billing Store — invoices, payments, modals.
 * Fetches from API, no localStorage.
 */
export const useBillingStore = create((set, get) => ({
  // ── State ──
  invoices: [],
  invoiceModal: null,        // leadId when creating
  invAmount: '',
  invItems: '',
  invVat: '19',
  invDeposit: '',
  paymentModal: null,        // { leadId, amount, currency }
  payAmount: '500',
  payCurrency: 'EUR',
  magicLinks: {},
  auditLog: [],
  loading: false,
  error: null,

  // ── Actions ──
  setInvoices: (invoices) => set(typeof invoices === 'function' ? (s) => ({ invoices: invoices(s.invoices) }) : { invoices }),
  setInvoiceModal: (invoiceModal) => set({ invoiceModal }),
  setInvAmount: (invAmount) => set({ invAmount }),
  setInvItems: (invItems) => set({ invItems }),
  setInvVat: (invVat) => set({ invVat }),
  setInvDeposit: (invDeposit) => set({ invDeposit }),
  setPaymentModal: (paymentModal) => set({ paymentModal }),
  setPayAmount: (payAmount) => set({ payAmount }),
  setPayCurrency: (payCurrency) => set({ payCurrency }),
  setMagicLinks: (magicLinks) => set(typeof magicLinks === 'function' ? (s) => ({ magicLinks: magicLinks(s.magicLinks) }) : { magicLinks }),
  setAuditLog: (auditLog) => set(typeof auditLog === 'function' ? (s) => ({ auditLog: auditLog(s.auditLog) }) : { auditLog }),

  /**
   * Fetch invoices from API.
   */
  fetchInvoices: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await fmApi.getInvoices(params);
      set({ invoices: data.invoices || data, loading: false });
      return data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  /**
   * Create an invoice (optimistic + API).
   */
  createInvoice: (leadId, items, totalNet, vatPct, lead, clinic) => {
    if (!lead) return null;
    const vatAmount = Math.round(totalNet * vatPct / 100);
    const totalGross = totalNet + vatAmount;
    const yr = new Date().getFullYear();
    const existing = get().invoices.filter((i) => i.nr?.startsWith(`INV-${yr}`));
    const nr = `INV-${yr}-${String(existing.length + 1).padStart(4, '0')}`;
    const inv = {
      id: genId(), nr, clinicId: clinic?.id,
      leadId, patientName: lead.name, patientEmail: lead.email,
      treatment: lead.treatment, items,
      net: totalNet, vatPct, vatAmount, gross: totalGross,
      currency: 'EUR', status: 'unpaid',
      created: new Date().toISOString(),
      clinicName: clinic?.name || '', clinicAddress: clinic?.address || '',
      clinicEmail: clinic?.clinicEmail || '', clinicPhone: clinic?.phone || '',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      payments: [],
    };
    set((s) => ({ invoices: [inv, ...s.invoices] }));
    // API call (non-blocking)
    fmApi.createCrmInvoice(inv).catch(e => { console.error("[store] API sync failed:", e.message || e); });
    return inv;
  },

  /**
   * Mark invoice as paid.
   */
  markInvoicePaid: (invId, method) => {
    set((s) => ({
      invoices: s.invoices.map((i) =>
        i.id === invId
          ? {
              ...i, status: 'paid', paidDate: new Date().toISOString(),
              paidMethod: method || 'cash',
              payments: [...i.payments, { amount: i.gross, date: new Date().toISOString(), method: method || 'cash' }],
            }
          : i
      ),
    }));
    fmApi.updateInvoice(invId, { status: 'paid', paidMethod: method || 'cash' }).catch(e => { console.error("[store] API sync failed:", e.message || e); });
  },

  /**
   * Add audit log entry.
   */
  logAction: (action, target, details, user, clinicId) => {
    const entry = {
      id: genId(),
      time: new Date().toISOString(),
      user: user?.name || 'System',
      role: user?.role || 'system',
      clinicId,
      action, target, details,
    };
    set((s) => ({ auditLog: [entry, ...s.auditLog].slice(0, 500) }));
  },
}));
