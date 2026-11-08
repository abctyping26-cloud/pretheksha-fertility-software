/**
 * Central API Client for Pretheeksha Fertility Software Desktop Client
 */

export const getApiBaseUrl = (): string => {
  // Uses configured VITE_API_URL or connects directly to the live central backend server
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "https://abc-server-s6rb.onrender.com";
};

export const API_BASE_URL = getApiBaseUrl();

export interface PatientSpouse {
  id: string;
  code: string;
  fullName: string;
  role: string;
  phone?: string;
}

export interface PatientItem {
  _id: string;
  code: string;
  fullName: string;
  dateOfBirth: string;
  sex: "female" | "male" | "intersex" | "unspecified";
  bloodGroup?: string;
  phones: Array<{ e164: string; isPrimary: boolean; label?: string }>;
  email?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pin?: string;
  };
  allergies?: string[];
  medicalHistory?: string;
  protocol?: string;
  coupleCode?: string | null;
  spouse?: PatientSpouse | null;
  files?: Array<{
    _id: string;
    originalName: string;
    sizeBytes: number;
    mimeType: string;
    category?: string;
    uploadedAt?: string;
  }>;
  createdAt: string;
}

export interface PatientsListResponse {
  status: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: PatientItem[];
}

export interface RegisterPayload {
  mode: "single" | "couple";
  linkToPatientId?: string;
  singlePatient?: {
    fullName: string;
    dateOfBirth: string;
    sex: "female" | "male";
    phone: string;
    bloodGroup?: string;
    email?: string;
    address?: { line1?: string; city?: string; pin?: string };
    allergies?: string[];
    medicalHistory?: string;
  };
  wifeData?: {
    fullName: string;
    dateOfBirth: string;
    phone: string;
    bloodGroup?: string;
    email?: string;
    address?: { line1?: string; city?: string; pin?: string };
    allergies?: string[];
    medicalHistory?: string;
  };
  husbandData?: {
    fullName: string;
    dateOfBirth: string;
    phone?: string;
    bloodGroup?: string;
    email?: string;
    address?: { line1?: string; city?: string; pin?: string };
    allergies?: string[];
    medicalHistory?: string;
  };
  confirmNotDuplicate?: boolean;
}

export interface DuplicatePhoneMatch {
  code: string;
  fullName: string;
  phone: string;
  dateOfBirth: string;
}

/**
 * Fetch patient records with optional search query
 */
export async function fetchPatients(query = "", page = 1, limit = 50): Promise<PatientsListResponse> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("page", String(page));
  params.set("limit", String(limit));

  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/patients?${params.toString()}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Failed to fetch patients");
  }

  return json;
}

/**
 * Register a single patient or couple atomically with double-click idempotency protection
 */
export async function registerPatient(
  payload: RegisterPayload,
  idempotencyKey?: string
): Promise<{ status: string; data?: any; code?: string; matches?: DuplicatePhoneMatch[]; message?: string }> {
  const key = idempotencyKey || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `reg-${Date.now()}`);

  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/patients/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (res.status === 409 && json.code === "POTENTIAL_DUPLICATE_PHONE") {
    return {
      status: "fail",
      code: "POTENTIAL_DUPLICATE_PHONE",
      message: json.message,
      matches: json.matches,
    };
  }

  if (!res.ok) {
    throw new Error(json.message || "Registration failed");
  }

  return json;
}

/**
 * Update patient clinical info (blood group, protocol, allergies, medical history)
 */
export async function updatePatientClinicalInfo(
  id: string,
  updates: {
    bloodGroup?: string;
    protocol?: string;
    allergies?: string[];
    medicalHistory?: string;
  }
): Promise<{ status: string; data?: PatientItem; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/patients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Failed to update clinical profile");
  }

  return json;
}

/**
 * Fetch a single patient by ID or Crockford code with spouse details
 */
