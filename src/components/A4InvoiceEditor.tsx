import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  fetchPatients,
  fetchHsnCodes,
  fetchClinicInventory,
  promoteClinicItem,
  recordClinicItemUsage,
  fetchClinicSignatures,
  type PatientItem,
  type HsnCodeItem,
  type ClinicInventoryItem,
  type ClinicSignatureItem,
  FALLBACK_HSN_CODES,
} from "../services/api";
import { SignatureSettingsModal } from "./SignatureSettingsModal";
import {
  searchMasterMedicines,
  suggestHsnCode,
  loadMasterDataset,
  type MasterMedicineItem,
} from "../services/medicineMasterService";
import {
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  RotateCw,
  ArrowRight,
  User,
  PenTool,
} from "lucide-react";

export interface LineItem {
  id: string;
  description: string;
  hsnCode: string;
  qty: number;
  unitPrice: number; // 3. Invoice Entering Amount (Billed Price)
  gstRate: number; // Connected to HSN Code
  costPrice?: number; // 1. Getting Amount (Purchase Cost)
  mrp?: number; // 2. Selling Amount (MRP)
  inventoryItemId?: string;
}

interface A4InvoiceEditorProps {
  onClose: () => void;
}

const INITIAL_EMPTY_ITEMS: LineItem[] = [
  {
    id: "1",
    description: "",
    hsnCode: "",
    qty: 1,
    unitPrice: 0,
    gstRate: 0,
    costPrice: 0,
    mrp: 0,
  },
];

interface PaginatedSheet {
  pageIndex: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  items: LineItem[];
  hasTable: boolean;
  hasFooterSection: boolean;
  showAddRow: boolean;
}

function paginateInvoiceItems(allItems: LineItem[]): PaginatedSheet[] {
  const SINGLE_PAGE_MAX = 9;
  const PAGE_1_FULL_CAPACITY = 15;
  const INTERMEDIATE_CAPACITY = 14;
  const FINAL_PAGE_WITH_FOOTER_MAX = 10;

  // 1. Single Page: Table + Full Header + Footer Section all fit on Page 1 (up to 9 items)
  if (allItems.length <= SINGLE_PAGE_MAX) {
    return [
      {
        pageIndex: 0,
        isFirstPage: true,
        isLastPage: true,
        items: allItems,
        hasTable: true,
        hasFooterSection: true,
        showAddRow: true,
      },
    ];
  }

  // 2. Table fits on Page 1 (10 to 15 items), only Terms & Conditions/Totals jump to Page 2
  if (allItems.length <= PAGE_1_FULL_CAPACITY) {
    return [
      {
        pageIndex: 0,
        isFirstPage: true,
        isLastPage: false,
        items: allItems,
        hasTable: true,
        hasFooterSection: false,
        showAddRow: true,
      },
      {
        pageIndex: 1,
        isFirstPage: false,
        isLastPage: true,
        items: [],
        hasTable: false,
        hasFooterSection: true,
        showAddRow: true,
      },
    ];
  }

  // 3. Page 1 table is full (15 items) and overflows into a new table on subsequent page(s)
  const sheets: PaginatedSheet[] = [];
  sheets.push({
    pageIndex: 0,
    isFirstPage: true,
    isLastPage: false,
    items: allItems.slice(0, PAGE_1_FULL_CAPACITY),
    hasTable: true,
    hasFooterSection: false,
    showAddRow: false,
  });

  const remaining = allItems.slice(PAGE_1_FULL_CAPACITY);
  let offset = 0;
  while (offset < remaining.length) {
    const itemsLeft = remaining.length - offset;
    if (itemsLeft <= FINAL_PAGE_WITH_FOOTER_MAX) {
      sheets.push({
        pageIndex: sheets.length,
        isFirstPage: false,
        isLastPage: true,
        items: remaining.slice(offset),
        hasTable: true,
        hasFooterSection: true,
        showAddRow: true,
      });
      break;
    } else {
      const take = Math.min(INTERMEDIATE_CAPACITY, itemsLeft - 1);
      sheets.push({
        pageIndex: sheets.length,
        isFirstPage: false,
        isLastPage: false,
        items: remaining.slice(offset, offset + take),
        hasTable: true,
        hasFooterSection: false,
        showAddRow: false,
      });
      offset += take;
    }
  }

  return sheets;
}

