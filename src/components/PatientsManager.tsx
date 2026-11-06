import React, { useState, useEffect, useCallback } from "react";
import { fetchPatients, fetchPatientById, type PatientItem } from "../services/api";
import { RegistrationModal } from "./RegistrationModal";
import { PatientDossierView } from "./PatientDossierView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RotateCw, ArrowRight } from "lucide-react";

interface PatientsManagerProps {
  searchQuery?: string;
  isRegisterOpen?: boolean;
  onOpenRegister?: () => void;
  onCloseRegister?: () => void;
}

export const PatientsManager: React.FC<PatientsManagerProps> = ({
  searchQuery = "",
  isRegisterOpen: externalIsRegisterOpen,
  onOpenRegister,
  onCloseRegister,
}) => {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [partnerTargetPatient, setPartnerTargetPatient] = useState<PatientItem | null>(null);

  const isModalOpen = externalIsRegisterOpen !== undefined ? externalIsRegisterOpen : internalModalOpen;
  const handleOpenModal = () => {
    setPartnerTargetPatient(null);
    if (onOpenRegister) onOpenRegister();
    else setInternalModalOpen(true);
  };

  const handleOpenAddPartner = (patient: PatientItem) => {
    setPartnerTargetPatient(patient);
    if (onOpenRegister) onOpenRegister();
    else setInternalModalOpen(true);
  };

  const handleCloseModal = () => {
    setPartnerTargetPatient(null);
    if (onCloseRegister) onCloseRegister();
    else setInternalModalOpen(false);
  };

  const loadPatients = useCallback(async (query = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPatients(query);
      setPatients(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load patients from server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients(searchQuery);
  }, [loadPatients, searchQuery]);

  const selectedPatient = patients.find((p) => p._id === selectedPatientId);

  return (
    <div className="patients-manager-wrapper">
      {/* If a patient is selected, display the complete clinical dossier layout */}
      {selectedPatient ? (
        <PatientDossierView
          patient={selectedPatient}
          onSelectPatient={(spouseId) => {
            setSelectedPatientId(spouseId);
          }}
          onBackToList={() => setSelectedPatientId(null)}
          onAddPartner={() => handleOpenAddPartner(selectedPatient)}
          onUpdatePatient={(updated) => {
            setPatients((prev) =>
              prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p))
            );
          }}
          onDeletePatient={async () => {
            setSelectedPatientId(null);
            await loadPatients(searchQuery);
          }}
        />
      ) : (
        /* Patient Directory Table Layout */
        <>
          <div className="patients-action-bar">
            {/* Swapped to Left: Register Patient Action Button (Sidebar Item Proportions) */}
            <Button
              variant="default"
              className="register-patient-btn"
              onClick={handleOpenModal}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>Register Patient</span>
            </Button>

            {/* Swapped to Right: Directory Meta Info */}
            <div className="directory-meta-info">
              <span className="directory-count-badge">
                {patients.length} {patients.length === 1 ? "Patient Record" : "Patient Records"}
              </span>
              {searchQuery && (
                <span className="directory-filter-indicator">
                  Filter: &ldquo;{searchQuery}&rdquo;
                </span>
              )}
            </div>
          </div>

          <div className="patients-table-container">
            {error ? (
              <div className="table-error-state">
                <p className="error-text">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPatients(searchQuery)}
                  type="button"
                >
                  <RotateCw className="h-3.5 w-3.5 mr-1" />
                  <span>Retry Connection</span>
                </Button>
              </div>
            ) : loading ? (
              <div className="table-loading-state">
                <div className="loading-spinner"></div>
                <span>Loading patient records from server...</span>
              </div>
            ) : patients.length === 0 ? (
              <div className="table-empty-state">
                <div className="empty-title">No patient records found</div>
                <p className="empty-desc">
                  {searchQuery
                    ? `No patients match "${searchQuery}". Check spelling or phone number.`
                    : "The patient registry is empty. Register the first patient or couple to get started."}
                </p>
                {!searchQuery && (
                  <Button
                    variant="default"
                    size="sm"
                    className="table-primary-btn"
                    onClick={handleOpenModal}
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Register First Patient</span>
                  </Button>
                )}
              </div>
            ) : (
              <table className="patients-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Full Name</th>
                    <th>Sex / DOB</th>
                    <th>Primary Phone</th>
                    <th>Spouse Link</th>
                    <th>Registration Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => {
                    const dob = new Date(patient.dateOfBirth).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    const registeredAt = new Date(patient.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    const primaryPhone =
                      patient.phones?.find((p) => p.isPrimary)?.e164 ||
                      patient.phones?.[0]?.e164 ||
                      "—";

                    return (
                      <tr
                        key={patient._id}
                        className="clickable-row"
                        onClick={() => setSelectedPatientId(patient._id)}
                      >
                        <td>
                          <Badge variant="outline" className="code-badge font-mono">
                            {patient.code}
                          </Badge>
                        </td>
                        <td>
                          <div className="patient-name-cell">
                            <span className="patient-full-name">{patient.fullName}</span>
                            {patient.bloodGroup && (
                              <Badge variant="default" className="blood-tag text-[10px] py-0 px-1.5">
                                {patient.bloodGroup}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="patient-meta-text">
                            {patient.sex === "female"
                              ? "Female"
                              : patient.sex === "male"
                              ? "Male"
                              : patient.sex}{" "}
                            • {dob}
                          </span>
                        </td>
                        <td>
                          <span className="phone-text">{primaryPhone}</span>
                        </td>
                        <td>
                          {patient.spouse ? (
                            <div
                              className="spouse-pill-badge"
                              title={`Spouse: ${patient.spouse.fullName} (${patient.spouse.code})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPatientId(patient.spouse!.id);
                              }}
                            >
                              <span className="spouse-icon">⚭</span>
                              <span className="spouse-name">{patient.spouse.fullName}</span>
                              <span className="spouse-code">({patient.spouse.code})</span>
                            </div>
                          ) : (
                            <span className="solo-label">Solo</span>
                          )}
                        </td>
                        <td>
                          <span className="date-text">{registeredAt}</span>
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            className="table-view-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientId(patient._id);
                            }}
                            type="button"
                          >
                            <span>Open Dossier</span>
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        partnerOfPatient={
          partnerTargetPatient
            ? {
                id: partnerTargetPatient._id,
                code: partnerTargetPatient.code,
                fullName: partnerTargetPatient.fullName,
                sex: partnerTargetPatient.sex,
                address: partnerTargetPatient.address,
              }
            : null
        }
        onSuccess={async () => {
          await loadPatients(searchQuery);
          if (selectedPatientId) {
            try {
              const res = await fetchPatientById(selectedPatientId);
              if (res?.data) {
                setPatients((prev) =>
                  prev.map((p) => (p._id === selectedPatientId ? res.data! : p))
                );
              }
            } catch {}
          }
          handleCloseModal();
        }}
      />
    </div>
  );
};