export async function fetchPatientById(idOrCode: string): Promise<{ status: string; data?: PatientItem; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/patients/${encodeURIComponent(idOrCode)}`);
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Failed to fetch patient details");
  }

  return json;
}

/**
 * Link two existing registered patients as an active couple
 */
export async function linkPatientsAsCouple(
  patientId1: string,
  patientId2: string
): Promise<{ status: string; data?: any; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/patients/link-partner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ patientId1, patientId2 }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Failed to link partners");
  }

  return json;
}

/**
 * Delete patient record by ID or Crockford code
 */
export async function deletePatient(idOrCode: string): Promise<{ status: string; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/patients/${encodeURIComponent(idOrCode)}`, {
    method: "DELETE",
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Failed to delete patient record");
  }

  return json;
}

// ---------------------------------------------------------------------------
// HSN & CLINIC INVENTORY MULTI-TIER CACHE APIS
// ---------------------------------------------------------------------------

export interface HsnCodeItem {
  _id?: string;
  hsnCode: string;
  category: string;
  description: string;
  gstRate: number;
}

export interface ClinicInventoryItem {
  _id?: string;
  itemName: string;
  searchName?: string;
  genericName?: string;
  category: string;
  hsnCode: string;
  gstRate: number;
  costPrice: number; // 1. Getting Amount (Purchase Cost)
  mrp: number; // 2. Selling Amount (MRP)
  defaultBilledPrice: number; // 3. Invoice Entering Amount (Billed Price)
  packSize?: string;
  manufacturer?: string;
  usageCount?: number;
  lastUsedAt?: string;
  source?: "seed" | "promoted_from_master" | "manual";
}

export const FALLBACK_HSN_CODES: HsnCodeItem[] = [
  { hsnCode: "30043110", category: "Medicaments", description: "Insulin injections and related fertility management formulations", gstRate: 5 },
  { hsnCode: "30043200", category: "Medicaments", description: "Medicaments containing corticosteroid hormones or their derivatives", gstRate: 12 },
  { hsnCode: "30043912", category: "Medicaments", description: "Gonadotrophins or LH-FSH stimulation injections (Gonal-F Menopur Cetrotide)", gstRate: 12 },
  { hsnCode: "30043919", category: "Medicaments", description: "Other hormones like Progesterone and Estrogen formulations or IVF triggers", gstRate: 12 },
  { hsnCode: "30049099", category: "Medicaments", description: "General oral fertility tablets and vitamins (Clomiphene / Clomid / Letrozole)", gstRate: 12 },
  { hsnCode: "30066010", category: "Contraceptives", description: "Chemical contraceptive preparations based on hormones (for down-regulation cycles)", gstRate: 0 },
  { hsnCode: "38221900", category: "Lab Consumables", description: "IVF Culture Media and diagnostic reagents used to grow embryos in the lab", gstRate: 18 },
  { hsnCode: "90189029", category: "Surgical Equipment", description: "Oocyte retrieval needles and embryo transfer catheters", gstRate: 12 },
  { hsnCode: "90189044", category: "Surgical Equipment", description: "Endosurgery equipment and laparoscopy specialized surgical instruments", gstRate: 12 },
  { hsnCode: "90181200", category: "Medical Equipment", description: "Ultrasound scanning apparatus used for follicular monitoring", gstRate: 12 },
];

