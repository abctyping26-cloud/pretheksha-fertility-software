import React, { useState, useEffect } from "react";
import {
  registerPatient,
  fetchPatients,
  linkPatientsAsCouple,
  type RegisterPayload,
  type DuplicatePhoneMatch,
  type PatientItem,
} from "../services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partnerOfPatient?: {
    id: string;
    code: string;
    fullName: string;
    sex?: string;
    address?: { line1?: string; city?: string; state?: string; pin?: string };
  } | null;
}

interface CachedAddress {
  line1: string;
  city: string;
  state: string;
  pin: string;
}

const getStoredAddress = (): CachedAddress => {
  try {
    const raw = sessionStorage.getItem("pretheeksha_last_address");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        line1: parsed.line1 || "",
        city: parsed.city || "",
        state: parsed.state || "Kerala",
        pin: parsed.pin || "",
      };
    }
  } catch {}
  return { line1: "", city: "", state: "Kerala", pin: "" };
};

const saveStoredAddress = (addr: CachedAddress) => {
  try {
    sessionStorage.setItem("pretheeksha_last_address", JSON.stringify(addr));
  } catch {}
};

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

const MONTHS = [
  { value: "01", label: "01 - Jan" },
  { value: "02", label: "02 - Feb" },
  { value: "03", label: "03 - Mar" },
  { value: "04", label: "04 - Apr" },
  { value: "05", label: "05 - May" },
  { value: "06", label: "06 - Jun" },
  { value: "07", label: "07 - Jul" },
  { value: "08", label: "08 - Aug" },
  { value: "09", label: "09 - Sep" },
  { value: "10", label: "10 - Oct" },
  { value: "11", label: "11 - Nov" },
  { value: "12", label: "12 - Dec" },
];

const CURRENT_YEAR = new Date().getFullYear();
// Generates years from age 18 to 70
const YEARS = Array.from({ length: 55 }, (_, i) => String(CURRENT_YEAR - 18 - i));

