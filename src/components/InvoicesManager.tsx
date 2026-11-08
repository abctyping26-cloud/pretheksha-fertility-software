import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { A4InvoiceEditor } from "./A4InvoiceEditor";
import { fetchInvoices, deleteInvoice } from "../services/api";
import {
  Plus,
  FileText,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";

interface InvoiceRingChartProps {
  completed: number;
  inProgress: number;
  size?: number;
  strokeWidth?: number;
}

const InvoiceRingChart: React.FC<InvoiceRingChartProps> = ({
  completed,
  inProgress,
  size = 72,
  strokeWidth = 7,
}) => {
  const total = completed + inProgress;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const inProgressRatio = total > 0 ? inProgress / total : 0;
  const completedRatio = total > 0 ? completed / total : 0;

  const inProgressDash = inProgressRatio * circumference;
  const completedDash = completedRatio * circumference;

  const percentCompleted = total > 0 ? Math.round(completedRatio * 100) : 0;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Paid: ${completed}, Pending: ${inProgress}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-neutral-100 dark:text-neutral-800"
          strokeWidth={strokeWidth}
        />

        {/* Completed segment (Primary / Monochrome Black / White) */}
        {completed > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-neutral-900 dark:text-neutral-100 transition-all duration-500 ease-out"
            strokeWidth={strokeWidth}
            strokeDasharray={`${completedDash} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="butt"
          />
        )}

        {/* In Progress segment (Muted Neutral) */}
        {inProgress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-neutral-400 dark:text-neutral-600 transition-all duration-500 ease-out"
            strokeWidth={strokeWidth}
            strokeDasharray={`${inProgressDash} ${circumference}`}
            strokeDashoffset={-completedDash}
            strokeLinecap="butt"
          />
        )}
      </svg>
      {/* Center percentage indicator */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[12px] font-bold text-neutral-900 dark:text-neutral-100 leading-none">
          {percentCompleted}%
        </span>
      </div>
    </div>
  );
};

export interface InvoiceRecord {
  id: string;
  invoiceNo: string;
  patientName: string;
  patientId: string;
  service: string;
  date: string;
  time: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "paid" | "pending" | "partial";
  publicAmount: number;
  dbAmount: number;
  raw?: any;
}

interface InvoicesManagerProps {
  searchQuery?: string;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  searchQuery = "",
}) => {
  // Real database invoices state persisted and queried from MongoDB
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [showPublicAmount, setShowPublicAmount] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    invoice: InvoiceRecord | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    invoice: null,
  });

  const loadInvoices = useCallback(async () => {
    try {
      const res = await fetchInvoices();
      if (res.data) {
        const mapped: InvoiceRecord[] = res.data.map((inv: any) => {
          const publicAmount = Number(
            inv.financialSummary?.publicTotal ??
            inv.financialSummary?.grossAmount ??
            inv.financialSummary?.total ??
            0
          );
          const dbAmount = Number(
            inv.financialSummary?.dbTotal ??
            inv.financialSummary?.grossAmount ??
            inv.financialSummary?.total ??
            0
          );
          return {
            id: inv.id || inv._id,
            invoiceNo: inv.invoiceNo || "INV",
            patientName: inv.customer?.name || "Unnamed",
            patientId: inv.customer?.code || inv.customer?.mobile || "—",
            service: inv.lineItems?.[0]?.description || "Consultation / Procedure",
            date: inv.invoiceDate || new Date().toISOString().split("T")[0],
            time: inv.invoiceTime || "—",
            totalAmount: dbAmount,
            publicAmount,
            dbAmount,
            paidAmount: Number(inv.financialSummary?.paid || 0),
            dueAmount: Number(inv.financialSummary?.balance || 0),
            status: inv.status || "paid",
            raw: inv,
          };
        });
        setInvoices(mapped);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const [activeFilter, setActiveFilter] = useState<"all" | "paid" | "pending" | "partial">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const formatInvoiceNumber = (no: string): string => {
    if (!no) return "0000";
    const match = no.match(/\d+$/);
    if (match) {
      const digits = match[0];
      return digits.length >= 4 ? digits.slice(-4) : digits.padStart(4, "0");
    }
    return no.length >= 4 ? no.slice(-4) : no;
  };

  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setIsClosing(false);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (inv: InvoiceRecord) => {
    setEditingInvoice(inv.raw || inv);
    setIsClosing(false);
    setIsCreateOpen(true);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsCreateOpen(false);
      setIsClosing(false);
      setEditingInvoice(null);
    }, 280);
  };

  const handleRowContextMenu = (e: React.MouseEvent, inv: InvoiceRecord) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 170;
    const menuHeight = 110;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({
      visible: true,
      x,
      y,
      invoice: inv,
    });
  };

  const handleDeleteInvoice = async (inv: InvoiceRecord) => {
    const shortNo = formatInvoiceNumber(inv.invoiceNo);
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete invoice #${shortNo} (${inv.patientName})?\n\nThis will remove the invoice record from the database.`
    );
    if (!confirmed) return;

    try {
      await deleteInvoice(inv.id);
      await loadInvoices();
    } catch (err: any) {
      alert(err.message || "Failed to delete invoice from database");
    }
  };

  useEffect(() => {
    const handleCloseMenu = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, invoice: null });
      }
    };
    window.addEventListener("click", handleCloseMenu);
    window.addEventListener("scroll", handleCloseMenu, true);
    return () => {
      window.removeEventListener("click", handleCloseMenu);
      window.removeEventListener("scroll", handleCloseMenu, true);
    };
  }, [contextMenu.visible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextMenu.visible) {
          setContextMenu({ visible: false, x: 0, y: 0, invoice: null });
        } else if (isCreateOpen) {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen, contextMenu.visible]);

  const totalInvoicesCount = invoices.length;
  const paidCount = invoices.filter((inv) => inv.status === "paid").length;
  const partialCount = invoices.filter((inv) => inv.status === "partial").length;
  const pendingCount = invoices.filter((inv) => inv.status === "pending").length;

  const todayCount = 0;
  const todayPaid = 0;
  const todayPending = 0;

  const settledCount = paidCount;
  const dueCount = invoices.filter((inv) => inv.dueAmount > 0).length;

  const monthIncome = invoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
  const weekIncome = 0;
  const dayIncome = 0;
  const paymentDuesTotal = invoices.reduce((acc, inv) => acc + (inv.dueAmount || 0), 0);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      const matchesFilter =
        activeFilter === "all" ? true : item.status === activeFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.invoiceNo.toLowerCase().includes(q) ||
        item.patientName.toLowerCase().includes(q) ||
        item.patientId.toLowerCase().includes(q) ||
        item.service.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [invoices, activeFilter, searchQuery]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExportPdf = () => {
    if (filteredInvoices.length === 0) {
      alert("No invoice records to export.");
      return;
    }

    // Determine clinic defaults from localStorage or fallbacks
    let clinicName = "Pretheeksha Fertility Clinic";
    let clinicPhone = "+91 94470 12345";
    let clinicAddress = "Medical College Road, Trivandrum, Kerala 695011";
    let clinicLogo: string | null = null;
    try {
      const savedInfo = localStorage.getItem("pretheeksha_clinic_info");
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        if (parsed.clinicName) clinicName = parsed.clinicName;
        if (parsed.phone) clinicPhone = parsed.phone;
        if (parsed.address) clinicAddress = parsed.address;
      }
      clinicLogo = localStorage.getItem("pretheeksha_clinic_logo");
    } catch {}

    const grandTotal = filteredInvoices.reduce((acc, inv) => {
      const amt = showPublicAmount
        ? (inv.publicAmount ?? inv.totalAmount)
        : (inv.dbAmount ?? inv.totalAmount);
      return acc + amt;
    }, 0);

    const modeLabel = showPublicAmount
      ? "Public Patient Billing"
      : "Internal DB / MRP Register";
    const modeBadgeBg = showPublicAmount ? "#0284c7" : "#374151";

    const rowsHtml = filteredInvoices
      .map((inv, idx) => {
        const amt = showPublicAmount
          ? (inv.publicAmount ?? inv.totalAmount)
          : (inv.dbAmount ?? inv.totalAmount);
        const shortNo = formatInvoiceNumber(inv.invoiceNo);
        const statusBadgeStyle =
          inv.status === "paid"
            ? "background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0;"
            : inv.status === "partial"
            ? "background: #fffbeb; color: #92400e; border: 1px solid #fde68a;"
            : "background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;";
        const statusText = inv.status.toUpperCase();

        return `
          <tr style="border-bottom: 1px solid #e5e7eb; ${idx % 2 === 1 ? "background: #fcfcfd;" : ""}">
            <td style="padding: 6px 8px; text-align: center; color: #6b7280; font-size: 11px;">${idx + 1}</td>
            <td style="padding: 6px 8px; font-family: monospace; font-weight: 600; font-size: 11px;">${shortNo}</td>
            <td style="padding: 6px 8px; font-size: 11px; white-space: nowrap;">${inv.date}</td>
            <td style="padding: 6px 8px; font-size: 11px;">
              <div style="font-weight: 600; color: #111827;">${inv.patientName}</div>
              <div style="font-size: 10px; color: #6b7280;">${inv.patientId}</div>
            </td>
            <td style="padding: 6px 8px; font-size: 11px; color: #374151;">${inv.service}</td>
            <td style="padding: 6px 8px; text-align: center;">
              <span style="display: inline-block; padding: 2px 6px; font-size: 9px; font-weight: 700; border-radius: 3px; ${statusBadgeStyle}">${statusText}</span>
            </td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 11px; font-weight: 600; color: #111827;">
              ${formatCurrency(amt)}
            </td>
          </tr>
        `;
      })
      .join("");

    const reportDate = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice Register - ${modeLabel}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 2px solid #111827;
            margin-bottom: 14px;
          }
          .clinic-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .clinic-logo {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .clinic-title {
            font-size: 15px;
            font-weight: 800;
            color: #111827;
            letter-spacing: -0.02em;
          }
          .clinic-meta {
            font-size: 10px;
            color: #6b7280;
            margin-top: 2px;
            line-height: 1.35;
          }
          .report-right {
            text-align: right;
          }
          .report-title {
            font-size: 14px;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .report-badge {
            display: inline-block;
            margin-top: 4px;
            padding: 2px 7px;
            background: ${modeBadgeBg};
            color: #ffffff;
            font-size: 9px;
            font-weight: 700;
            border-radius: 3px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .report-timestamp {
            font-size: 10px;
            color: #6b7280;
            margin-top: 4px;
          }
          .filter-indicator {
            font-size: 10px;
            font-weight: 600;
            color: #374151;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          thead th {
            background: #f9fafb;
            color: #374151;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 7px 8px;
            border-top: 1px solid #e5e7eb;
            border-bottom: 2px solid #111827;
          }
          tbody tr {
            page-break-inside: avoid;
          }
          tfoot td {
            padding: 8px 8px;
            border-top: 2px solid #111827;
            border-bottom: 2px solid #111827;
            background: #f9fafb;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="clinic-left">
            ${
              clinicLogo
                ? `<img src="${clinicLogo}" class="clinic-logo" alt="Logo" />`
                : ""
            }
            <div>
              <div class="clinic-title">${clinicName}</div>
              <div class="clinic-meta">
                ${clinicAddress}<br />
                Phone: ${clinicPhone}
              </div>
            </div>
          </div>
          <div class="report-right">
            <div class="report-title">Invoice Register</div>
            <div class="report-badge">${modeLabel}</div>
            <div class="report-timestamp">Generated: ${reportDate}</div>
            <div class="filter-indicator">Filter: ${activeFilter.toUpperCase()} (${filteredInvoices.length} Invoices)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">#</th>
              <th style="width: 60px; text-align: left;">Inv #</th>
              <th style="width: 80px; text-align: left;">Date</th>
              <th style="text-align: left;">Patient</th>
              <th style="text-align: left;">Treatment / Service</th>
              <th style="width: 68px; text-align: center;">Status</th>
              <th style="width: 105px; text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">
                Total (${filteredInvoices.length} Invoices)
              </td>
              <td colspan="2" style="text-align: right; font-size: 10px; color: #6b7280; font-weight: 600;">
                Grand Total:
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 12px; font-weight: 800; color: #111827;">
                ${formatCurrency(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 1500);
    }, 250);
  };

  return (
    <div className="invoices-manager-wrapper">
      {/* 4 Overview Metric Boxes */}
      <div className="invoices-metrics-grid">
        {/* BOX 1 (FIRST): New Invoice Box */}
        <Card
          className="invoice-metric-box new-invoice-action-box"
          style={{ padding: "20px 24px" }}
          onClick={handleOpenCreate}
        >
          <div className="metric-box-top-row">
            <div className="new-invoice-icon-frame">
              <Plus className="h-4 w-4" />
            </div>
            <Badge
              variant="secondary"
              className="metric-box-tag"
            >
              Action
            </Badge>
          </div>

          <div className="metric-box-center-content">
            <span className="new-invoice-title">New Invoice</span>
          </div>

          <div className="metric-box-bottom-row">
            <Button
              variant="default"
              size="sm"
              className="new-invoice-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreate();
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span>Create Invoice</span>
            </Button>
          </div>
        </Card>

        {/* BOX 2: Today's Invoices (Left-Aligned Big Number like Admin Website Overview Section) */}
        <Card
          className="invoice-metric-box"
          style={{ padding: "20px 24px" }}
        >
          <div className="metric-box-top-row">
            <span className="metric-box-label">Today&apos;s Invoices</span>
            <Badge
              variant="outline"
              className="metric-box-tag"
            >
              Today
            </Badge>
          </div>

          <div className="metric-box-center-split">
            <div className="metric-box-left-content">
              <div className="metric-big-number">{todayCount}</div>
              <div className="metric-sub-pills">
                <div className="metric-pill">
                  <span className="metric-pill-dot solid" />
                  <span className="metric-pill-label">Paid:</span>
                  <span className="metric-pill-val">{todayPaid}</span>
                </div>
                <div className="metric-pill">
                  <span className="metric-pill-dot muted" />
                  <span className="metric-pill-label">Pending:</span>
                  <span className="metric-pill-val">{todayPending}</span>
                </div>
              </div>
            </div>

            <div className="metric-box-right-chart">
              <InvoiceRingChart completed={todayPaid} inProgress={todayPending} size={72} strokeWidth={7} />
            </div>
          </div>
        </Card>

        {/* BOX 3: Total Invoices */}
        <Card
          className="invoice-metric-box"
          style={{ padding: "20px 24px" }}
        >
          <div className="metric-box-top-row">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-neutral-500" />
              <span className="metric-box-label">Total Invoices</span>
            </div>
            <Badge
              variant="outline"
              className="metric-box-tag"
            >
              All Time
            </Badge>
          </div>

          <div className="metric-box-center-content">
            <div className="metric-big-number">{totalInvoicesCount}</div>
            <div className="metric-sub-pills">
              <div className="metric-pill">
                <span className="metric-pill-dot solid" />
                <span className="metric-pill-label">Settled:</span>
                <span className="metric-pill-val">{settledCount}</span>
              </div>
              <div className="metric-pill">
                <span className="metric-pill-dot muted" />
                <span className="metric-pill-label">Due:</span>
                <span className="metric-pill-val">{dueCount}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* BOX 4: Financial Summary (4-Item List: Month, Week, Day, Payment Dues) */}
        <Card
          className="invoice-metric-box"
          style={{ padding: "20px 24px" }}
        >
          <div className="metric-box-top-row">
            <span className="metric-box-label">Financial Summary</span>
            <Badge
              variant="outline"
              className="metric-box-tag"
            >
              INR
            </Badge>
          </div>

          <div className="financial-summary-list">
            <div className="financial-list-item">
              <span className="financial-item-label">Total Income of Month</span>
              <span className="financial-item-val">{formatCurrency(monthIncome)}</span>
            </div>
            <div className="financial-list-item">
              <span className="financial-item-label">Total Income of Week</span>
              <span className="financial-item-val">{formatCurrency(weekIncome)}</span>
            </div>
            <div className="financial-list-item">
              <span className="financial-item-label">Total Income of Day</span>
              <span className="financial-item-val">{formatCurrency(dayIncome)}</span>
            </div>
            <div className="financial-list-item financial-dues-item">
              <span className="financial-item-label font-semibold">Payment Dues Total</span>
              <span className="financial-item-val font-bold">{formatCurrency(paymentDuesTotal)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Invoice List Controls & Table Section */}
      <div className="invoices-list-section">
        {/* Table Action Bar */}
        <div className="invoices-action-bar">
          <div className="invoices-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All Invoices
              <span className="filter-count">{totalInvoicesCount}</span>
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === "paid" ? "active" : ""}`}
              onClick={() => setActiveFilter("paid")}
            >
              Paid
              <span className="filter-count">{paidCount}</span>
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === "partial" ? "active" : ""}`}
              onClick={() => setActiveFilter("partial")}
            >
              Partial
              <span className="filter-count">{partialCount}</span>
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === "pending" ? "active" : ""}`}
              onClick={() => setActiveFilter("pending")}
            >
              Pending
              <span className="filter-count">{pendingCount}</span>
            </button>
          </div>

          <div className="invoices-action-buttons">
            <Button
              variant="outline"
              size="sm"
              className="action-btn select-none cursor-pointer"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPublicAmount((prev) => !prev);
              }}
              title="Filter (Double-click to toggle Public / DB Amount mode)"
            >
              <Filter className="h-3.5 w-3.5 mr-1" />
              <span>Filter</span>
              {showPublicAmount && (
                <Badge
                  variant="default"
                  className="ml-1.5 px-1 py-0 h-4 min-w-4 text-[10px] font-bold leading-none bg-sky-600 text-white hover:bg-sky-600 rounded-[3px] flex items-center justify-center shadow-xs"
                >
                  P
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="action-btn select-none cursor-pointer"
              onClick={handleExportPdf}
              title={`Export A4 PDF summary list (${showPublicAmount ? "Public Total" : "DB Total"})`}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Invoices Table Container */}
        <div className="invoices-table-container">
          {filteredInvoices.length === 0 ? (
            <div className="table-empty-state">
              <div className="empty-title">No invoice records found</div>
            </div>
          ) : (
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Patient</th>
                  <th>Treatment / Service</th>
                  <th>Date &amp; Time</th>
                  <th>
                    Total Amount
                    {showPublicAmount && (
                      <span className="text-[10px] text-sky-600 font-bold ml-1">
                        (P)
                      </span>
                    )}
                  </th>
                  <th>Paid / Due</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="clickable-row select-none"
                    onContextMenu={(e) => handleRowContextMenu(e, inv)}
                    onDoubleClick={() => handleOpenEdit(inv)}
                  >
                    <td>
                      <span className="code-badge font-mono" title={inv.invoiceNo}>
                        {formatInvoiceNumber(inv.invoiceNo)}
                      </span>
                    </td>
                    <td>
                      <div className="patient-name-cell">
                        <span className="patient-name">{inv.patientName}</span>
                        <span className="patient-id-sub">{inv.patientId}</span>
                      </div>
                    </td>
                    <td>
                      <span className="service-name-text">{inv.service}</span>
                    </td>
                    <td>
                      <div className="date-time-cell">
                        <span className="date-text">{inv.date}</span>
                        <span className="time-sub">{inv.time}</span>
                      </div>
                    </td>
                    <td>
                      <span className="amount-total-text font-mono">
                        {formatCurrency(
                          showPublicAmount
                            ? (inv.publicAmount ?? inv.totalAmount)
                            : (inv.dbAmount ?? inv.totalAmount)
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="paid-due-cell font-mono">
                        <span className="paid-val">{formatCurrency(inv.paidAmount)}</span>
                        {inv.dueAmount > 0 && (
                          <span className="due-val">/ Due: {formatCurrency(inv.dueAmount)}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {inv.status === "paid" && (
                        <Badge variant="default" className="status-badge paid">
                          Paid
                        </Badge>
                      )}
                      {inv.status === "partial" && (
                        <Badge variant="secondary" className="status-badge partial">
                          Partial
                        </Badge>
                      )}
                      {inv.status === "pending" && (
                        <Badge variant="outline" className="status-badge pending">
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="Edit Invoice"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(inv);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn hover:text-red-500 hover:border-red-300"
                          title="Delete Invoice"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInvoice(inv);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Table Footer with Pagination Information */}
          <div className="invoices-table-footer">
            <span className="footer-count-text">
              Showing 0 to {filteredInvoices.length} of {totalInvoicesCount} records
            </span>
            <div className="footer-pagination-nav">
              <Button variant="outline" size="sm" className="pagination-nav-btn" disabled>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                <span>Previous</span>
              </Button>
              <Button variant="outline" size="sm" className="pagination-nav-btn" disabled>
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right-Click Context Menu for Edit & Delete */}
      {contextMenu.visible && contextMenu.invoice && (
        <div
          className="fixed z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[6px] shadow-xl py-1 w-44 text-xs select-none"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-mono text-neutral-400">
            Invoice #{formatInvoiceNumber(contextMenu.invoice.invoiceNo)}
          </div>
          <button
            type="button"
            className="w-full flex items-center px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors text-left"
            onClick={() => {
              const target = contextMenu.invoice!;
              setContextMenu({ visible: false, x: 0, y: 0, invoice: null });
              handleOpenEdit(target);
            }}
          >
            <Edit2 className="h-3.5 w-3.5 mr-2 text-neutral-500" />
            <span className="font-medium">Edit Invoice</span>
          </button>
          <div className="my-0.5 border-t border-neutral-100 dark:border-neutral-800" />
          <button
            type="button"
            className="w-full flex items-center px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors text-left"
            onClick={() => {
              const target = contextMenu.invoice!;
              setContextMenu({ visible: false, x: 0, y: 0, invoice: null });
              handleDeleteInvoice(target);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2 text-red-500" />
            <span className="font-medium">Delete Invoice</span>
          </button>
        </div>
      )}

      {/* Sliding Box Effect: Opens from Left Sidebar's Right Wall to the Right Content Wall */}
      {isCreateOpen && (
        <div
          className={`invoice-create-sliding-panel ${
            isClosing ? "panel-closing" : "panel-opening"
          }`}
        >
          <A4InvoiceEditor
            editingInvoice={editingInvoice}
            onClose={handleClose}
            onSaved={loadInvoices}
          />
        </div>
      )}
    </div>
  );
};