export const FALLBACK_CLINIC_ITEMS: ClinicInventoryItem[] = [
  {
    _id: "seed_1",
    itemName: "Gonal-F 450 IU / 0.75 ml Pen",
    genericName: "Follitropin alfa (r-hFSH)",
    category: "Medicaments",
    hsnCode: "30043912",
    gstRate: 12,
    costPrice: 8500,
    mrp: 10200,
    defaultBilledPrice: 9500,
    packSize: "1 Pre-filled Pen",
    manufacturer: "Merck Specialities",
    usageCount: 15,
  },
  {
    _id: "seed_2",
    itemName: "Menopur 75 IU Injection",
    genericName: "Menotrophin (Highly Purified HMG)",
    category: "Medicaments",
    hsnCode: "30043912",
    gstRate: 12,
    costPrice: 1200,
    mrp: 1550,
    defaultBilledPrice: 1400,
    packSize: "1 Vial + Solvent",
    manufacturer: "Ferring",
    usageCount: 12,
  },
  {
    _id: "seed_3",
    itemName: "Cetrotide 0.25 mg Injection",
    genericName: "Cetrorelix acetate",
    category: "Medicaments",
    hsnCode: "30043912",
    gstRate: 12,
    costPrice: 2100,
    mrp: 2600,
    defaultBilledPrice: 2400,
    packSize: "1 Vial + Syringe",
    manufacturer: "Merck Serono",
    usageCount: 10,
  },
  {
    _id: "seed_4",
    itemName: "Susten 200 mg Capsule",
    genericName: "Natural Micronised Progesterone",
    category: "Medicaments",
    hsnCode: "30043919",
    gstRate: 12,
    costPrice: 420,
    mrp: 580,
    defaultBilledPrice: 520,
    packSize: "Strip of 10 capsules",
    manufacturer: "Sun Pharma",
    usageCount: 20,
  },
  {
    _id: "seed_5",
    itemName: "Ovitrelle 250 mcg Syringe",
    genericName: "Choriogonadotropin alfa (r-hCG trigger)",
    category: "Medicaments",
    hsnCode: "30043919",
    gstRate: 12,
    costPrice: 1800,
    mrp: 2300,
    defaultBilledPrice: 2100,
    packSize: "1 Pre-filled Syringe",
    manufacturer: "Merck",
    usageCount: 9,
  },
  {
    _id: "seed_6",
    itemName: "Letroz 2.5 mg Tablet",
    genericName: "Letrozole",
    category: "Medicaments",
    hsnCode: "30049099",
    gstRate: 12,
    costPrice: 140,
    mrp: 195,
    defaultBilledPrice: 180,
    packSize: "Strip of 5 tablets",
    manufacturer: "Sun Pharma",
    usageCount: 25,
  },
  {
    _id: "seed_7",
    itemName: "Fertomid 50 mg Tablet",
    genericName: "Clomiphene Citrate",
    category: "Medicaments",
    hsnCode: "30049099",
    gstRate: 12,
    costPrice: 85,
    mrp: 120,
    defaultBilledPrice: 110,
    packSize: "Strip of 10 tablets",
    manufacturer: "Cipla",
    usageCount: 18,
  },
  {
    _id: "seed_8",
    itemName: "Follicular Monitoring Ultrasound Scan",
    genericName: "Transvaginal Ultrasound (TVS)",
    category: "Medical Equipment",
    hsnCode: "90181200",
    gstRate: 12,
    costPrice: 400,
    mrp: 1500,
    defaultBilledPrice: 1200,
    packSize: "Per scan session",
    manufacturer: "Clinical Procedure",
    usageCount: 30,
  },
];

/**
 * Fetch HSN codes from backend database with fallback
 */
export async function fetchHsnCodes(): Promise<{ status: string; data: HsnCodeItem[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/clinic/inventory/hsn-codes`);
    if (!res.ok) throw new Error("Failed to fetch HSN codes");
    const json = await res.json();
    return { status: "success", data: json.data || FALLBACK_HSN_CODES };
  } catch {
    return { status: "success", data: FALLBACK_HSN_CODES };
  }
}

/**
 * Create or update an HSN code definition
 */
export async function upsertHsnCode(codeData: {
  hsnCode: string;
  category: string;
  description: string;
  gstRate: number;
}): Promise<{ status: string; data?: HsnCodeItem; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/inventory/hsn-codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(codeData),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to save HSN code");
  return json;
}

/**
 * Fetch cached clinic inventory from MongoDB (Tier 1 Cache)
 */
export async function fetchClinicInventory(
  query = "",
  category = ""
): Promise<{ status: string; data: ClinicInventoryItem[] }> {
  try {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (category) params.append("category", category);

    const res = await fetch(`${API_BASE_URL}/api/v1/clinic/inventory/cached?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch clinic cache");
    const json = await res.json();
    return { status: "success", data: json.data || FALLBACK_CLINIC_ITEMS };
  } catch {
    // If backend offline, filter local fallback
    const qLower = query.toLowerCase();
    const filtered = FALLBACK_CLINIC_ITEMS.filter((item) => {
      if (category && category !== "all" && item.category !== category) return false;
      if (!query) return true;
      return (
        item.itemName.toLowerCase().includes(qLower) ||
        (item.genericName && item.genericName.toLowerCase().includes(qLower)) ||
        item.hsnCode.includes(query)
      );
    });
    return { status: "success", data: filtered };
  }
}