const COUNTRY_CODES = [
  { code: "+91", label: "+91 (IN)" },
  { code: "+971", label: "+971 (UAE)" },
  { code: "+966", label: "+966 (KSA)" },
  { code: "+968", label: "+968 (OM)" },
  { code: "+974", label: "+974 (QA)" },
  { code: "+965", label: "+965 (KW)" },
  { code: "+973", label: "+973 (BH)" },
  { code: "+44", label: "+44 (UK)" },
  { code: "+1", label: "+1 (US/CA)" },
  { code: "+65", label: "+65 (SG)" },
  { code: "+60", label: "+60 (MY)" },
  { code: "+61", label: "+61 (AU)" },
];

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partnerOfPatient = null,
}) => {
  const [mode, setMode] = useState<"couple" | "single">("couple");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicatePhoneMatch[] | null>(null);

  // Partner linking states
  const [partnerTab, setPartnerTab] = useState<"new" | "link">("new");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [linkSearchResults, setLinkSearchResults] = useState<PatientItem[]>([]);
  const [linkSearchLoading, setLinkSearchLoading] = useState(false);
  const [selectedLinkPatientId, setSelectedLinkPatientId] = useState<string | null>(null);

  // Wife / Female Partner State
  const [wifeName, setWifeName] = useState("");
  const [wifeDay, setWifeDay] = useState("");
  const [wifeMonth, setWifeMonth] = useState("");
  const [wifeYear, setWifeYear] = useState("");
  const [wifeCountryCode, setWifeCountryCode] = useState("+91");
  const [wifePhone, setWifePhone] = useState("");
  const [wifeBlood, setWifeBlood] = useState("");

  // Husband / Male Partner State
  const [husbandName, setHusbandName] = useState("");
  const [husbandDay, setHusbandDay] = useState("");
  const [husbandMonth, setHusbandMonth] = useState("");
  const [husbandYear, setHusbandYear] = useState("");
  const [husbandCountryCode, setHusbandCountryCode] = useState("+91");
  const [husbandPhone, setHusbandPhone] = useState("");
  const [husbandBlood, setHusbandBlood] = useState("");

  // Single Patient State
  const [singleName, setSingleName] = useState("");
  const [singleSex, setSingleSex] = useState<"female" | "male">("female");
  const [singleDay, setSingleDay] = useState("");
  const [singleMonth, setSingleMonth] = useState("");
  const [singleYear, setSingleYear] = useState("");
  const [singleCountryCode, setSingleCountryCode] = useState("+91");
  const [singlePhone, setSinglePhone] = useState("");
  const [singleBlood, setSingleBlood] = useState("");

  // Shared Address State (Pre-filled from cache with Kerala as default state)
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Kerala");
  const [pin, setPin] = useState("");

  // Pre-fill address and partner defaults on modal open
  useEffect(() => {
    if (isOpen) {
      if (partnerOfPatient) {
        setMode("single");
        setPartnerTab("new");
        if (partnerOfPatient.sex === "male") {
          setSingleSex("female");
        } else if (partnerOfPatient.sex === "female") {
          setSingleSex("male");
        }
        if (partnerOfPatient.address) {
          setAddressLine(partnerOfPatient.address.line1 || "");
          setCity(partnerOfPatient.address.city || "");
          setState(partnerOfPatient.address.state || "Kerala");
          setPin(partnerOfPatient.address.pin || "");
        } else {
          const cached = getStoredAddress();
          setAddressLine(cached.line1);
          setCity(cached.city);
          setState(cached.state || "Kerala");
          setPin(cached.pin);
        }
      } else {
        const cached = getStoredAddress();
        setAddressLine(cached.line1);
        setCity(cached.city);
        setState(cached.state || "Kerala");
        setPin(cached.pin);
      }
    }
  }, [isOpen, partnerOfPatient]);

  // Debounced search for existing patients to link
  useEffect(() => {
    if (isOpen && partnerOfPatient && partnerTab === "link") {
      let isMounted = true;
      setLinkSearchLoading(true);
      const timer = setTimeout(async () => {
        try {
          const res = await fetchPatients(linkSearchQuery.trim(), 1, 30);
          if (isMounted) {
            const list = (res.data || []).filter(
              (p) => p._id !== partnerOfPatient.id
            );
            setLinkSearchResults(list);
          }
        } catch {
          if (isMounted) setLinkSearchResults([]);
        } finally {
          if (isMounted) setLinkSearchLoading(false);
        }
      }, 250);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [isOpen, partnerOfPatient, partnerTab, linkSearchQuery]);

  const resetForm = () => {
    setWifeName("");
    setWifeDay("");
    setWifeMonth("");
    setWifeYear("");
    setWifeCountryCode("+91");
    setWifePhone("");
    setWifeBlood("");

    setHusbandName("");
    setHusbandDay("");
    setHusbandMonth("");
    setHusbandYear("");
    setHusbandCountryCode("+91");
    setHusbandPhone("");
    setHusbandBlood("");

    setSingleName("");
    setSingleSex("female");
    setSingleDay("");
    setSingleMonth("");
    setSingleYear("");
    setSingleCountryCode("+91");
    setSinglePhone("");
    setSingleBlood("");

    setLinkSearchQuery("");
    setLinkSearchResults([]);
    setSelectedLinkPatientId(null);
    setPartnerTab("new");

    // Keep cached address values
    const cached = getStoredAddress();
    setAddressLine(cached.line1);
    setCity(cached.city);
    setState(cached.state || "Kerala");
    setPin(cached.pin);

    setError(null);
    setDuplicateWarning(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLinkExistingSubmit = async () => {
    if (!partnerOfPatient || !selectedLinkPatientId) return;
    setLoading(true);
    setError(null);
    try {
      await linkPatientsAsCouple(partnerOfPatient.id, selectedLinkPatientId);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to link partners");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (confirmNotDuplicate = false) => {
    setError(null);
    setLoading(true);

    try {
      let payload: RegisterPayload;

      const addressPayload = {
        line1: addressLine.trim(),
        city: city.trim(),
        state: state.trim() || "Kerala",
        pin: pin.trim(),
      };

      if (mode === "couple") {
        if (!wifeName.trim()) {
          setError("Wife's Full Name is required.");
          setLoading(false);
          return;
        }
        if (!wifeDay || !wifeMonth || !wifeYear) {
          setError("Please select Wife's complete Date of Birth (Day, Month, Year).");
          setLoading(false);
          return;
        }
        if (!wifePhone.trim()) {
          setError("Wife's primary mobile phone is required.");
          setLoading(false);
          return;
        }
        if (!husbandName.trim()) {
          setError("Husband's Full Name is required.");
          setLoading(false);
          return;
        }
        if (!husbandDay || !husbandMonth || !husbandYear) {
          setError("Please select Husband's complete Date of Birth (Day, Month, Year).");
          setLoading(false);
          return;
        }

        const wifeDob = `${wifeYear}-${wifeMonth}-${wifeDay}`;
        const husbandDob = `${husbandYear}-${husbandMonth}-${husbandDay}`;
        const fullWifePhone = `${wifeCountryCode}${wifePhone.trim().replace(/^0+/, "")}`;
        const fullHusbandPhone = husbandPhone.trim()
          ? `${husbandCountryCode}${husbandPhone.trim().replace(/^0+/, "")}`
          : fullWifePhone;

        payload = {
          mode: "couple",
          confirmNotDuplicate,
          wifeData: {
            fullName: wifeName.trim(),
            dateOfBirth: wifeDob,
            phone: fullWifePhone,
            bloodGroup: wifeBlood.trim(),
            address: addressPayload,
          },
          husbandData: {
            fullName: husbandName.trim(),
            dateOfBirth: husbandDob,
            phone: fullHusbandPhone,
            bloodGroup: husbandBlood.trim(),
            address: addressPayload,
          },
        };
      } else {
        if (!singleName.trim()) {
          setError("Patient's Full Name is required.");
          setLoading(false);
          return;
        }
        if (!singleDay || !singleMonth || !singleYear) {
          setError("Please select patient's complete Date of Birth (Day, Month, Year).");
          setLoading(false);
          return;
        }
        if (!singlePhone.trim()) {
          setError("Primary mobile phone is required.");
          setLoading(false);
          return;
        }

        const singleDob = `${singleYear}-${singleMonth}-${singleDay}`;
        const fullSinglePhone = `${singleCountryCode}${singlePhone.trim().replace(/^0+/, "")}`;

        payload = {
          mode: "single",
          confirmNotDuplicate,
          singlePatient: {
            fullName: singleName.trim(),
            dateOfBirth: singleDob,
            sex: singleSex,
            phone: fullSinglePhone,
            bloodGroup: singleBlood.trim(),
            address: addressPayload,
          },
        };
      }

      if (partnerOfPatient) {
        payload.linkToPatientId = partnerOfPatient.id;
      }

      const res = await registerPatient(payload);

      if (res.code === "POTENTIAL_DUPLICATE_PHONE" && res.matches) {
        setDuplicateWarning(res.matches);
        setLoading(false);
        return;
      }

      // Cache address for seamless consecutive registrations
      saveStoredAddress(addressPayload);

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Registration failed. Check server connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent hideCloseButton={true} className="max-w-[820px] max-h-[90vh] overflow-y-auto p-0 gap-0 border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-black rounded-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Register Patient</DialogTitle>
        </DialogHeader>

        <div className="modal-header">
          {partnerOfPatient ? (
            <div className="flex items-center justify-between w-full">
              <div className="header-mode-toggle">
                <button
                  type="button"
                  className={`header-mode-btn ${partnerTab === "new" ? "active" : ""}`}
                  onClick={() => {
                    setPartnerTab("new");
                    setError(null);
                  }}
                >
                  New Partner
                </button>
                <button
                  type="button"
                  className={`header-mode-btn ${partnerTab === "link" ? "active" : ""}`}
                  onClick={() => {
                    setPartnerTab("link");
                    setError(null);
                  }}
                >
                  Link Existing
                </button>
              </div>
              <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Partner for:{" "}
                <span className="text-neutral-900 dark:text-white font-bold">
                  {partnerOfPatient.fullName}
                </span>{" "}
                <span className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-xs ml-1">
                  {partnerOfPatient.code}
                </span>
              </div>
            </div>
          ) : (
            <div className="header-mode-toggle">
              <button
                type="button"
                className={`header-mode-btn ${mode === "couple" ? "active" : ""}`}
                onClick={() => {
                  setMode("couple");
                  setDuplicateWarning(null);
                }}
              >
                Couple
              </button>
              <button
                type="button"
                className={`header-mode-btn ${mode === "single" ? "active" : ""}`}
                onClick={() => {
                  setMode("single");
                  setDuplicateWarning(null);
                }}
              >
                Solo
              </button>
            </div>
          )}
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        {duplicateWarning && (
          <div className="duplicate-warning-box">
            <div className="warning-title">Existing Phone Match Detected</div>
            <div className="warning-list">
              {duplicateWarning.map((match, i) => (
                <div key={i} className="warning-item">
                  <strong>{match.fullName}</strong> — Code: {match.code} ({match.phone})
                </div>
              ))}
            </div>
            <div className="warning-actions">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                Confirm &amp; Register Anyway
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDuplicateWarning(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {partnerOfPatient && partnerTab === "link" ? (
          <div className="registration-form-content">
            <div className="form-field">
              <label className="field-label">Search Patient to Link</label>
              <input
                type="text"
                placeholder="Enter patient name, code, or phone number..."
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* List of matching patients */}
            <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-md p-2">
              {linkSearchLoading ? (
                <div className="p-6 text-center text-xs text-neutral-500">Searching records...</div>
              ) : linkSearchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500">
                  {linkSearchQuery.trim()
                    ? "No patients found matching your search."
                    : "Type a name, code, or phone number to find patients."}
                </div>
              ) : (
                linkSearchResults.map((pt) => {
                  const isSelected = selectedLinkPatientId === pt._id;
                  const isAlreadyCoupled = !!pt.spouse;
                  return (
                    <div
                      key={pt._id}
                      onClick={() => !isAlreadyCoupled && setSelectedLinkPatientId(pt._id)}
                      className={`flex items-center justify-between p-3 rounded-md border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "border-black bg-neutral-100 dark:border-white dark:bg-neutral-800"
                          : isAlreadyCoupled
                          ? "opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900"
                          : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-neutral-900 dark:text-white px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-xs text-[11px]">
                          {pt.code}
                        </span>
                        <div>
                          <div className="font-semibold text-neutral-900 dark:text-white">{pt.fullName}</div>
                          <div className="text-neutral-500 dark:text-neutral-400 capitalize">
                            {pt.sex} • {pt.phones?.[0]?.e164 || "No phone"}
                          </div>
                        </div>
                      </div>
                      <div>
                        {isAlreadyCoupled ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Already Linked</span>
                        ) : isSelected ? (
                          <span className="text-xs font-bold text-black dark:text-white">Selected ✓</span>
                        ) : (
                          <span className="text-neutral-400 hover:text-neutral-700 text-xs font-medium">Select</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="form-action-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="min-w-[96px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                style={{ paddingLeft: "24px", paddingRight: "24px" }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading || !selectedLinkPatientId}
                onClick={handleLinkExistingSubmit}
                className="min-w-[160px] bg-[#ffffff] text-[#09090b] border-neutral-300 hover:bg-neutral-100 hover:text-[#09090b] dark:bg-[#ffffff] dark:text-[#09090b] dark:border-neutral-200 dark:hover:bg-neutral-100 shadow-xs font-semibold"
                style={{ paddingLeft: "28px", paddingRight: "28px" }}
              >
                {loading ? "Linking..." : "Link Partner"}
              </Button>
            </div>
          </div>
        ) : (
          <form
          className="registration-form-content"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
        >
          {mode === "couple" ? (
            <div className="couple-columns-grid">
              {/* Wife Column */}
              <div className="form-column">
                <div className="column-badge">Female Partner (Wife)</div>
                <div className="form-field">
                  <label className="field-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal name"
                    value={wifeName}
                    onChange={(e) => setWifeName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Date of Birth *</label>
                  <div className="dob-dropdowns-row">
                    <select
                      className="dob-select-day"
                      value={wifeDay}
                      onChange={(e) => setWifeDay(e.target.value)}
                    >
                      <option value="">Day</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      className="dob-select-month"
                      value={wifeMonth}
                      onChange={(e) => setWifeMonth(e.target.value)}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>

                    <select
                      className="dob-select-year"
                      value={wifeYear}
                      onChange={(e) => setWifeYear(e.target.value)}
                    >
                      <option value="">Year</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-label">Mobile Phone *</label>
                    <div className="phone-country-input-group">
                      <select
                        className="country-code-select"
                        value={wifeCountryCode}
                        onChange={(e) => setWifeCountryCode(e.target.value)}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit number"
                        value={wifePhone}
                        onChange={(e) => setWifePhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">Blood Group</label>
                    <select
                      value={wifeBlood}
                      onChange={(e) => setWifeBlood(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Husband Column */}
              <div className="form-column">
                <div className="column-badge">Male Partner (Husband)</div>
                <div className="form-field">
                  <label className="field-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full legal name"
                    value={husbandName}
                    onChange={(e) => setHusbandName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Date of Birth *</label>
                  <div className="dob-dropdowns-row">
                    <select
                      className="dob-select-day"
                      value={husbandDay}
                      onChange={(e) => setHusbandDay(e.target.value)}
                    >
                      <option value="">Day</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      className="dob-select-month"
                      value={husbandMonth}
                      onChange={(e) => setHusbandMonth(e.target.value)}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>

                    <select
                      className="dob-select-year"
                      value={husbandYear}
                      onChange={(e) => setHusbandYear(e.target.value)}
                    >
                      <option value="">Year</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-field">
                    <label className="field-label">Mobile Phone (Optional if shared)</label>
                    <div className="phone-country-input-group">
                      <select
                        className="country-code-select"
                        value={husbandCountryCode}
                        onChange={(e) => setHusbandCountryCode(e.target.value)}
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="Uses wife's phone if empty"
                        value={husbandPhone}
                        onChange={(e) => setHusbandPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">Blood Group</label>
                    <select
                      value={husbandBlood}
                      onChange={(e) => setHusbandBlood(e.target.value)}
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Patient Mode */
            <div className="single-form-grid">
              <div className="form-field">
                <label className="field-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full legal name"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-field">
                  <label className="field-label">Gender *</label>
                  <select
                    value={singleSex}
                    onChange={(e) => setSingleSex(e.target.value as any)}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="field-label">Blood Group</label>
                  <select
                    value={singleBlood}
                    onChange={(e) => setSingleBlood(e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Date of Birth *</label>
                <div className="dob-dropdowns-row">
                  <select
                    className="dob-select-day"
                    value={singleDay}
                    onChange={(e) => setSingleDay(e.target.value)}
                  >
                    <option value="">Day</option>
                    {DAYS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    className="dob-select-month"
                    value={singleMonth}
                    onChange={(e) => setSingleMonth(e.target.value)}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    className="dob-select-year"
                    value={singleYear}
                    onChange={(e) => setSingleYear(e.target.value)}
                  >
                    <option value="">Year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Primary Mobile Phone *</label>
                <div className="phone-country-input-group">
                  <select
                    className="country-code-select"
                    value={singleCountryCode}
                    onChange={(e) => setSingleCountryCode(e.target.value)}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shared Address Fields with Kerala default and caching */}
          <div className="address-section">
            <div className="section-label">Residential Address</div>
            <div className="form-row-2">
              <div className="form-field">
                <input
                  type="text"
                  placeholder="Street / Area address"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                />
              </div>
              <div className="form-field">
                <input
                  type="text"
                  placeholder="City / Town"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-field">
                <input
                  type="text"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
              <div className="form-field">
                <input
                  type="text"
                  placeholder="PIN Code"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Form Actions directly merged into form */}
          <div className="form-action-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="min-w-[96px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
              style={{ paddingLeft: "24px", paddingRight: "24px" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={loading}
              className="min-w-[200px] bg-[#ffffff] text-[#09090b] border-neutral-300 hover:bg-neutral-100 hover:text-[#09090b] dark:bg-[#ffffff] dark:text-[#09090b] dark:border-neutral-200 dark:hover:bg-neutral-100 shadow-xs font-semibold"
              style={{ paddingLeft: "32px", paddingRight: "32px" }}
            >
              {loading
                ? "Registering..."
                : partnerOfPatient
                ? "Register & Link Partner"
                : mode === "couple"
                ? "Register Couple"
                : "Register Patient"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
