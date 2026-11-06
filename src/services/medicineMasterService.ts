/**
 * Master A-to-Z Medicines Catalog Service
 * Handles fast in-memory indexing and search across 254k Indian pharmaceutical items
 */

export interface MasterMedicineItem {
  id: string | number;
  name: string;
  nameLower: string;
  price: number; // MRP in Indian Rupees (₹)
  isDiscontinued: boolean;
  manufacturer: string;
  type: string;
  packSize: string;
  composition: string;
}

let masterMedicines: MasterMedicineItem[] = [];
let isLoading = false;
let isLoaded = false;
let loadPromise: Promise<number> | null = null;

/**
 * Fast CSV line parser supporting quoted fields
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse raw CSV text into MasterMedicineItem array
 */
export function parseMedicinesCsv(csvText: string): MasterMedicineItem[] {
  const lines = csvText.split("\n");
  const items: MasterMedicineItem[] = [];

  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    const parts = parseCsvLine(line);
    if (parts.length < 2) continue;

    const id = parts[0] || String(i);
    const name = parts[1] || "";
    if (!name) continue;

    const price = parseFloat(parts[2]?.replace(/[^\d.]/g, "") || "0") || 0;
    const isDiscontinued = parts[3]?.toUpperCase() === "TRUE";
    const manufacturer = parts[4] || "";
    const type = parts[5] || "allopathy";
    const packSize = parts[6] || "";
    const comp1 = parts[7] || "";
    const comp2 = parts[8] || "";
    const composition = [comp1, comp2].filter(Boolean).join(", ");

    items.push({
      id,
      name,
      nameLower: name.toLowerCase(),
      price,
      isDiscontinued,
      manufacturer,
      type,
      packSize,
      composition,
    });
  }

  return items;
}

/**
 * Initialize and load the Master A-Z dataset
 */
export async function loadMasterDataset(): Promise<number> {
  if (isLoaded) return masterMedicines.length;
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = (async () => {
    try {
      const res = await fetch("/A_Z_medicines_dataset_of_India.csv");
      if (!res.ok) {
        console.warn("Master CSV could not be fetched from /A_Z_medicines_dataset_of_India.csv");
        isLoading = false;
        return 0;
      }
      const text = await res.text();
      masterMedicines = parseMedicinesCsv(text);
      isLoaded = true;
      isLoading = false;
      return masterMedicines.length;
    } catch (err) {
      console.error("Error loading master medicines CSV:", err);
      isLoading = false;
      return 0;
    }
  })();

  return loadPromise;
}

/**
 * Search the 254k master medicines list letter by letter
 */
export async function searchMasterMedicines(
  query: string,
  limit = 20
): Promise<MasterMedicineItem[]> {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ || cleanQ.length < 2) return [];

  if (!isLoaded && !isLoading) {
    loadMasterDataset().catch(() => {});
  }

  if (masterMedicines.length === 0) {
    await loadMasterDataset();
  }

  const results: MasterMedicineItem[] = [];

  // 1. First priority: Prefix matches (starts with)
  for (let i = 0; i < masterMedicines.length; i++) {
    const item = masterMedicines[i];
    if (item.nameLower.startsWith(cleanQ)) {
      results.push(item);
      if (results.length >= limit) return results;
    }
  }

  // 2. Second priority: Substring / Composition matches
  for (let i = 0; i < masterMedicines.length; i++) {
    const item = masterMedicines[i];
    if (!item.nameLower.startsWith(cleanQ) && item.nameLower.includes(cleanQ)) {
      results.push(item);
      if (results.length >= limit) return results;
    }
  }

  return results;
}

/**
 * Intelligently suggest HSN code & GST percentage based on medicine / procedure name & salts
 */
export function suggestHsnCode(name: string, composition = ""): { hsnCode: string; gstRate: number } {
  const text = `${name} ${composition}`.toLowerCase();

  // 1. Insulin injections (5% GST)
  if (text.includes("insulin") || text.includes("glargine") || text.includes("aspart") || text.includes("lispro")) {
    return { hsnCode: "30043110", gstRate: 5 };
  }

  // 2. Gonadotrophins / LH-FSH stimulation injections (12% GST)
  if (
    text.includes("gonal") ||
    text.includes("menopur") ||
    text.includes("cetrotide") ||
    text.includes("follitropin") ||
    text.includes("urofollitropin") ||
    text.includes("menotrophin") ||
    text.includes("hmg") ||
    text.includes("fsh") ||
    text.includes("lh") ||
    text.includes("recombinant")
  ) {
    return { hsnCode: "30043912", gstRate: 12 };
  }

  // 3. Progesterone & Estrogen formulations / IVF Triggers (12% GST)
  if (
    text.includes("progesterone") ||
    text.includes("susten") ||
    text.includes("estradiol") ||
    text.includes("ovitrelle") ||
    text.includes("hcg") ||
    text.includes("choriogonadotropin") ||
    text.includes("gestone") ||
    text.includes("dydrogesterone")
  ) {
    return { hsnCode: "30043919", gstRate: 12 };
  }

  // 4. Chemical Contraceptives / Down-regulation (0% GST)
  if (
    text.includes("contraceptive") ||
    text.includes("ovral") ||
    text.includes("meprate") ||
    text.includes("norethisterone")
  ) {
    return { hsnCode: "30066010", gstRate: 0 };
  }

  // 5. IVF Culture Media (18% GST)
  if (text.includes("media") || text.includes("culture") || text.includes("reagent") || text.includes("buffer")) {
    return { hsnCode: "38221900", gstRate: 18 };
  }

  // 6. Surgical Needles & Catheters (12% GST)
  if (text.includes("needle") || text.includes("catheter") || text.includes("oocyte") || text.includes("cannula")) {
    return { hsnCode: "90189029", gstRate: 12 };
  }

  // 7. Ultrasound scanning apparatus & procedures (12% GST)
  if (text.includes("ultrasound") || text.includes("scan") || text.includes("monitoring") || text.includes("sonography")) {
    return { hsnCode: "90181200", gstRate: 12 };
  }

  // 8. General oral tablets & vitamins (Letrozole, Clomid, etc.) (12% GST)
  return { hsnCode: "30049099", gstRate: 12 };
}

/**
 * Replace dataset with user uploaded CSV from Settings
 */
export function setCustomMasterDataset(items: MasterMedicineItem[]): void {
  masterMedicines = items;
  isLoaded = true;
  isLoading = false;
}

/**
 * Return current status of Master Catalog
 */
export function getMasterDatasetStats(): { isLoaded: boolean; isLoading: boolean; totalCount: number } {
  return {
    isLoaded,
    isLoading,
    totalCount: masterMedicines.length,
  };
}