/**
 * Promote an item from the Master A-Z catalog into the permanent clinic database cache (Tier 1)
 */
export async function promoteClinicItem(itemData: {
  itemName: string;
  genericName?: string;
  category: string;
  hsnCode: string;
  gstRate: number;
  costPrice: number;
  mrp: number;
  defaultBilledPrice: number;
  packSize?: string;
  manufacturer?: string;
}): Promise<{ status: string; data?: ClinicInventoryItem; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/clinic/inventory/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemData),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to promote item into clinic database cache");
    return json;
  } catch (err: any) {
    // Save to local cache array fallback if network fails
    const newItem: ClinicInventoryItem = {
      _id: `cached_${Date.now()}`,
      ...itemData,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
    };
    FALLBACK_CLINIC_ITEMS.unshift(newItem);
    return { status: "success", data: newItem };
  }
}

/**
 * Increment usage count for an inventory item
 */
export async function recordClinicItemUsage(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/clinic/inventory/items/${encodeURIComponent(id)}/usage`, {
      method: "PATCH",
    });
  } catch {}
}

/**
 * Delete an item from the clinic inventory cache
 */
export async function deleteClinicItem(id: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/inventory/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to delete item from cache");
  return json;
}

/* ==========================================================================
   Clinic Doctor Signatures API (Real MongoDB Persistence)
   ========================================================================== */

export interface ClinicSignatureItem {
  _id: string;
  name: string;
  title?: string;
  signatureData: string;
  source: "drawn" | "uploaded";
  isDefault: boolean;
  createdAt: string;
}

export const FALLBACK_CLINIC_SIGNATURES: ClinicSignatureItem[] = [
  {
    _id: "sig_default_pretheeksha",
    name: "Dr. Pretheeksha",
    title: "Chief Fertility Specialist & Gynecologist",
    signatureData:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 50" fill="none" stroke="%23181b20" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M 15 35 Q 30 35 40 35 L 50 35 L 55 12 L 62 44 L 70 20 L 78 40 L 84 28 L 92 36 L 104 35 Q 120 35 145 35" /></svg>',
    source: "drawn",
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Fetch all saved doctor signatures from MongoDB
 */
export async function fetchClinicSignatures(): Promise<{
  status: string;
  data: ClinicSignatureItem[];
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/clinic/signatures`);
    if (!res.ok) throw new Error("Failed to load doctor signatures");
    const json = await res.json();
    return {
      status: "success",
      data: json.data && json.data.length > 0 ? json.data : FALLBACK_CLINIC_SIGNATURES,
    };
  } catch {
    return { status: "success", data: FALLBACK_CLINIC_SIGNATURES };
  }
}

/**
 * Persist a new doctor signature to MongoDB
 */
export async function createClinicSignature(payload: {
  name: string;
  title?: string;
  signatureData: string;
  source: "drawn" | "uploaded";
  isDefault?: boolean;
}): Promise<{ status: string; data: ClinicSignatureItem }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/clinic/signatures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Failed to save signature");
    return json;
  } catch (err: any) {
    const fallbackItem: ClinicSignatureItem = {
      _id: `sig_${Date.now()}`,
      name: payload.name,
      title: payload.title,
      signatureData: payload.signatureData,
      source: payload.source,
      isDefault: Boolean(payload.isDefault),
      createdAt: new Date().toISOString(),
    };
    FALLBACK_CLINIC_SIGNATURES.unshift(fallbackItem);
    return { status: "success", data: fallbackItem };
  }
}

/**
 * Set a signature as default in MongoDB
 */
