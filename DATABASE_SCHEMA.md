# Pretheeksha Fertility Software — Database Architecture & Schema Specification

This document defines the dedicated MongoDB collections, schemas, fields, relationships, and indexing rules for **Pretheeksha Fertility Clinic**, designed to comply with the **ART (Regulation) Act 2021** and **DPDP Act 2023**.

All Pretheeksha records reside in **dedicated collections** prefixed with `*-preth`, physically isolated from ABC's internal commercial collections (`user-commercial`, `invoices`).

---

## 1. Database Collections Overview

| Collection Name | Model Name | Description |
| :--- | :--- | :--- |
| **`user-preth`** | `PretheekshaUser` (`Patient`) | Individual patient records (demographics, contact array, DOB, allergies) |
| **`couple-preth`** | `PretheekshaCouple` (`Couple`) | Links 1..n patients with clinical roles (intended mother, father, donor, surrogate) |
| **`cycle-preth`** | `PretheekshaCycle` (`Cycle`) | Treatment cycles (IVF, IUI, ICSI, FET protocols, outcome, doctor) |
| **`encounter-preth`** | `PretheekshaEncounter` | Clinical visits, doctor notes, and follicular ultrasound scan measurements |
| **`lab-preth`** | `PretheekshaLabResult` | Structured lab and andrology records (semen analysis, AMH, hormone panels) |
| **`consent-preth`** | `PretheekshaConsent` | Statutory ART Act & DPDP Act consent tracking and signed document keys |
| **`audit-preth`** | `PretheekshaAuditLog` | Append-only clinical access and modification audit trail |
| **`registration-preth`** | `PretheekshaRegistration`| Idempotency store to guarantee double-click safety during patient onboarding |
| **`invoice-preth`** | `PretheekshaInvoice` | Clinical billing, procedure fees, and payment tracking |
| **`service-preth`** | `PretheekshaService` | Clinic service catalog (consultations, scans, lab tests, IVF/IUI procedures, standard pricing) |

---

## 2. Patient Identification: Crockford Base32 with Check Character

* **Alphabet**: `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (excludes `I`, `L`, `O`, `U` to avoid misreads).
* **Format**: 8 random Crockford Base32 characters + 1 Mod-37 check character (Total 9 chars, e.g. **`7K2M9QXT4`**).
* **Entropy**: $\approx 1.1 \text{ trillion}$ unique values.
* **Separation**: Decoupled from phone numbers. Phone numbers are stored as an array of E.164 strings.
* **Client-side Verification**: Reception UI catches mistyped codes immediately using the check character before sending network requests.

---

## 3. Core Collection Schemas

### A. Patient Schema (`user-preth`)
```typescript
{
  code: { type: String, unique: true, required: true }, // e.g. "7K2M9QXT4"
  fullName: { type: String, required: true, trim: true },
  searchName: { type: String, required: true, lowercase: true, index: true },
  dateOfBirth: { type: Date, required: true },
  sex: { type: String, enum: ["female", "male", "intersex", "unspecified"], required: true },
  bloodGroup: { type: String, trim: true },
  phones: [{
    e164: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    label: { type: String, default: "mobile" }
  }],
  email: { type: String, lowercase: true, trim: true },
  address: {
    line1: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pin: { type: String, default: "" }
  },
  allergies: [{ type: String, trim: true }],
  medicalHistory: { type: String, default: "" },
  deletedAt: { type: Date, default: null, index: true },
  deletedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser" }
}
// Options: { timestamps: true, optimisticConcurrency: true, collection: "user-preth" }
// Indexes: { "phones.e164": 1 }, { searchName: 1 }, { code: 1 }, { deletedAt: 1, createdAt: -1 }
```

### B. Couple / Case Schema (`couple-preth`)
```typescript
{
  code: { type: String, unique: true, required: true },
  members: [{
    patient: { type: Schema.Types.ObjectId, ref: "PretheekshaUser", required: true },
    role: { 
      type: String, 
      enum: ["intended_mother", "intended_father", "intended_parent", "partner", "donor", "surrogate"], 
      required: true 
    },
    since: { type: Date, default: Date.now },
    until: { type: Date, default: null }
  }],
  status: { type: String, enum: ["active", "closed"], default: "active", index: true },
  notes: { type: String, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser" }
}
// Options: { timestamps: true, optimisticConcurrency: true, collection: "couple-preth" }
// Indexes: { "members.patient": 1 }, { code: 1 }
```

### C. Treatment Cycle Schema (`cycle-preth`)
```typescript
{
  couple: { type: Schema.Types.ObjectId, ref: "PretheekshaCouple", index: true },
  patient: { type: Schema.Types.ObjectId, ref: "PretheekshaUser", required: true, index: true },
  cycleNumber: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ["consultation", "iui", "ivf", "icsi", "fet", "laparoscopy", "diagnostics"], 
    required: true 
  },
  protocol: { type: String, trim: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  outcome: { 
    type: String, 
    enum: ["ongoing", "pregnant", "not_pregnant", "cancelled", "unknown"], 
    default: "ongoing" 
  },
  doctor: { type: Schema.Types.ObjectId, ref: "AdminUser" },
  status: { 
    type: String, 
    enum: ["planned", "active", "completed", "on_hold", "cancelled"], 
    default: "active", 
    index: true 
  },
  notes: { type: String, default: "" }
}
// Options: { timestamps: true, optimisticConcurrency: true, collection: "cycle-preth" }
```

### D. Audit Log Schema (`audit-preth`)
Append-only log of every read and write of patient and clinical records:
```typescript
{
  actorId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
  outcome: { type: String, enum: ["success", "denied", "error"], default: "success" }
}
// Options: { collection: "audit-preth" }
```

---

## 4. Security, Access & Storage Rules
1. **Zero Mock / Zero LocalStorage**: All data is queried from and saved to real MongoDB collections via server endpoints.
2. **RBAC Fencing**:
   * Receptionists: Read/Write demographics and billing only. Zero clinical note access.
   * Doctors: Read/Write clinical notes and cycles. Read demographics and billing.
   * Embryologists: Read/Write lab & semen analysis results. Limited demographic view.
   * Admins: Soft-delete only. Zero direct medical file modification.
3. **Private File Storage**:
   * Medical scans and lab PDFs are stored in an AWS S3 bucket in `ap-south-1` with Block Public Access and SSE-KMS encryption.
   * Database stores only the private S3 key. Presigned URLs are generated on demand and expire in 5 minutes after an RBAC permission check and audit log entry.
4. **Soft Delete Only**: Clinical records are never permanently deleted from database queries; `deletedAt` and `deletedBy` are applied with Mongoose pre-find hooks.
