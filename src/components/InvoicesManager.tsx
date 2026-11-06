import React, { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { A4InvoiceEditor } from "./A4InvoiceEditor";
import {
  Plus,
  FileText,
  Printer,
  Eye,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
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
}

interface InvoicesManagerProps {
  searchQuery?: string;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  searchQuery = "",
}) => {
  // Real database invoices state initialized empty (zero mock data)
  const [invoices] = useState<InvoiceRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "paid" | "pending" | "partial">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleOpen = () => {
    setIsClosing(false);
    setIsCreateOpen(true);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsCreateOpen(false);
      setIsClosing(false);
    }, 280);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCreateOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateOpen]);

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

  return (
    <div className="invoices-manager-wrapper">
      {/* 4 Overview Metric Boxes */}
      <div className="invoices-metrics-grid">
        {/* BOX 1 (FIRST): New Invoice Box */}
        <Card
          className="invoice-metric-box new-invoice-action-box"
          style={{ padding: "20px 24px" }}
          onClick={handleOpen}
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
                handleOpen();
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
            <Button variant="outline" size="sm" className="action-btn">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <span>Filter</span>
            </Button>
            <Button variant="outline" size="sm" className="action-btn">
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
                  <th>Total Amount</th>
                  <th>Paid / Due</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="clickable-row">
                    <td>
                      <span className="code-badge font-mono">{inv.invoiceNo}</span>
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
                        {formatCurrency(inv.totalAmount)}
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
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn"
                          title="Print Invoice"
                        >
                          <Printer className="h-3.5 w-3.5" />
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

      {/* Sliding Box Effect: Opens from Left Sidebar's Right Wall to the Right Content Wall */}
      {isCreateOpen && (
        <div
          className={`invoice-create-sliding-panel ${
            isClosing ? "panel-closing" : "panel-opening"
          }`}
        >
          <A4InvoiceEditor onClose={handleClose} />
        </div>
      )}
    </div>
  );
};
