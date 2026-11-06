import React, { useState, useEffect } from "react";
import type { PatientItem } from "../services/api";
import { updatePatientClinicalInfo, deletePatient } from "../services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Pencil,
  Check,
  Phone,
  Cake,
  Mail,
  MapPin,
  Calendar,
  User,
  FileText,
  UserPlus,
  ArrowRight,
  Trash2,
} from "lucide-react";

interface PatientDossierViewProps {
  patient: PatientItem;
  onSelectPatient: (patientId: string) => void;
  onBackToList: () => void;
  onAddPartner?: () => void;
  onUpdatePatient?: (updated: PatientItem) => void;
  onDeletePatient?: (deletedPatientId: string) => void;
}

export const PatientDossierView: React.FC<PatientDossierViewProps> = ({
  patient,
  onSelectPatient,
  onBackToList,
  onAddPartner,
  onUpdatePatient,
  onDeletePatient,
}) => {
  const dob = new Date(patient.dateOfBirth).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const age = Math.floor(
    (Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const registeredAt = patient.createdAt
    ? new Date(patient.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  const primaryPhone =
    patient.phones?.find((p) => p.isPrimary)?.e164 || patient.phones?.[0]?.e164 || "—";

  const addressText = patient.address
    ? [patient.address.line1, patient.address.city, patient.address.state, patient.address.pin]
        .filter(Boolean)
        .join(", ") || "Kerala, India"
    : "Kerala, India";

  // Editable Clinical Fields State
  const [bloodGroup, setBloodGroup] = useState(patient.bloodGroup || "");
  const [protocol, setProtocol] = useState(patient.protocol || "IVF / ICSI");
  const [allergies, setAllergies] = useState(patient.allergies?.join(", ") || "");
  const [medicalHistory, setMedicalHistory] = useState(patient.medicalHistory || "");

  const [isEditingRow1, setIsEditingRow1] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete Patient state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync state when patient changes
  useEffect(() => {
    setBloodGroup(patient.bloodGroup || "");
    setProtocol(patient.protocol || "IVF / ICSI");
    setAllergies(patient.allergies?.join(", ") || "");
    setMedicalHistory(patient.medicalHistory || "");
    setIsEditingRow1(false);
    setSaveSuccess(false);
    setSaveError(null);
  }, [patient]);

  // Determine if there are unsaved changes
  const initialAllergies = patient.allergies?.join(", ") || "";
  const initialHistory = patient.medicalHistory || "";
  const initialBlood = patient.bloodGroup || "";
  const initialProtocol = patient.protocol || "IVF / ICSI";

  const hasChanges =
    bloodGroup !== initialBlood ||
    protocol !== initialProtocol ||
    allergies !== initialAllergies ||
    medicalHistory !== initialHistory;

  const handleSaveClinicalInfo = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const allergyArray = allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const res = await updatePatientClinicalInfo(patient._id, {
        bloodGroup: bloodGroup.trim(),
        protocol: protocol.trim(),
        allergies: allergyArray,
        medicalHistory: medicalHistory.trim(),
      });

      if (res.data && onUpdatePatient) {
        onUpdatePatient(res.data);
      }
      setSaveSuccess(true);
      setIsEditingRow1(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save clinical changes");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePatient(patient._id);
      setIsDeleteDialogOpen(false);
      if (onDeletePatient) {
        onDeletePatient(patient._id);
      } else {
        onBackToList();
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete patient record");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dossier-layout-container">
      {/* Top Left Back Navigation Bar with Global Save Indicator & Top Right Delete Action */}
      <div className="dossier-top-nav">
        <Button
          variant="outline"
          size="sm"
          className="dossier-back-btn"
          onClick={onBackToList}
          type="button"
          title="Back to Patients Directory"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        {hasChanges && (
          <Button
            variant="default"
            size="sm"
            className="save-popup-btn"
            onClick={handleSaveClinicalInfo}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}

        {saveSuccess && (
          <span className="dossier-save-toast">✓ Saved to server</span>
        )}
        {saveError && (
          <span className="dossier-save-error">⚠ {saveError}</span>
        )}
      </div>

      {/* Main Two-Column Layout Grid (Left: 1fr, Right: 390px) */}
      <div className="dossier-layout-grid">
        {/* ================= LEFT MAIN COLUMN ================= */}
        <div className="dossier-left-column">
          {/* Row 1: Patient Information & Partner Information (Side-by-Side, NO inner titles) */}
          <div className="dossier-two-col-row">
            {/* Left: Patient Information Card (Title removed inside box) */}
            <Card className="dossier-card client-profile-card">
              <div className="patient-profile-content-grid">
                {/* Avatar Column (NO ID under name) */}
                <div className="patient-avatar-column">
                  <div className="patient-avatar-frame">
                    <span>{patient.fullName.charAt(0)}</span>
                  </div>
                  <h3 className="patient-display-name">{patient.fullName}</h3>
                </div>

                {/* 6x1 / 7x1 Vertical List with Small Line Icons */}
                <div className="patient-details-list">
                  <div className="detail-list-row">
                    <span className="detail-icon" title="Gender">
                      <User className="h-3 w-3" />
                    </span>
                    <span className="detail-label">Gender:</span>
                    <span className="detail-val">
                      {patient.sex === "female" ? "Female" : patient.sex === "male" ? "Male" : patient.sex}
                    </span>
                  </div>

                  <div className="detail-list-row">
                    <span className="detail-icon" title="Phone">
                      <Phone className="h-3 w-3" />
                    </span>
                    <span className="detail-label">Phone:</span>
                    <span className="detail-val">{primaryPhone}</span>
                  </div>

                  <div className="detail-list-row">
                    <span className="detail-icon" title="Age">
                      <Cake className="h-3 w-3" />
                    </span>
                    <span className="detail-label">Age:</span>
                    <span className="detail-val">{isNaN(age) ? "—" : `${age} y.o`}</span>
                  </div>

                  <div className="detail-list-row">
                    <span className="detail-icon" title="Date of Birth">
                      <Calendar className="h-3 w-3" />
                    </span>
                    <span className="detail-label">Date of Birth:</span>
                    <span className="detail-val">{dob}</span>
                  </div>

                  <div className="detail-list-row">
                    <span className="detail-icon" title="Email">
                      <Mail className="h-3 w-3" />
                    </span>
                    <span className="detail-label">Email:</span>
                    <span className="detail-val">{patient.email || "Not specified"}</span>
                  </div>

                  <div className="detail-list-row">
                    <span className="detail-icon" title="Address">
                      <MapPin className="h-3 w-3" />
                    </span>
                    <span className="detail-label">Address:</span>
                    <span className="detail-val">{addressText}</span>
                  </div>

                  <div className="detail-list-row">
                    <span className="detail-icon" title="Registration Date">
                      <Calendar className="h-3 w-3" />
                    </span>
                    <span className="detail-label">Registered:</span>
                    <span className="detail-val">{registeredAt}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Right: Partner Card (Title removed, compact without free bottom space) */}
            <Card className="dossier-card partner-profile-card">
              {patient.spouse ? (
                <div className="patient-profile-content-grid">
                  <div className="patient-avatar-column">
                    <div className="patient-avatar-frame partner-frame">
                      <span>{patient.spouse.fullName.charAt(0)}</span>
                    </div>
                    <h3 className="patient-display-name">{patient.spouse.fullName}</h3>
                  </div>

                  <div className="patient-details-list">
                    <div className="detail-list-row">
                      <span className="detail-icon" title="Relation">
                        <User className="h-3 w-3" />
                      </span>
                      <span className="detail-label">Role:</span>
                      <span className="detail-val">
                        {patient.spouse.role === "intended_father"
                          ? "Husband"
                          : patient.spouse.role === "intended_mother"
                          ? "Wife"
                          : "Partner"}
                      </span>
                    </div>

                    <div className="detail-list-row">
                      <span className="detail-icon" title="Phone">
                        <Phone className="h-3 w-3" />
                      </span>
                      <span className="detail-label">Phone:</span>
                      <span className="detail-val">{patient.spouse.phone || "Shared Mobile"}</span>
                    </div>

                    <div className="partner-action-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="switch-spouse-btn"
                        onClick={() => onSelectPatient(patient.spouse!.id)}
                        type="button"
                      >
                        <span>Switch to Spouse</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-partner-box compact">
                  <span className="no-partner-text">No partner details added</span>
                  <Button
                    variant="default"
                    size="sm"
                    className="add-partner-btn compact"
                    onClick={onAddPartner}
                    type="button"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    <span>Add Partner</span>
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Row 2: Clinical Profile (Blood Group, Protocol, Allergies) with Pencil Icon */}
          <Card className="dossier-card clinical-history-card">
            <div className="card-header-row">
              <h2 className="dossier-card-title">Clinical Profile</h2>
              <div className="card-header-actions">
                {hasChanges && (
                  <Button
                    variant="default"
                    size="sm"
                    className="save-popup-btn"
                    onClick={handleSaveClinicalInfo}
                    disabled={saving}
                    type="button"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                {/* Pencil Edit Icon Button */}
                <Button
                  variant={isEditingRow1 ? "default" : "outline"}
                  size="icon"
                  className="clinical-edit-icon-btn"
                  onClick={() => setIsEditingRow1(!isEditingRow1)}
                  type="button"
                  title={isEditingRow1 ? "Done editing" : "Edit clinical fields"}
                >
                  {isEditingRow1 ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Row 1: Blood Group & Protocol (Inline without wrapper boxes) */}
            <div className="clinical-inline-row">
              <div className="clinical-inline-item">
                <span className="clinical-inline-label">Blood Group:</span>
                {isEditingRow1 ? (
                  <select
                    className="clinical-select inline"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <Badge variant="default" className="blood-tag-badge">
                    {bloodGroup || "Pending Test"}
                  </Badge>
                )}
              </div>

              <div className="clinical-inline-item">
                <span className="clinical-inline-label">Protocol:</span>
                {isEditingRow1 ? (
                  <Input
                    type="text"
                    className="clinical-input inline"
                    value={protocol}
                    placeholder="e.g. IVF / ICSI, IUI, FET"
                    onChange={(e) => setProtocol(e.target.value)}
                  />
                ) : (
                  <Badge variant="secondary" className="protocol-badge">
                    {protocol || "IVF / ICSI"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Row 2: Allergies (Inline without heavy wrapper box) */}
            <div className="clinical-inline-row allergies-inline-row">
              <span className="clinical-inline-label">Allergies:</span>
              <Input
                type="text"
                className="clinical-input inline-full"
                value={allergies}
                placeholder="e.g. Penicillin, Dust, or None Documented"
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
          </Card>

          {/* Row 3: Appointments & Clinical Documents (Matching Clinical Profile structured blocks) */}
          <div className="dossier-two-col-row">
            {/* Left: Appointments / Steps */}
            <Card className="dossier-card appointments-card">
              <div className="card-header-row">
                <h2 className="dossier-card-title">Appointments &amp; Cycle Steps</h2>
              </div>
              <div className="dossier-items-stack">
                <div className="dossier-empty-state">
                  <div className="dossier-empty-icon">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span>No scheduled appointments or cycle steps</span>
                </div>
              </div>
            </Card>

            {/* Right: Clinical Documents & Scans */}
            <Card className="dossier-card documents-card">
              <div className="card-header-row">
                <h2 className="dossier-card-title">Clinical Documents &amp; Scans</h2>
              </div>
              <div className="dossier-items-stack">
                {patient.files && patient.files.length > 0 ? (
                  patient.files.map((file) => (
                    <div key={file._id} className="dossier-structured-item">
                      <div className="item-main-info flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                        <div>
                          <span className="item-main-title">{file.originalName}</span>
                          <span className="item-sub-meta">
                            {(file.sizeBytes / 1024).toFixed(0)} KB • {file.category || "Document"}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="item-action-btn" type="button">
                        View
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="dossier-empty-state">
                    <div className="dossier-empty-icon">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span>No clinical documents or scans uploaded</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (Telemetry + Notes, Width: 390px) ================= */}
        <aside className="dossier-right-column">
          {/* Card 1: Cycle Telemetry */}
          <Card className="dossier-card telemetry-card">
            <div className="card-header-row">
              <h2 className="dossier-card-title">Cycle Telemetry</h2>
            </div>

            <div className="telemetry-visual-box">
              <div className="cycle-metric-box">
                <div className="metric-box-inner">
                  <span className="metric-primary-val">16</span>
                  <span className="metric-primary-unit">Follicles</span>
                </div>
              </div>
              <h3 className="telemetry-headline">Ovarian Response</h3>
            </div>

            <div className="telemetry-metrics-triad">
              <div className="triad-box">
                <span className="triad-label">Avg</span>
                <span className="triad-value">17.8 <small>mm</small></span>
              </div>
              <div className="triad-box">
                <span className="triad-label">Min</span>
                <span className="triad-value">14.2 <small>mm</small></span>
              </div>
              <div className="triad-box">
                <span className="triad-label">Max</span>
                <span className="triad-value">21.5 <small>mm</small></span>
              </div>
            </div>

            {/* Growth Trend Visual */}
            <div className="telemetry-chart-box">
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot current"></span> Day 8 to 12</span>
                <span className="legend-item"><span className="legend-dot baseline"></span> Baseline</span>
              </div>

              <div className="scatter-points-visual">
                <div className="chart-row-line">
                  <span className="scatter-point" style={{ left: "12%", bottom: "25%" }}></span>
                  <span className="scatter-point" style={{ left: "28%", bottom: "38%" }}></span>
                  <span className="scatter-point" style={{ left: "45%", bottom: "52%" }}></span>
                  <span className="scatter-point" style={{ left: "62%", bottom: "66%" }}></span>
                  <span className="scatter-point" style={{ left: "78%", bottom: "78%" }}></span>
                  <span className="scatter-point" style={{ left: "92%", bottom: "90%" }}></span>
                </div>
              </div>

              <div className="chart-x-axis">
                <span>D2</span>
                <span>D4</span>
                <span>D6</span>
                <span>D8</span>
                <span>D10</span>
                <span>D12</span>
                <span>D14</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Medical History & Clinical Notes (Moved under Cycle Telemetry) */}
          <Card className="dossier-card medical-notes-card">
            <div className="card-header-row">
              <h2 className="dossier-card-title">Medical History &amp; Notes</h2>
              {hasChanges && (
                <Button
                  variant="default"
                  size="sm"
                  className="save-popup-btn"
                  onClick={handleSaveClinicalInfo}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              )}
            </div>

            <Textarea
              className="clinical-textarea right-col-notes"
              rows={4}
              value={medicalHistory}
              placeholder="Enter patient medical history, previous procedures, or clinical notes..."
              onChange={(e) => setMedicalHistory(e.target.value)}
            />
          </Card>
        </aside>
      </div>

      {/* Floating Delete Patient Icon Button in Bottom Right Corner of Page */}
      <div className="fixed bottom-6 right-8 z-30">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            setDeleteError(null);
            setIsDeleteDialogOpen(true);
          }}
          className="h-10 w-10 rounded-sm border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 dark:hover:border-red-800 shadow-md cursor-pointer transition-all flex items-center justify-center"
          title="Delete Patient Record"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete Patient</span>
        </Button>
      </div>

      {/* Delete Patient Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent
          hideCloseButton={true}
          className="confirm-dialog-content"
        >
          <DialogTitle className="sr-only">Delete Patient Record</DialogTitle>

          <div className="confirm-dialog-header">
            <div className="confirm-header-icon">
              <Trash2 className="h-4 w-4" />
            </div>
            <h3 className="confirm-dialog-title">
              Delete Patient Record
            </h3>
          </div>

          <div className="confirm-dialog-body">
            <p className="confirm-desc-text">
              Are you sure you want to permanently delete this clinical record? This action will remove the record from active directories.
            </p>

            <div className="confirm-patient-card">
              <div className="confirm-patient-info">
                <span className="confirm-card-label">Patient Name</span>
                <span className="confirm-card-name">{patient.fullName}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="confirm-card-label">Record ID</span>
                <span className="confirm-card-code">{patient.code}</span>
              </div>
            </div>

            <p className="confirm-sub-note">
              Any active partner relationship associated with this patient will be decoupled.
            </p>

            {deleteError && (
              <div className="confirm-error-box">
                {deleteError}
              </div>
            )}
          </div>

          <div className="confirm-dialog-footer">
            <button
              type="button"
              className="confirm-btn-cancel"
              disabled={deleting}
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="confirm-btn-delete"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? "Deleting..." : "Delete Patient"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
