import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  fetchHsnCodes,
  upsertHsnCode,
  fetchClinicInventory,
  promoteClinicItem,
  deleteClinicItem,
  type HsnCodeItem,
  type ClinicInventoryItem,
  FALLBACK_HSN_CODES,
} from "../services/api";
import {
  getMasterDatasetStats,
  parseMedicinesCsv,
  setCustomMasterDataset,
} from "../services/medicineMasterService";
import {
  Database,
  Tag,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCw,
  Search,
  Upload,
  FileSpreadsheet,
  Package,
} from "lucide-react";

export const SettingsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"hsn" | "master" | "cache">("hsn");

  // HSN State
  const [hsnList, setHsnList] = useState<HsnCodeItem[]>(FALLBACK_HSN_CODES);
  const [isLoadingHsn, setIsLoadingHsn] = useState(false);
  const [isAddHsnOpen, setIsAddHsnOpen] = useState(false);
  const [newHsnCode, setNewHsnCode] = useState("");
  const [newHsnCat, setNewHsnCat] = useState("Medicaments");
  const [newHsnDesc, setNewHsnDesc] = useState("");
  const [newHsnGst, setNewHsnGst] = useState<number>(12);

  // Master Catalog State
  const [masterStats, setMasterStats] = useState(getMasterDatasetStats());
  const [isUploadingMaster, setIsUploadingMaster] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Clinic DB Cache State
  const [cachedItems, setCachedItems] = useState<ClinicInventoryItem[]>([]);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [cacheSearch, setCacheSearch] = useState("");

  // Edit / Add Cache Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [formItemName, setFormItemName] = useState("");
  const [formGenericName, setFormGenericName] = useState("");
  const [formCategory, setFormCategory] = useState("Medicaments");
  const [formHsnCode, setFormHsnCode] = useState("30049099");
  const [formGstRate, setFormGstRate] = useState<number>(12);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formMrp, setFormMrp] = useState<number>(0);
  const [formBilledPrice, setFormBilledPrice] = useState<number>(0);
  const [formPackSize, setFormPackSize] = useState("");
  const [formManufacturer, setFormManufacturer] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);

  // Load HSN
  const loadHsn = async () => {
    setIsLoadingHsn(true);
    try {
      const res = await fetchHsnCodes();
      if (res.data) setHsnList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHsn(false);
    }
  };

  // Load Clinic Cache
  const loadCache = async (query = "") => {
    setIsLoadingCache(true);
    try {
      const res = await fetchClinicInventory(query);
      if (res.data) setCachedItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCache(false);
    }
  };

  useEffect(() => {
    loadHsn();
    loadCache();
    setMasterStats(getMasterDatasetStats());
  }, []);

  const handleSaveHsn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHsnCode.trim()) return;

    try {
      await upsertHsnCode({
        hsnCode: newHsnCode.trim(),
        category: newHsnCat.trim(),
        description: newHsnDesc.trim(),
        gstRate: Number(newHsnGst) || 0,
      });
      setIsAddHsnOpen(false);
      setNewHsnCode("");
      setNewHsnDesc("");
      loadHsn();
    } catch (err: any) {
      alert(err.message || "Failed to save HSN code");
    }
  };

  const handleHsnCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;
        const parts = line.split(",");
        if (parts.length >= 4) {
          const code = parts[0]?.trim();
          const cat = parts[1]?.trim();
          const desc = parts[2]?.trim();
          const gst = parseFloat(parts[3]?.replace(/[^\d.]/g, "") || "12") || 12;
          if (code && cat) {
            await upsertHsnCode({ hsnCode: code, category: cat, description: desc, gstRate: gst });
            count++;
          }
        }
      }
      alert(`Imported ${count} HSN codes successfully!`);
      loadHsn();
    };
    reader.readAsText(file);
  };

  const handleMasterCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMaster(true);
    setUploadSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("Empty file");
        const parsed = parseMedicinesCsv(text);
        setCustomMasterDataset(parsed);
        setMasterStats({
          isLoaded: true,
          isLoading: false,
          totalCount: parsed.length,
        });
        setUploadSuccessMsg(`Successfully loaded ${parsed.length.toLocaleString()} medicines into master catalog!`);
      } catch (err: any) {
        alert(err.message || "Failed to parse CSV file");
      } finally {
        setIsUploadingMaster(false);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenAddItem = () => {
    setEditItemId(null);
    setFormItemName("");
    setFormGenericName("");
    setFormCategory("Medicaments");
    setFormHsnCode("30049099");
    setFormGstRate(12);
    setFormCostPrice(0);
    setFormMrp(0);
    setFormBilledPrice(0);
    setFormPackSize("");
    setFormManufacturer("");
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ClinicInventoryItem) => {
    setEditItemId(item._id || null);
    setFormItemName(item.itemName);
    setFormGenericName(item.genericName || "");
    setFormCategory(item.category);
    setFormHsnCode(item.hsnCode);
    setFormGstRate(item.gstRate);
    setFormCostPrice(item.costPrice);
    setFormMrp(item.mrp);
    setFormBilledPrice(item.defaultBilledPrice);
    setFormPackSize(item.packSize || "");
    setFormManufacturer(item.manufacturer || "");
    setIsItemModalOpen(true);
  };

  const handleSaveClinicItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName.trim() || !formHsnCode.trim()) return;

    setIsSavingItem(true);
    try {
      await promoteClinicItem({
        itemName: formItemName.trim(),
        genericName: formGenericName.trim(),
        category: formCategory,
        hsnCode: formHsnCode.trim(),
        gstRate: formGstRate,
        costPrice: Number(formCostPrice) || 0,
        mrp: Number(formMrp) || 0,
        defaultBilledPrice: Number(formBilledPrice) || 0,
        packSize: formPackSize.trim(),
        manufacturer: formManufacturer.trim(),
      });
      setIsItemModalOpen(false);
      loadCache(cacheSearch);
    } catch (err: any) {
      alert(err.message || "Failed to save item");
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async (id?: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to delete this item from clinic cache?")) return;
    try {
      await deleteClinicItem(id);
      loadCache(cacheSearch);
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  const formatMoney = (val: number) => {
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Pharmacy, HSN &amp; Inventory Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage HSN codes, A-to-Z medicines catalog, and Tier-1 clinic database cache with 3-tier pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "hsn" ? "default" : "outline"}
            size="sm"
            className="rounded-[6px] text-xs h-8"
            onClick={() => setActiveTab("hsn")}
          >
            <Tag className="h-3.5 w-3.5 mr-1" />
            <span>HSN Tax Codes ({hsnList.length})</span>
          </Button>

          <Button
            variant={activeTab === "master" ? "default" : "outline"}
            size="sm"
            className="rounded-[6px] text-xs h-8"
            onClick={() => setActiveTab("master")}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            <span>Master Catalog (254k)</span>
          </Button>

          <Button
            variant={activeTab === "cache" ? "default" : "outline"}
            size="sm"
            className="rounded-[6px] text-xs h-8"
            onClick={() => setActiveTab("cache")}
          >
            <Database className="h-3.5 w-3.5 mr-1" />
            <span>Clinic DB Cache ({cachedItems.length})</span>
          </Button>
        </div>
      </div>

      {/* TAB 1: HSN CODES */}
      {activeTab === "hsn" && (
        <Card className="rounded-[6px] border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#0284c7]" />
                <span>Fertility &amp; Pharmacy HSN Codes</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleHsnCsvUpload}
                />
                <div className="inline-flex items-center px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-[6px] text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <Upload className="h-3.5 w-3.5 mr-1.5 text-neutral-400" />
                  <span>Import HSN CSV</span>
                </div>
              </label>

              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs rounded-[6px] bg-[#0284c7] hover:bg-[#0369a1]"
                onClick={() => setIsAddHsnOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Add HSN Code</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-[6px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <th className="p-3 font-semibold w-28">HSN Code</th>
                  <th className="p-3 font-semibold w-36">Category</th>
                  <th className="p-3 font-semibold">Item Description &amp; Scope</th>
                  <th className="p-3 font-semibold text-center w-24">GST Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {isLoadingHsn ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-neutral-400">
                      <RotateCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Loading HSN codes...
                    </td>
                  </tr>
                ) : (
                  hsnList.map((h) => (
                    <tr key={h.hsnCode} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50">
                      <td className="p-3 font-mono font-bold text-[#0284c7]">{h.hsnCode}</td>
                      <td className="p-3 font-medium">{h.category}</td>
                      <td className="p-3 text-neutral-600 dark:text-neutral-400">{h.description}</td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={`font-semibold ${
                            h.gstRate === 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : h.gstRate === 5
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : h.gstRate === 12
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {h.gstRate}%
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: MASTER MEDICINES CATALOG */}
      {activeTab === "master" && (
        <Card className="rounded-[6px] border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[#0284c7]" />
                <span>India Master Medicines Dataset (A to Z)</span>
              </h2>
            </div>

            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              {masterStats.totalCount > 0
                ? `${masterStats.totalCount.toLocaleString()} Medicines Indexed`
                : "Active"}
            </Badge>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-[6px] border border-neutral-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                  Current Master File: A_Z_medicines_dataset_of_India.csv
                </span>
                <span className="text-[11px] text-neutral-500 block mt-0.5">
                  Contains all allopathy medicines, compositions, packaging, manufacturers, and baseline MRPs across India.
                </span>
              </div>

              <label className="cursor-pointer shrink-0">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleMasterCsvUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[6px] text-xs h-8 pointer-events-none"
                  disabled={isUploadingMaster}
                >
                  {isUploadingMaster ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      <span>Parsing Dataset...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      <span>Upload &amp; Replace Dataset</span>
                    </>
                  )}
                </Button>
              </label>
            </div>

            {uploadSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-[4px] text-xs font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: CLINIC DB CACHE (TIER 1) */}
      {activeTab === "cache" && (
        <Card className="rounded-[6px] border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Database className="h-4 w-4 text-[#0284c7]" />
                <span>Tier 1 Clinic Database Cache (Shared Across Clinic Computers)</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filter cached items..."
                  className="pl-8 pr-3 h-8 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[6px] outline-none w-52"
                  value={cacheSearch}
                  onChange={(e) => {
                    setCacheSearch(e.target.value);
                    loadCache(e.target.value);
                  }}
                />
              </div>

              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs rounded-[6px] bg-[#0284c7] hover:bg-[#0369a1]"
                onClick={handleOpenAddItem}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Add Clinic Item</span>
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-[6px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <th className="p-3 font-semibold">Item &amp; Generic Description</th>
                  <th className="p-3 font-semibold w-24">HSN</th>
                  <th className="p-3 font-semibold text-center w-16">GST</th>
                  <th className="p-3 font-semibold text-right w-28">1. Cost Price</th>
                  <th className="p-3 font-semibold text-right w-28">2. MRP</th>
                  <th className="p-3 font-semibold text-right w-28">3. Billed Price</th>
                  <th className="p-3 font-semibold text-center w-16">Usage</th>
                  <th className="p-3 font-semibold text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {isLoadingCache ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-neutral-400">
                      <RotateCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                      Loading clinic cache...
                    </td>
                  </tr>
                ) : cachedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-400">
                      No items found in clinic cache.
                    </td>
                  </tr>
                ) : (
                  cachedItems.map((item) => (
                    <tr key={item._id || item.itemName} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50">
                      <td className="p-3">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.itemName}
                        </div>
                        {item.genericName && (
                          <div className="text-[11px] text-neutral-500">{item.genericName}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-neutral-600 dark:text-neutral-400">{item.hsnCode}</td>
                      <td className="p-3 text-center">
                        <span className="font-semibold text-[11px] px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                          {item.gstRate}%
                        </span>
                      </td>
                      <td className="p-3 text-right text-neutral-600 dark:text-neutral-400 font-mono">
                        {formatMoney(item.costPrice)}
                      </td>
                      <td className="p-3 text-right text-neutral-600 dark:text-neutral-400 font-mono">
                        {formatMoney(item.mrp)}
                      </td>
                      <td className="p-3 text-right font-bold font-mono text-[#0284c7]">
                        {formatMoney(item.defaultBilledPrice)}
                      </td>
                      <td className="p-3 text-center font-bold text-neutral-500">
                        {item.usageCount || 0}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="p-1 hover:text-[#0284c7]"
                            onClick={() => handleOpenEditItem(item)}
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-1 hover:text-red-600"
                            onClick={() => handleDeleteItem(item._id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add HSN Modal */}
      <Dialog open={isAddHsnOpen} onOpenChange={setIsAddHsnOpen}>
        <DialogContent className="max-w-md p-5 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#0284c7]" />
            <span>Add HSN Code Definition</span>
          </DialogTitle>
          <form onSubmit={handleSaveHsn} className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-semibold block mb-1">HSN / SAC Code</label>
              <input
                type="text"
                required
                className="w-full h-8 px-2.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono"
                value={newHsnCode}
                onChange={(e) => setNewHsnCode(e.target.value)}
                placeholder="e.g. 30043912"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Category</label>
              <select
                className="w-full h-8 px-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none"
                value={newHsnCat}
                onChange={(e) => setNewHsnCat(e.target.value)}
              >
                <option value="Medicaments">Medicaments</option>
                <option value="Contraceptives">Contraceptives</option>
                <option value="Lab Consumables">Lab Consumables</option>
                <option value="Surgical Equipment">Surgical Equipment</option>
                <option value="Medical Equipment">Medical Equipment</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">GST Rate %</label>
              <select
                className="w-full h-8 px-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none"
                value={newHsnGst}
                onChange={(e) => setNewHsnGst(Number(e.target.value))}
              >
                <option value={0}>0% GST (Exempt)</option>
                <option value={5}>5% GST</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Item Description / Scope</label>
              <input
                type="text"
                className="w-full h-8 px-2.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none"
                value={newHsnDesc}
                onChange={(e) => setNewHsnDesc(e.target.value)}
                placeholder="Description of items covered"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-[4px]"
                onClick={() => setIsAddHsnOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="h-8 text-xs rounded-[4px] bg-[#0284c7]"
              >
                Save HSN Code
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Clinic Inventory Cache Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="max-w-md p-5 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Package className="h-4 w-4 text-[#0284c7]" />
            <span>{editItemId ? "Edit Clinic Inventory Item" : "Add New Clinic Inventory Item"}</span>
          </DialogTitle>
          <form onSubmit={handleSaveClinicItem} className="space-y-3 mt-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Item / Medicine Name</label>
              <input
                type="text"
                required
                className="w-full h-8 px-2.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none"
                value={formItemName}
                onChange={(e) => setFormItemName(e.target.value)}
                placeholder="e.g. Gonal-F 450 IU Pen"
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Generic Salt / Composition</label>
              <input
                type="text"
                className="w-full h-8 px-2.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none"
                value={formGenericName}
                onChange={(e) => setFormGenericName(e.target.value)}
                placeholder="e.g. Follitropin alfa"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">HSN Code</label>
                <select
                  className="w-full h-8 px-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono"
                  value={formHsnCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setFormHsnCode(code);
                    const match = hsnList.find((h) => h.hsnCode === code);
                    if (match) setFormGstRate(match.gstRate);
                  }}
                >
                  {hsnList.map((h) => (
                    <option key={h.hsnCode} value={h.hsnCode}>
                      {h.hsnCode} ({h.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">GST Rate %</label>
                <div className="h-8 px-2.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[4px] text-xs font-bold flex items-center">
                  {formGstRate}% GST
                </div>
              </div>
            </div>

            {/* 3-Tier Pricing Architecture */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-[6px] border border-neutral-200 dark:border-neutral-800 space-y-2">
              <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                3-Tier Pricing Configuration
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-neutral-500 block mb-1">
                    1. Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full h-8 px-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-neutral-500 block mb-1">
                    2. MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full h-8 px-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-[4px] outline-none font-mono"
                    value={formMrp}
                    onChange={(e) => setFormMrp(Number(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-[#0284c7] block mb-1">
                    3. Billed (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full h-8 px-2 text-xs font-bold text-[#0284c7] bg-white dark:bg-neutral-950 border border-[#0284c7]/40 rounded-[4px] outline-none font-mono"
                    value={formBilledPrice}
                    onChange={(e) => setFormBilledPrice(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-[4px]"
                onClick={() => setIsItemModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="h-8 text-xs rounded-[4px] bg-[#0284c7]"
                disabled={isSavingItem}
              >
                {isSavingItem ? "Saving..." : "Save to Cache"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