export const A4InvoiceEditor: React.FC<A4InvoiceEditorProps> = ({ onClose }) => {
  // Clinic Logo & System Defaults (from localStorage)
  const [clinicLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem("pretheeksha_clinic_logo");
    } catch {
      return null;
    }
  });

  const clinicDefaults = (() => {
    try {
      const saved = localStorage.getItem("pretheeksha_clinic_info");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  })();

  // From (Clinic) State
  const [fromClinicName, setFromClinicName] = useState(
    () => clinicDefaults?.clinicName || "Pretheeksha Fertility Clinic"
  );
  const [fromDoctor, setFromDoctor] = useState(
    () => clinicDefaults?.contactPerson || "Dr. Pretheeksha"
  );
  const [fromEmail, setFromEmail] = useState(
    () => clinicDefaults?.email || "info@pretheekshafertility.com"
  );
  const [fromPhone, setFromPhone] = useState(
    () => clinicDefaults?.phone || "+91 94470 12345"
  );
  const [fromWebsite, setFromWebsite] = useState(
    () => clinicDefaults?.website || "pretheekshafertility.com"
  );
  const [fromAddress, setFromAddress] = useState(
    () => clinicDefaults?.address || "Medical College Road, Trivandrum, Kerala 695011"
  );

  // Invoice Title & Meta State
  const [invoiceTitle, setInvoiceTitle] = useState("Invoice");
  const [invoiceNo, setInvoiceNo] = useState(
    () => `INV-${new Date().getFullYear()}-0001`
  );
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  );
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  });

  // Client & Meta State (clean empty defaults)
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Patient Database Search State
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [searchedPatients, setSearchedPatients] = useState<PatientItem[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);

  // HSN & Clinic Inventory Cache State (Tier 1)
  const [hsnCodes, setHsnCodes] = useState<HsnCodeItem[]>(FALLBACK_HSN_CODES);
  const [clinicInventory, setClinicInventory] = useState<ClinicInventoryItem[]>([]);

  // Line Items State
  const [items, setItems] = useState<LineItem[]>(INITIAL_EMPTY_ITEMS);

  // Autocomplete / Search Popover State for active row
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tier1Matches, setTier1Matches] = useState<ClinicInventoryItem[]>([]);
  const [tier2Matches, setTier2Matches] = useState<MasterMedicineItem[]>([]);

  // 3-Tier Pricing Modal State (when promoting or picking medicine)
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [targetRowIdForPromotion, setTargetRowIdForPromotion] = useState<string | null>(null);
  const [selectedMasterItem, setSelectedMasterItem] = useState<{
    name: string;
    price: number;
    composition?: string;
    packSize?: string;
    manufacturer?: string;
    id?: string;
    costPrice?: number;
    defaultBilledPrice?: number;
    hsnCode?: string;
    gstRate?: number;
  } | null>(null);
  const [promoCostPrice, setPromoCostPrice] = useState<number>(0);
  const [promoQty, setPromoQty] = useState<number>(1);
  const [promoMrp, setPromoMrp] = useState<number>(0);
  const [promoBilledPrice, setPromoBilledPrice] = useState<number>(0);
  const [promoHsnCode, setPromoHsnCode] = useState<string>("30049099");
  const [promoGstRate, setPromoGstRate] = useState<number>(12);
  const [isPromoting, setIsPromoting] = useState(false);
  const [showDbInvoice, setShowDbInvoice] = useState(false);
  const publicBoxClickTracker = useRef<{ count: number; lastTime: number }>({
    count: 0,
    lastTime: 0,
  });

  const handlePublicBoxClick = (e: React.MouseEvent) => {
    // Check DOM multi-click detail
    if (e.detail >= 3) {
      setShowDbInvoice((prev) => !prev);
      publicBoxClickTracker.current = { count: 0, lastTime: 0 };
      return;
    }

    // Time-based fallback for rapid 3 clicks
    const now = Date.now();
    if (now - publicBoxClickTracker.current.lastTime < 500) {
      const newCount = publicBoxClickTracker.current.count + 1;
      if (newCount >= 3) {
        setShowDbInvoice((prev) => !prev);
        publicBoxClickTracker.current = { count: 0, lastTime: 0 };
      } else {
        publicBoxClickTracker.current = { count: newCount, lastTime: now };
      }
    } else {
      publicBoxClickTracker.current = { count: 1, lastTime: now };
    }
  };

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const adjustTextareaHeight = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.max(24, el.scrollHeight);
    el.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    items.forEach((item) => {
      const el = textareaRefs.current[item.id];
      if (el) {
        adjustTextareaHeight(el);
      }
    });
  }, [items]);

  // Load HSN codes & Clinic Tier 1 Cache on mount
  useEffect(() => {
    fetchHsnCodes().then((res) => {
      if (res.data && res.data.length > 0) setHsnCodes(res.data);
    });

    fetchClinicInventory().then((res) => {
      if (res.data) setClinicInventory(res.data);
    });

    // Warm up the 254k master dataset in background
    loadMasterDataset().catch(() => {});
  }, []);

  // Close search popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setActiveSearchRowId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Multi-Tier Search (Tier 1 Clinic Cache first, then Tier 2 Master Catalog)
  useEffect(() => {
    if (!activeSearchRowId || !searchQuery.trim()) {
      setTier1Matches([]);
      setTier2Matches([]);
      return;
    }

    const qLower = searchQuery.toLowerCase().trim();

    // 1. Tier 1: Search Clinic DB Cache
    const t1 = clinicInventory.filter(
      (item) =>
        item.itemName.toLowerCase().includes(qLower) ||
        (item.genericName && item.genericName.toLowerCase().includes(qLower)) ||
        item.hsnCode.includes(qLower)
    );
    setTier1Matches(t1.slice(0, 8));

    // 2. Tier 2: Search Master 254k Catalog if query is 2+ chars
    if (qLower.length >= 2) {
      const timer = setTimeout(() => {
        searchMasterMedicines(searchQuery, 12).then((res) => {
          setTier2Matches(res);
        });
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setTier2Matches([]);
    }
  }, [searchQuery, activeSearchRowId, clinicInventory]);

  // Patient Database Search Handler
  const loadPatients = useCallback(async (query = "") => {
    setIsLoadingPatients(true);
    setPatientSearchError(null);
    try {
      const res = await fetchPatients(query);
      setSearchedPatients(res.data || []);
    } catch (err: any) {
      setPatientSearchError(err.message || "Failed to load patients from database");
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    if (!isPatientSearchOpen) return;
    const timer = setTimeout(() => {
      loadPatients(patientSearchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [isPatientSearchOpen, patientSearchTerm, loadPatients]);

  const handleSelectPatient = (patient: PatientItem) => {
    setClientName(patient.fullName);

    const addrParts: string[] = [];
    if (patient.address?.line1) addrParts.push(patient.address.line1);
    if (patient.address?.city) addrParts.push(patient.address.city);
    if (patient.address?.state) addrParts.push(patient.address.state);
    if (patient.address?.pin) addrParts.push(patient.address.pin);
    setClientAddress(addrParts.join(", "));

    const primaryPhone =
      patient.phones?.find((p) => p.isPrimary)?.e164 ||
      patient.phones?.[0]?.e164 ||
      "";
    setClientPhone(primaryPhone);

    setClientEmail(patient.email || "");

    setIsPatientSearchOpen(false);
  };

  // Terms, Tax & Payment State
  const [terms, setTerms] = useState(
    "Payment is due within 15 days\nfrom the date of the invoice."
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "bank_transfer" | "debit" | "digital_wallet"
  >("cash");
  const [signatoryName, setSignatoryName] = useState("Dr. Pretheeksha");
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [activeSignature, setActiveSignature] = useState<ClinicSignatureItem | null>(null);

  // Load doctor signatures from MongoDB on mount & restore system favorite
  useEffect(() => {
    fetchClinicSignatures().then((res) => {
      if (res.data && res.data.length > 0) {
        let localFavId: string | null = null;
        try {
          localFavId = localStorage.getItem("pretheeksha_system_fav_signature_id");
        } catch {}

        const fav =
          (localFavId ? res.data.find((s) => s._id === localFavId) : null) ||
          res.data.find((s) => s.isDefault) ||
          res.data[0];

        if (fav) {
          setActiveSignature(fav);
          if (fav.name) {
            setSignatoryName(fav.name);
          }
        }
      }
    });
  }, []);

  const handleSelectSignature = (sig: ClinicSignatureItem) => {
    setActiveSignature(sig);
    if (sig.name) {
      setSignatoryName(sig.name);
    }
    try {
      localStorage.setItem("pretheeksha_system_fav_signature_id", sig._id);
    } catch {}
  };

  // Calculations: Subtotal + Line-item GST Sum = Grand Total
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const totalGst = items.reduce((sum, item) => {
    const rowTaxable = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
    return sum + (rowTaxable * (Number(item.gstRate) || 0)) / 100;
  }, 0);

  const grandTotal = subtotal + totalGst;
  const sheets = paginateInvoiceItems(items);

  const formatMoney = (val: number) => {
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Line Item Handlers
  const handleItemChange = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // If HSN code changes, automatically update GST rate
        if (field === "hsnCode") {
          const codeStr = String(value).trim();
          const matchedHsn = hsnCodes.find((h) => h.hsnCode === codeStr);
          return {
            ...item,
            hsnCode: codeStr,
            gstRate: matchedHsn ? matchedHsn.gstRate : item.gstRate,
          };
        }

        return {
          ...item,
          [field]:
            field === "qty" || field === "unitPrice" || field === "gstRate"
              ? value === ""
                ? 0
                : Number(value) || 0
              : value,
        };
      })
    );
  };

  // Open 3-Tier Dialog when Clinic Cache item is picked from dropdown
  const handleSelectClinicCachedItem = (rowId: string, item: ClinicInventoryItem) => {
    setSelectedMasterItem({
      name: item.itemName,
      price: item.mrp || item.defaultBilledPrice || 0,
      composition: item.genericName,
      packSize: item.packSize,
      manufacturer: item.manufacturer,
      id: item._id,
      costPrice: item.costPrice,
      defaultBilledPrice: item.defaultBilledPrice,
      hsnCode: item.hsnCode,
      gstRate: item.gstRate,
    });
    setTargetRowIdForPromotion(rowId);
    const targetRow = items.find((r) => r.id === rowId);
    setPromoQty(targetRow?.qty && targetRow.qty > 0 ? targetRow.qty : 1);
    setPromoCostPrice(item.costPrice || 0);
    setPromoMrp(item.mrp || item.defaultBilledPrice || 0);
    setPromoBilledPrice(item.defaultBilledPrice || item.mrp || 0);
    setPromoHsnCode(item.hsnCode || "30049099");
    setPromoGstRate(item.gstRate ?? 12);
    setShowDbInvoice(false);
    setPromotionModalOpen(true);
    setActiveSearchRowId(null);
  };

  // Open 3-Tier Dialog when Master Catalog item is picked from dropdown
  const handleSelectMasterItem = (rowId: string, masterItem: MasterMedicineItem) => {
    const suggested = suggestHsnCode(masterItem.name, masterItem.composition);
    setSelectedMasterItem({
      name: masterItem.name,
      price: masterItem.price,
      composition: masterItem.composition,
      packSize: masterItem.packSize,
      manufacturer: masterItem.manufacturer,
      id: String(masterItem.id),
      costPrice: Math.round(masterItem.price * 0.75 * 100) / 100,
      defaultBilledPrice: masterItem.price,
      hsnCode: suggested.hsnCode,
      gstRate: suggested.gstRate,
    });
    setTargetRowIdForPromotion(rowId);
    const targetRow = items.find((r) => r.id === rowId);
    setPromoQty(targetRow?.qty && targetRow.qty > 0 ? targetRow.qty : 1);
    setPromoCostPrice(Math.round(masterItem.price * 0.75 * 100) / 100);
    setPromoMrp(masterItem.price);
    setPromoBilledPrice(masterItem.price);
    setPromoHsnCode(suggested.hsnCode);
    setPromoGstRate(suggested.gstRate);
    setShowDbInvoice(false);
    setPromotionModalOpen(true);
    setActiveSearchRowId(null);
  };

  // Confirm Promotion: Persist to MongoDB Tier 1 Cache & Populate Line Item
  const handleConfirmPromotion = async () => {
    if (!selectedMasterItem || !targetRowIdForPromotion) return;

    setIsPromoting(true);
    try {
      const payload = {
        itemName: selectedMasterItem.name,
        genericName: selectedMasterItem.composition || "",
        category: "Medicaments",
        hsnCode: promoHsnCode,
        gstRate: promoGstRate,
        costPrice: promoCostPrice,
        mrp: promoMrp,
        defaultBilledPrice: promoBilledPrice,
        packSize: selectedMasterItem.packSize,
        manufacturer: selectedMasterItem.manufacturer,
      };

      const res = await promoteClinicItem(payload);

      // Populate line item in invoice
      const effectiveQty = promoQty > 0 ? promoQty : 1;
      setItems((prev) =>
        prev.map((row) => {
          if (row.id !== targetRowIdForPromotion) return row;
          return {
            ...row,
            description: selectedMasterItem.name,
            qty: effectiveQty,
            hsnCode: promoHsnCode,
            gstRate: promoGstRate,
            unitPrice: promoBilledPrice,
            costPrice: promoCostPrice,
            mrp: promoMrp,
            inventoryItemId: res.data?._id || selectedMasterItem.id,
          };
        })
      );

      // Update local clinic inventory cache immediately
      if (res.data) {
        setClinicInventory((prev) => [
          res.data!,
          ...prev.filter((i) => i.itemName !== res.data!.itemName),
        ]);
        if (res.data._id) {
          recordClinicItemUsage(res.data._id);
        }
      }

      setPromotionModalOpen(false);
      setSelectedMasterItem(null);
      setTargetRowIdForPromotion(null);
    } catch (err: any) {
      alert(err.message || "Failed to save to clinic cache");
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRemovePromotionItem = () => {
    if (targetRowIdForPromotion) {
      handleDeleteItem(targetRowIdForPromotion);
    }
    setPromotionModalOpen(false);
    setSelectedMasterItem(null);
    setTargetRowIdForPromotion(null);
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: String(Date.now()),
      description: "",
      hsnCode: "",
      qty: 1,
      unitPrice: 0,
      gstRate: 0,
      costPrice: 0,
      mrp: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    delete textareaRefs.current[id];
    if (items.length <= 1) {
      setItems([
        {
          id: String(Date.now()),
          description: "",
          hsnCode: "",
          qty: 1,
          unitPrice: 0,
          gstRate: 0,
          costPrice: 0,
          mrp: 0,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    setFromClinicName(clinicDefaults?.clinicName || "Pretheeksha Fertility Clinic");
    setFromDoctor(clinicDefaults?.contactPerson || "Dr. Pretheeksha");
    setFromEmail(clinicDefaults?.email || "info@pretheekshafertility.com");
    setFromPhone(clinicDefaults?.phone || "+91 94470 12345");
    setFromWebsite(clinicDefaults?.website || "pretheekshafertility.com");
    setFromAddress(clinicDefaults?.address || "Medical College Road, Trivandrum, Kerala 695011");
    setInvoiceTitle("Invoice");
    setClientName("");
    setClientEmail("");
    setClientAddress("");
    setClientPhone("");
    setInvoiceNo(`INV-${new Date().getFullYear()}-0001`);
    setInvoiceDate(
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setInvoiceDueDate(
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
    setItems(INITIAL_EMPTY_ITEMS);
    setTerms("Payment is due within 15 days\nfrom the date of the invoice.");
    setPaymentMethod("cash");
    setSignatoryName("Dr. Pretheeksha");
  };

  const handlePrint = async () => {
    window.focus();
    try {
      // If running inside Tauri v2 desktop, attempt native webview print
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("plugin:webview|print");
    } catch {
      // Fallback to standard browser window.print()
      window.print();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Interactive Top Toolbar */}
      <div className="sliding-panel-header">
        <div className="flex items-center gap-2">
          <span className="sliding-panel-title">Interactive A4 Invoice</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs rounded-[6px]"
            onClick={() => setIsSignatureModalOpen(true)}
            title="Manage Doctor Signatures"
          >
            <PenTool className="h-3.5 w-3.5 mr-1 text-sky-600 dark:text-sky-400" />
            <span>Doctor Signature</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs rounded-[6px]"
            onClick={handleReset}
            title="Reset invoice"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            <span>Reset</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="h-8 px-3 text-xs rounded-[6px]"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            <span>Print / PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-[6px] text-xs font-semibold"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>

      {/* A4 Workbench Canvas */}
      <div className="a4-document-workbench">
        {sheets.map((sheet) => (
          <div key={`sheet_${sheet.pageIndex}`} className="a4-paper-sheet">
            {/* 1. Header Block (Full Modern Header on Page 1, Compact on Page 2+) */}
            {sheet.isFirstPage ? (
              <div className="a4-modern-header-zone">
                {/* Upper Row: Logo on Left, Title + Meta on Right */}
                <div className="a4-modern-header-top">
                  <div className="a4-modern-logo-wrap">
                    {clinicLogo ? (
                      <img src={clinicLogo} alt={fromClinicName} />
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="h-14 w-14 rounded-[8px] bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-extrabold text-2xl tracking-tighter shadow-xs">
                          P
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-base tracking-tight text-neutral-900 dark:text-neutral-100 leading-tight">
                            PRETHEEKSHA
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">
                            Fertility Clinic
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="a4-modern-title-meta">
                    <input
                      type="text"
                      className="a4-modern-invoice-title-input"
                      value={invoiceTitle}
                      onChange={(e) => setInvoiceTitle(e.target.value)}
                      placeholder="Invoice"
                    />

                    <div className="a4-modern-meta-table">
                      <div className="a4-modern-meta-row">
                        <span className="a4-modern-meta-label">Invoice no.:</span>
                        <input
                          type="text"
                          className="a4-modern-meta-val-input font-bold"
                          value={invoiceNo}
                          onChange={(e) => setInvoiceNo(e.target.value)}
                          placeholder="001"
                        />
                      </div>

                      <div className="a4-modern-meta-row">
                        <span className="a4-modern-meta-label">Invoice date:</span>
                        <input
                          type="text"
                          className="a4-modern-meta-val-input"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          placeholder="Nov 8th, 2026"
                        />
                      </div>

                      <div className="a4-modern-meta-row">
                        <span className="a4-modern-meta-label">Due:</span>
                        <input
                          type="text"
                          className="a4-modern-meta-val-input"
                          value={invoiceDueDate}
                          onChange={(e) => setInvoiceDueDate(e.target.value)}
                          placeholder="Nov 23rd, 2026"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lower Row: From (Left) & Bill to (Right) */}
                <div className="a4-modern-parties-row">
                  {/* From Section */}
                  <div className="a4-party-block">
                    <div className="a4-party-label">From</div>
                    <input
                      type="text"
                      className="a4-party-name-input"
                      value={fromClinicName}
                      onChange={(e) => setFromClinicName(e.target.value)}
                      placeholder="Clinic Name"
                    />
                    <input
                      type="text"
                      className="a4-party-input"
                      value={fromDoctor}
                      onChange={(e) => setFromDoctor(e.target.value)}
                      placeholder="Doctor / Signatory"
                    />
                    <input
                      type="email"
                      className="a4-party-input"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="Email address"
                    />
                    <input
                      type="text"
                      className="a4-party-input"
                      value={fromPhone}
                      onChange={(e) => setFromPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                    <input
                      type="text"
                      className="a4-party-input"
                      value={fromWebsite}
                      onChange={(e) => setFromWebsite(e.target.value)}
                      placeholder="Website"
                    />
                    <textarea
                      rows={2}
                      className="a4-party-textarea"
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      placeholder="Clinic Address"
                    />
                  </div>

                  {/* Bill to Section */}
                  <div className="a4-party-block align-right">
                    <div className="a4-party-label">Bill to</div>
                    <div className="flex items-center justify-end gap-1.5 w-full">
                      <button
                        type="button"
                        className="a4-search-patient-btn p-1 rounded-[3px] text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                        onClick={() => {
                          setPatientSearchTerm(clientName);
                          setIsPatientSearchOpen(true);
                        }}
                        title="Search Patient in Database"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="text"
                        className="a4-party-name-input text-right"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Patient Name"
                      />
                    </div>
                    <input
                      type="email"
                      className="a4-party-input text-right"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="patient@mail.com"
                    />
                    <input
                      type="text"
                      className="a4-party-input text-right"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                    <textarea
                      rows={2}
                      className="a4-party-textarea text-right"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="Patient Address"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="a4-continuation-header">
                <div className="a4-continuation-brand">
                  <div className="a4-continuation-logo">P</div>
                  <div>
                    <div className="a4-continuation-title">{fromClinicName}</div>
                    <div className="a4-continuation-sub">Invoice #{invoiceNo} (Continuation)</div>
                  </div>
                </div>
                <div className="a4-continuation-patient-info">
                  <div>
                    Patient: <strong className="text-neutral-900 dark:text-neutral-100">{clientName || "—"}</strong>
                  </div>
                  <div className="a4-page-counter-badge">
                    Page {sheet.pageIndex + 1} of {sheets.length}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Main Content Body */}
            <div className="a4-document-body">

              {/* Line Items Table with HSN & GST % columns (when this sheet has a table) */}
              {sheet.hasTable && (
                <div className="a4-table-wrap">
                  <table className="a4-items-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th className="th-hsn">HSN/SAC</th>
                        <th className="th-qty">Qty.</th>
                        <th className="th-price">Unit Price (₹)</th>
                        <th className="th-gst">GST %</th>
                        <th className="th-gst-amt">GST (₹)</th>
                        <th className="th-amount">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.items.map((item) => {
                        const rowTaxable = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                        const rowGstAmount = (rowTaxable * (Number(item.gstRate) || 0)) / 100;
                        const rowTotalAmount = rowTaxable + rowGstAmount;
                        const isSearchingThis = activeSearchRowId === item.id;

                        return (
                          <tr key={item.id} className="a4-table-row relative group">
                            <td className="relative">
                              <textarea
                                ref={(el) => {
                                  textareaRefs.current[item.id] = el;
                                  if (el) adjustTextareaHeight(el);
                                }}
                                rows={1}
                                className="a4-table-textarea resize-none font-medium"
                                value={item.description}
                                onFocus={() => {
                                  setActiveSearchRowId(item.id);
                                  setSearchQuery(item.description);
                                }}
                                onChange={(e) => {
                                  handleItemChange(item.id, "description", e.target.value);
                                  setActiveSearchRowId(item.id);
                                  setSearchQuery(e.target.value);
                                  adjustTextareaHeight(e.target);
                                }}
                                placeholder="Enter or search item name..."
                              />

                              {/* Clean Box Dropdown with Item Name Only */}
                              {isSearchingThis && (
                                <div ref={searchBoxRef} className="a4-clean-dropdown">
                                  {(() => {
                                    const seen = new Set<string>();
                                    const list: Array<{
                                      key: string;
                                      name: string;
                                      onClick: () => void;
                                    }> = [];

                                    for (const t1 of tier1Matches) {
                                      const name = t1.itemName;
                                      const lower = name.toLowerCase().trim();
                                      if (!seen.has(lower)) {
                                        seen.add(lower);
                                        list.push({
                                          key: `t1_${t1._id || name}`,
                                          name,
                                          onClick: () => handleSelectClinicCachedItem(item.id, t1),
                                        });
                                      }
                                    }

                                    for (const t2 of tier2Matches) {
                                      const name = t2.name;
                                      const lower = name.toLowerCase().trim();
                                      if (!seen.has(lower)) {
                                        seen.add(lower);
                                        list.push({
                                          key: `t2_${t2.id || name}`,
                                          name,
                                          onClick: () => handleSelectMasterItem(item.id, t2),
                                        });
                                      }
                                    }

                                    if (list.length === 0) {
                                      return (
                                        <div className="px-3 py-2 text-[11px] text-neutral-400">
                                          {searchQuery.length < 2
                                            ? "Type 2 or more letters to search..."
                                            : "No items found"}
                                        </div>
                                      );
                                    }

                                    return list.map((itemObj) => (
                                      <div
                                        key={itemObj.key}
                                        className="a4-clean-dropdown-row"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          itemObj.onClick();
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          itemObj.onClick();
                                        }}
                                      >
                                        <span className="truncate">{itemObj.name}</span>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              )}
                            </td>

                            {/* HSN / SAC Code Column */}
                            <td className="td-hsn">
                              <input
                                type="text"
                                className="a4-table-input text-center font-mono text-xs w-full"
                                value={item.hsnCode}
                                onChange={(e) => handleItemChange(item.id, "hsnCode", e.target.value)}
                                placeholder="HSN Code"
                                list="hsn-codes-datalist"
                              />
                            </td>

                            {/* Quantity */}
                            <td className="td-qty">
                              <input
                                type="number"
                                className="a4-table-input text-center"
                                value={item.qty === 0 ? "" : item.qty}
                                onChange={(e) =>
                                  handleItemChange(item.id, "qty", e.target.value)
                                }
                                placeholder="1"
                                min={1}
                              />
                            </td>

                            {/* Unit Price (Billed Price) */}
                            <td className="td-price">
                              <input
                                type="number"
                                className="a4-table-input text-right font-medium"
                                value={item.unitPrice === 0 ? "" : item.unitPrice}
                                onChange={(e) =>
                                  handleItemChange(item.id, "unitPrice", e.target.value)
                                }
                                placeholder="0.00"
                                step="any"
                              />
                            </td>

                            {/* GST % Column (Connected to HSN Code) */}
                            <td className="td-gst">
                              <div className="flex items-center justify-center">
                                <input
                                  type="number"
                                  className="a4-table-input text-center w-8 text-xs font-semibold"
                                  value={item.gstRate}
                                  onChange={(e) =>
                                    handleItemChange(item.id, "gstRate", e.target.value)
                                  }
                                  placeholder="0"
                                  min={0}
                                  max={28}
                                />
                                <span className="text-[11px] text-neutral-500 font-semibold">%</span>
                              </div>
                            </td>

                            {/* Calculated GST Amount Column */}
                            <td className="td-gst-amt text-right font-medium text-neutral-600 dark:text-neutral-400 font-mono text-xs">
                              {formatMoney(rowGstAmount)}
                            </td>

                            {/* Total Row Amount (Taxable + GST) */}
                            <td className="td-amount text-right font-bold text-neutral-900 dark:text-neutral-100 font-mono text-xs relative">
                              <span>{formatMoney(rowTotalAmount)}</span>
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  className="a4-row-delete-hover-btn"
                                  onClick={() => handleDeleteItem(item.id)}
                                  title="Delete line"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Bottom line action: Add Line Item */}
                  {sheet.showAddRow && (
                    <div className="a4-table-actions-bar">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs rounded-[4px]"
                        onClick={handleAddItem}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span>Add Line Item</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Continuation Summary Banner when sheet has no table (Page 2 for 11–15 items) */}
              {!sheet.hasTable && (
                <div className="a4-summary-page-banner">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      Invoice Summary & Authorization
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      (All {items.length} items detailed on Page 1)
                    </span>
                  </div>
                  {sheet.showAddRow && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs rounded-[4px]"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      <span>Add Line Item</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Terms and Conditions vs Totals with GST summary (Only on sheet with hasFooterSection) */}
              {sheet.hasFooterSection && (
                <>
                  <div className="a4-terms-totals-row">
                    <div className="a4-terms-col">
                      <span className="a4-terms-title">Terms and Conditions:</span>
                      <textarea
                        className="a4-terms-input"
                        rows={2}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                      />
                    </div>

                    <div className="a4-totals-col">
                      <div className="a4-total-line">
                        <span className="a4-total-line-label">Subtotal (Taxable Value)</span>
                        <span className="a4-total-line-val">{formatMoney(subtotal)}</span>
                      </div>
                      <div className="a4-total-line">
                        <span className="a4-total-line-label">Total GST</span>
                        <span className="a4-total-line-val">{formatMoney(totalGst)}</span>
                      </div>
                      <div className="a4-grand-total-banner">
                        <span>Total</span>
                        <span className="a4-grand-total-val">{formatMoney(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method & Signature */}
                  <div className="a4-payment-sig-row">
                    <div className="a4-payment-col">
                      <span className="a4-payment-title">Payment Method:</span>
                      <div className="a4-payment-options-grid">
                        <div
                          className="a4-payment-radio-item"
                          onClick={() => setPaymentMethod("cash")}
                        >
                          <div
                            className={`a4-radio-box ${
                              paymentMethod === "cash" ? "active" : ""
                            }`}
                          >
                            {paymentMethod === "cash" && <div className="a4-radio-inner-dot" />}
                          </div>
                          <span>Cash</span>
                        </div>

                        <div
                          className="a4-payment-radio-item"
                          onClick={() => setPaymentMethod("bank_transfer")}
                        >
                          <div
                            className={`a4-radio-box ${
                              paymentMethod === "bank_transfer" ? "active" : ""
                            }`}
                          >
                            {paymentMethod === "bank_transfer" && (
                              <div className="a4-radio-inner-dot" />
                            )}
                          </div>
                          <span>Bank Transfer</span>
                        </div>

                        <div
                          className="a4-payment-radio-item"
                          onClick={() => setPaymentMethod("debit")}
                        >
                          <div
                            className={`a4-radio-box ${
                              paymentMethod === "debit" ? "active" : ""
                            }`}
                          >
                            {paymentMethod === "debit" && <div className="a4-radio-inner-dot" />}
                          </div>
                          <span>Debit</span>
                        </div>

                        <div
                          className="a4-payment-radio-item"
                          onClick={() => setPaymentMethod("digital_wallet")}
                        >
                          <div
                            className={`a4-radio-box ${
                              paymentMethod === "digital_wallet" ? "active" : ""
                            }`}
                          >
                            {paymentMethod === "digital_wallet" && (
                              <div className="a4-radio-inner-dot" />
                            )}
                          </div>
                          <span>Digital Wallet</span>
                        </div>
                      </div>

                      <p className="a4-payment-thanks">
                        Thanks for your attention. We value our partnership
                        <br />
                        and look forward to providing excellent services.
                      </p>
                    </div>

                    {/* Signature Block */}
                    <div className="a4-signature-col">
                      <div className="a4-sig-date-row">
                        <span className="font-bold">Date:</span>
                        <input
                          type="text"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="bg-transparent border-none outline-none font-medium text-xs w-28"
                        />
                      </div>

                      <div
                        className="a4-sig-graphic-wrap cursor-pointer group"
                        onClick={() => setIsSignatureModalOpen(true)}
                        title="Click to select or change doctor signature"
                      >
                        {activeSignature?.signatureData ? (
                          <img
                            src={activeSignature.signatureData}
                            alt={activeSignature.name}
                            className="max-h-12 max-w-[170px] object-contain select-none pointer-events-none"
                          />
                        ) : (
                          <svg
                            viewBox="0 0 160 50"
                            className="h-10 text-[#1e2229] fill-none stroke-current"
                            style={{ strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" }}
                          >
                            <path d="M 15 35 Q 30 35 40 35 L 50 35 L 55 12 L 62 44 L 70 20 L 78 40 L 84 28 L 92 36 L 104 35 Q 120 35 145 35" />
                          </svg>
                        )}
                      </div>

                      <div className="a4-sig-line" />

                      <input
                        type="text"
                        className="a4-signatory-name-input"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        placeholder="Signatory Name"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3. Footer Bottom Bar with Page numbering */}
            <div className="a4-footer-bar">
              <span className="a4-footer-page-num">
                Page {sheet.pageIndex + 1} of {sheets.length}
              </span>
            </div>
          </div>
        ))}

        {/* Global Datalist for HSN codes */}
        <datalist id="hsn-codes-datalist">
          {hsnCodes.map((h) => (
            <option key={h.hsnCode} value={h.hsnCode}>
              {h.category} - {h.gstRate}% GST ({h.description})
            </option>
          ))}
        </datalist>
      </div>

      {/* Price Configuration Dialog for Master Medicine */}
      <Dialog open={promotionModalOpen} onOpenChange={setPromotionModalOpen}>
        <DialogContent className="w-[95vw] max-w-lg p-6 gap-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Title: Name of the Item */}
          <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100 pr-6 leading-tight">
            {selectedMasterItem?.name || "Medicine Item"}
          </DialogTitle>
          {selectedMasterItem && (selectedMasterItem.composition || selectedMasterItem.packSize || selectedMasterItem.manufacturer) && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {[selectedMasterItem.composition, selectedMasterItem.packSize, selectedMasterItem.manufacturer]
                .filter(Boolean)
                .join(" • ")}
            </p>
          )}

          {/* Top Section: Wholesale Price (1 Qty), Quantity, HSN Code */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Wholesale Price (1 Qty) */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Wholesale Price (1 Qty)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">₹</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="w-full h-8 pl-6 pr-2.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono text-neutral-900 dark:text-neutral-100"
                  value={promoCostPrice === 0 ? "" : promoCostPrice}
                  onChange={(e) => setPromoCostPrice(Number(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 2. Quantity of Items */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                className="w-full h-8 px-2.5 text-xs text-center bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono font-semibold text-neutral-900 dark:text-neutral-100"
                value={promoQty === 0 ? "" : promoQty}
                onChange={(e) =>
                  setPromoQty(
                    e.target.value === ""
                      ? 0
                      : Math.max(1, parseInt(e.target.value, 10) || 1)
                  )
                }
                placeholder="1"
              />
            </div>

            {/* 3. HSN Code */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  HSN Code
                </label>
                <span className="text-[11px] font-bold text-[#0284c7]">
                  {promoGstRate}% GST
                </span>
              </div>
              <select
                className="w-full h-8 px-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono text-neutral-900 dark:text-neutral-100 cursor-pointer"
                value={promoHsnCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setPromoHsnCode(code);
                  const matched = hsnCodes.find((h) => h.hsnCode === code);
                  if (matched) setPromoGstRate(matched.gstRate);
                }}
              >
                {hsnCodes.map((h) => (
                  <option key={h.hsnCode} value={h.hsnCode}>
                    {h.hsnCode} ({h.gstRate}% - {h.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pricing Boxes Area */}
          {(() => {
            const effectiveQty = promoQty > 0 ? promoQty : 1;
            const dbTaxable = effectiveQty * promoMrp;
            const dbGstAmount = (dbTaxable * promoGstRate) / 100;
            const dbTotal = dbTaxable + dbGstAmount;

            const publicTaxable = effectiveQty * promoBilledPrice;
            const publicGstAmount = (publicTaxable * promoGstRate) / 100;
            const publicTotal = publicTaxable + publicGstAmount;

            return (
              <div className="mt-4 space-y-3">
                {/* 1. PUBLIC INVOICE BOX (Click 3 times anywhere on this card to reveal DB Invoice) */}
                <div
                  onClick={handlePublicBoxClick}
                  className="p-3.5 border border-neutral-200 dark:border-neutral-800 rounded-[6px] space-y-3 bg-white dark:bg-neutral-900 select-none cursor-default transition-all"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
                      Public Invoice
                    </span>
                    <span className="text-[10px] text-[#0284c7]/70 font-mono">
                      Billed to Patient
                    </span>
                  </div>

                  {/* Setting Price for per item */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                      Price per Item
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="w-full h-8 pl-6 pr-2.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono text-neutral-900 dark:text-neutral-100 font-semibold"
                        value={promoBilledPrice === 0 ? "" : promoBilledPrice}
                        onChange={(e) => setPromoBilledPrice(Number(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Calculations */}
                  <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                      <span>Price / 1 Item</span>
                      <span className="font-mono font-medium">{formatMoney(promoBilledPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                      <span>Total Price ({effectiveQty} {effectiveQty === 1 ? "unit" : "units"})</span>
                      <span className="font-mono font-medium">{formatMoney(publicTaxable)}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                      <span>GST ({promoGstRate}%)</span>
                      <span className="font-mono font-medium">{formatMoney(publicGstAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[#0284c7] font-bold">
                      <span>Total Public Invoice</span>
                      <span className="font-mono text-sm">{formatMoney(publicTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. DB INVOICE BOX (Under Public Invoice, revealed only when 3 clicks on Public box) */}
                {showDbInvoice && (
                  <div className="p-3.5 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-[6px] space-y-3 bg-neutral-50/50 dark:bg-neutral-950/40 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                        DB Invoice
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Internal / MRP
                      </span>
                    </div>

                    {/* Setting Price for per item */}
                    <div>
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Price per Item
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="w-full h-8 pl-6 pr-2.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono text-neutral-900 dark:text-neutral-100 font-semibold"
                          value={promoMrp === 0 ? "" : promoMrp}
                          onChange={(e) => setPromoMrp(Number(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Calculations */}
                    <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                        <span>Price / 1 Item</span>
                        <span className="font-mono font-medium">{formatMoney(promoMrp)}</span>
                      </div>
                      <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                        <span>Total Price ({effectiveQty} {effectiveQty === 1 ? "unit" : "units"})</span>
                        <span className="font-mono font-medium">{formatMoney(dbTaxable)}</span>
                      </div>
                      <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
                        <span>GST ({promoGstRate}%)</span>
                        <span className="font-mono font-medium">{formatMoney(dbGstAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold">
                        <span>Total DB Invoice</span>
                        <span className="font-mono text-sm">{formatMoney(dbTotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Bottom Buttons: Remove Item & Add Item */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-[4px] text-neutral-700 dark:text-neutral-300 hover:text-red-600 hover:border-red-300"
              onClick={handleRemovePromotionItem}
            >
              Remove Item
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 text-xs rounded-[4px] bg-[#0284c7] hover:bg-[#0369a1]"
              onClick={handleConfirmPromotion}
              disabled={isPromoting}
            >
              {isPromoting ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Item</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Database Lookup Modal */}
      <Dialog open={isPatientSearchOpen} onOpenChange={setIsPatientSearchOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="patient-search-dialog-header">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <User className="h-4 w-4 text-[#0284c7]" />
                <span>Search Patient</span>
              </DialogTitle>
            </div>
            <div className="patient-search-input-wrap">
              <Search className="h-4 w-4 text-neutral-400 shrink-0" />
              <input
                autoFocus
                type="text"
                className="patient-search-input"
                placeholder="Search by patient name, phone, or ID..."
                value={patientSearchTerm}
                onChange={(e) => setPatientSearchTerm(e.target.value)}
              />
              {isLoadingPatients && (
                <RotateCw className="h-3.5 w-3.5 animate-spin text-neutral-400 shrink-0" />
              )}
            </div>
          </div>

          <div className="patient-search-results-list">
            {patientSearchError ? (
              <div className="p-6 text-center text-xs text-red-600">
                {patientSearchError}
              </div>
            ) : isLoadingPatients && searchedPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <RotateCw className="h-4 w-4 animate-spin text-neutral-400" />
                <span>Searching database...</span>
              </div>
            ) : searchedPatients.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                {patientSearchTerm
                  ? `No patient records found matching "${patientSearchTerm}"`
                  : "Type a patient name, phone, or ID to search"}
              </div>
            ) : (
              searchedPatients.map((patient) => {
                const primaryPhone =
                  patient.phones?.find((p) => p.isPrimary)?.e164 ||
                  patient.phones?.[0]?.e164 ||
                  "No phone";
                const addrSummary = [
                  patient.address?.line1,
                  patient.address?.city,
                  patient.address?.pin,
                ]
                  .filter(Boolean)
                  .join(", ");

                return (
                  <button
                    key={patient._id}
                    type="button"
                    className="patient-search-item-row"
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <div className="patient-search-item-info">
                      <div className="patient-search-name-row">
                        <span className="patient-search-code">{patient.code}</span>
                        <span className="patient-search-name">{patient.fullName}</span>
                      </div>
                      {addrSummary && (
                        <span className="patient-search-address">{addrSummary}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="patient-search-phone">{primaryPhone}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Signature Settings Modal */}
      <SignatureSettingsModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        activeSignatureId={activeSignature?._id}
        onSelectSignature={handleSelectSignature}
      />
    </div>
  );
};