export async function setDefaultClinicSignature(id: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/signatures/${encodeURIComponent(id)}/default`, {
    method: "PATCH",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to set default signature");
  return json;
}

/**
 * Delete a doctor signature from MongoDB
 */
export async function deleteClinicSignature(id: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/clinic/signatures/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to delete signature");
  return json;
}

/* ==========================================================================
   Cumulative Invoice Sequence API (MongoDB with Local Offline Fallback)
   ========================================================================== */

const INVOICE_SEQ_LOCAL_KEY = "pretheeksha_last_invoice_seq";

/**
 * Format invoice number string consistently, e.g. INV-2026-0001
 */
export function formatInvoiceNumber(seq: number, year = new Date().getFullYear()): string {
  const safeSeq = Math.max(1, Number(seq) || 1);
  return `INV-${year}-${String(safeSeq).padStart(4, "0")}`;
}

/**
 * Fetch the next cumulative invoice number from MongoDB
 * If offline, uses local workstation sequence cache
 */
export async function fetchNextInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoice-sequence`);
    if (res.ok) {
      const json = await res.json();
      const currentCount = Number(json?.data?.count) || 0;
      const nextCount = currentCount + 1;
      try {
        localStorage.setItem(INVOICE_SEQ_LOCAL_KEY, String(currentCount));
      } catch {}
      return formatInvoiceNumber(nextCount, currentYear);
    }
  } catch {}

  // Local fallback if backend unavailable
  let localLastSeq = 0;
  try {
    const saved = localStorage.getItem(INVOICE_SEQ_LOCAL_KEY);
    if (saved) localLastSeq = Number(saved) || 0;
  } catch {}

  return formatInvoiceNumber(localLastSeq + 1, currentYear);
}

/**
 * Atomically commit and increment the invoice sequence in MongoDB
 * Called when an invoice is printed or finalized
 */
export async function commitInvoiceSequenceIncrement(): Promise<string> {
  const currentYear = new Date().getFullYear();
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoice-sequence/increment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const json = await res.json();
      const newCount = Number(json?.data?.count) || 1;
      try {
        localStorage.setItem(INVOICE_SEQ_LOCAL_KEY, String(newCount));
      } catch {}
      return formatInvoiceNumber(newCount, currentYear);
    }
  } catch {}

  // Fallback local increment
  let localLastSeq = 0;
  try {
    const saved = localStorage.getItem(INVOICE_SEQ_LOCAL_KEY);
    if (saved) localLastSeq = Number(saved) || 0;
    localLastSeq += 1;
    localStorage.setItem(INVOICE_SEQ_LOCAL_KEY, String(localLastSeq));
  } catch {}

  return formatInvoiceNumber(localLastSeq, currentYear);
}

/* ==========================================================================
   Invoices Persistence API (MongoDB Real Backend)
   ========================================================================== */

export interface SaveInvoicePayload {
  invoiceNo: string;
  invoiceDate?: string;
  customer: {
    name: string;
    email?: string;
    mobile?: string;
    address?: string;
  };
  lineItems: Array<{
    slNo?: number;
    description: string;
    hsnCode?: string;
    packageCode?: string;
    qty: number;
    unitPrice: number;
    costPrice?: number;
    mrp?: number;
    gstRate?: number;
    gstAmount?: number;
    totalAmount: number;
  }>;
  paymentDetails?: {
    payMethod?: string;
    payDescription?: string;
  };
  financialSummary?: {
    totalBeforeVat?: string;
    vat?: string;
    grossAmount?: string;
    total?: string;
    paid?: string;
    balance?: string;
    publicTotal?: string;
    dbTotal?: string;
  };
  notes?: string;
}

/**
 * Save a new invoice to MongoDB
 */
export async function saveInvoice(payload: SaveInvoicePayload): Promise<{
  status: string;
  message?: string;
  data?: any;
}> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to save invoice to database");
  return json;
}

/**
 * Update existing invoice in MongoDB
 */
export async function updateInvoice(
  id: string,
  payload: SaveInvoicePayload
): Promise<{
  status: string;
  message?: string;
  data?: any;
}> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to update invoice in database");
  return json;
}

/**
 * Delete invoice from MongoDB
 */
export async function deleteInvoice(id: string): Promise<{
  status: string;
  message?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to delete invoice from database");
  return json;
}

/**
 * Fetch all invoices from MongoDB
 */
export async function fetchInvoices(): Promise<{ status: string; data: any[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/accounting/invoices`);
    if (!res.ok) throw new Error("Failed to load invoices");
    const json = await res.json();
    return {
      status: "success",
      data: json.data?.invoices || [],
    };
  } catch {
    return { status: "success", data: [] };
  }
}
