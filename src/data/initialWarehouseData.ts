// Data Awal Kompleks Pergudangan CISKID (Cisaranten Kidul - Bandung)
import { Warehouse, Commodity, Stapel, Transaction, StapelStatusType } from "../types/warehouse";
import { User } from "../types/auth";

export const INITIAL_WAREHOUSE: Warehouse = {
  id: "wh-ciskid",
  code: "GBB-CISKID",
  name: "Kompleks Pergudangan Cisaranten Kidul (CISKID)",
  singkatan: "CISKID",
  kanwil: "Kanwil Jawa Barat",
  kancab: "Kantor Cabang Bandung",
  address: "Jl. Cisaranten Kidul No. 12, Kel. Cisaranten Kidul, Kec. Gedebage, Kota Bandung, Jawa Barat 40292",
  street: "Jl. Cisaranten Kidul No. 12",
  kelurahan: "Cisaranten Kidul",
  kecamatan: "Gedebage",
  city: "Kota Bandung",
  province: "Jawa Barat",
  postalCode: "40292",
  latitude: -6.9538,
  longitude: 107.6974,
  kepalaGudang: "Hendra Wijaya, S.T.",
  nipKepalaGudang: "19820415 200801 1 004",
  totalCapacityTonase: 3000,
  activeGudang: "Gudang 1",
  units: [
    { id: "G1", name: "Gudang 1", layout: "vertical", capacityTonase: 600 },
    { id: "G2", name: "Gudang 2", layout: "vertical", capacityTonase: 600 },
    { id: "G3", name: "Gudang 3", layout: "horizontal", capacityTonase: 600 },
    { id: "G4", name: "Gudang 4", layout: "horizontal", capacityTonase: 600 },
    { id: "G5", name: "Gudang 5", layout: "horizontal", capacityTonase: 600 },
  ],
};

export const COMMODITIES: Commodity[] = [
  {
    id: "beras-medium",
    name: "Beras Medium SPHP (CBP)",
    category: "Beras",
    defaultUnit: "Karung",
    defaultWeight: 50,
    maxShelfLifeDays: 180,
    icon: "grain",
    color: "#D97706",
  },
  {
    id: "beras-premium",
    name: "Beras Premium Kita",
    category: "Beras",
    defaultUnit: "Karung",
    defaultWeight: 50,
    maxShelfLifeDays: 180,
    icon: "grain",
    color: "#2563EB",
  },
  {
    id: "minyakita-jerigen",
    name: "Minyakita Jerigen 5L",
    category: "Minyak Goreng",
    defaultUnit: "Jerigen",
    defaultWeight: 5,
    maxShelfLifeDays: 365,
    icon: "oil_barrel",
    color: "#EAB308",
  },
  {
    id: "gula-maniskita",
    name: "Gula Pasir Manis Kita",
    category: "Gula",
    defaultUnit: "Karung",
    defaultWeight: 50,
    maxShelfLifeDays: 730,
    icon: "cookie",
    color: "#059669",
  },
  {
    id: "tepung-terigukita",
    name: "Tepung Terigu Kita",
    category: "Tepung",
    defaultUnit: "Karung",
    defaultWeight: 25,
    maxShelfLifeDays: 365,
    icon: "nutrition",
    color: "#7C3AED",
  },
];

// Generator Stapel 4x3 per Gudang (Blok A, Blok B, Blok C @ 4 stapel)
const createStapelsForGudang = (gudangName: string, _layout = "vertical"): Stapel[] => {
  const gCode = gudangName.replace("Gudang ", "G");
  const blocks = [
    { block: "A", name: "Blok A", colorClass: "bg-[#FFD1D8] text-[#9F1239] border-[#FDA4AF]", baseColor: "pink" },
    { block: "B", name: "Blok B", colorClass: "bg-[#FEF08A] text-[#854D0E] border-[#FDE047]", baseColor: "yellow" },
    { block: "C", name: "Blok C", colorClass: "bg-[#BBF7D0] text-[#166534] border-[#86EFAC]", baseColor: "green" },
  ];

  const stapelList: Stapel[] = [];

  blocks.forEach((blk) => {
    // Tiap blok memiliki 4 stapel (1, 2, 3, 4)
    for (let num = 1; num <= 4; num++) {
      const stapelId = `${gCode}-${blk.block}${num}`;
      
      let batches: any[] = [];
      let status: StapelStatusType = "kosong";

      // Berikan data realistis pada beberapa stapel di Gudang 1
      if (gudangName === "Gudang 1") {
        if (blk.block === "A" && num === 2) {
          status = "sebagian";
          batches = [
            {
              id: "batch-ciskid-09",
              stapelId,
              commodityId: "beras-medium",
              commodityName: "Beras Medium SPHP (CBP)",
              batchNo: "Batch #09",
              brand: "Bulog CBP",
              koli: 400,
              unit: "Karung",
              weightPerUnitKg: 50,
              dateIn: "2026-05-25", // 174 days -> FIFO Alert!
              expiryDate: "",
              origin: "Subang, Jabar",
              suratJalan: "SJ/PBR/2026/0525-01",
              kondisi: "Baik",
            },
            {
              id: "batch-ciskid-14",
              stapelId,
              commodityId: "beras-medium",
              commodityName: "Beras Medium SPHP (CBP)",
              batchNo: "Batch #14",
              brand: "Bulog CBP",
              koli: 350,
              unit: "Karung",
              weightPerUnitKg: 50,
              dateIn: "2026-09-10",
              expiryDate: "",
              origin: "Indramayu, Jabar",
              suratJalan: "SJ/PBR/2026/0910-03",
              kondisi: "Baik",
            },
          ];
        } else if (blk.block === "A" && num === 3) {
          status = "penuh";
          batches = [
            {
              id: "batch-ciskid-21",
              stapelId,
              commodityId: "minyakita-jerigen",
              commodityName: "Minyakita Jerigen 5L",
              batchNo: "Batch #21",
              brand: "Minyakita",
              koli: 950,
              unit: "Jerigen",
              weightPerUnitKg: 5,
              dateIn: "2026-08-01",
              expiryDate: "2027-08-01",
              origin: "PT Bina Karya Prima",
              suratJalan: "SJ-BKP/MYK/2026/0801",
              kondisi: "Baik",
            },
          ];
        } else if (blk.block === "B" && num === 1) {
          status = "penuh";
          batches = [
            {
              id: "batch-ciskid-04",
              stapelId,
              commodityId: "beras-premium",
              commodityName: "Beras Premium Kita",
              batchNo: "Batch #04",
              brand: "Beras Kita 50kg",
              koli: 980,
              unit: "Karung",
              weightPerUnitKg: 50,
              dateIn: "2026-06-02",
              expiryDate: "",
              origin: "Karawang, Jabar",
              suratJalan: "SJ/KTR-KRW/2026/0602",
              kondisi: "Baik",
            },
          ];
        } else if (blk.block === "B" && num === 3) {
          status = "sebagian";
          batches = [
            {
              id: "batch-ciskid-11",
              stapelId,
              commodityId: "gula-maniskita",
              commodityName: "Gula Pasir Manis Kita",
              batchNo: "Batch #11",
              brand: "Manis Kita 50kg",
              koli: 520,
              unit: "Karung",
              weightPerUnitKg: 50,
              dateIn: "2026-07-15",
              expiryDate: "2028-07-15",
              origin: "PG Tersana Baru",
              suratJalan: "SJ-GLA/TB/2026/0715",
              kondisi: "Baik",
            },
          ];
        } else if (blk.block === "C" && num === 2) {
          status = "sebagian";
          batches = [
            {
              id: "batch-ciskid-18",
              stapelId,
              commodityId: "tepung-terigukita",
              commodityName: "Tepung Terigu Kita",
              batchNo: "Batch #18",
              brand: "Kita Terigu Serbaguna",
              koli: 450,
              unit: "Karung",
              weightPerUnitKg: 25,
              dateIn: "2026-08-20",
              expiryDate: "2027-08-20",
              origin: "PT Bogasari Flour Mills",
              suratJalan: "SJ-BGS/TPG/2026/0820",
              kondisi: "Baik",
            },
          ];
        } else if (blk.block === "C" && num === 4) {
          status = "nonaktif";
          batches = [];
        }
      }

      stapelList.push({
        id: stapelId,
        gudang: gudangName,
        block: blk.block,
        number: num,
        name: `Stapel ${blk.block}${num}`,
        capacityKoli: 1000,
        status,
        blockColor: blk.colorClass,
        baseColor: blk.baseColor,
        batches,
      });
    }
  });

  return stapelList;
};

// Generate initial stapels for all 5 gudang in CISKID
export const INITIAL_STAPELS: Stapel[] = [
  ...createStapelsForGudang("Gudang 1", "vertical"),
  ...createStapelsForGudang("Gudang 2", "vertical"),
  ...createStapelsForGudang("Gudang 3", "horizontal"),
  ...createStapelsForGudang("Gudang 4", "horizontal"),
  ...createStapelsForGudang("Gudang 5", "horizontal"),
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "TRX-20261115-001",
    type: "MASUK",
    stapelId: "G1-B1",
    gudang: "Gudang 1",
    commodityName: "Beras Premium Kita",
    brand: "Beras Kita Premium 50kg",
    koli: 980,
    unit: "Karung",
    weightPerUnitKg: 50,
    totalKg: 49000,
    operator: "Budi Santoso",
    suratJalan: "SJ/KTR-KRW/2026/0602",
    sourceOrDest: "Penggilingan Mitra Karawang",
    timestamp: "2026-11-15T09:15:00",
    isOffline: false,
    notes: "Pengiriman via Fuso D 8821 AC. Kadar air 13.5%.",
  },
  {
    id: "TRX-20261115-002",
    type: "KELUAR",
    stapelId: "G1-A2",
    gudang: "Gudang 1",
    commodityName: "Beras Medium SPHP (CBP)",
    brand: "Bulog CBP",
    koli: 150,
    unit: "Karung",
    weightPerUnitKg: 50,
    totalKg: 7500,
    operator: "Budi Santoso",
    suratJalan: "DO-SPHP/KC-BDG/XI/2026/041",
    sourceOrDest: "Pasar Caringin Bandung (Operasi Pasar)",
    timestamp: "2026-11-15T10:45:00",
    isOffline: false,
    notes: "Alokasi penyaluran SPHP tahap 2 Bandung Raya.",
  },
  {
    id: "TRX-20261115-003",
    type: "MASUK",
    stapelId: "G1-C2",
    gudang: "Gudang 1",
    commodityName: "Tepung Terigu Kita",
    brand: "Kita Terigu Serbaguna",
    koli: 450,
    unit: "Karung",
    weightPerUnitKg: 25,
    totalKg: 11250,
    operator: "Budi Santoso",
    suratJalan: "SJ-BGS/TPG/2026/0820",
    sourceOrDest: "PT Bogasari Flour Mills",
    timestamp: "2026-11-15T11:30:00",
    isOffline: false,
    notes: "Kemasan bersih dan rapi.",
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: "usr-admin-01",
    name: "Administrator Pusat",
    email: "admin@bulog.co.id",
    nip: "19800101 200501 1 001",
    password: "admin123",
    role: "superadmin",
    unitGudang: "Semua Kompleks Gudang",
    status: "aktif",
    lastLogin: "15 Nov 2026, 23:45",
  },
  {
    id: "usr-kepala-01",
    name: "Hendra Wijaya, S.T.",
    email: "hendra@bulog.co.id",
    nip: "19820415 200801 1 004",
    password: "bulog123",
    role: "kepala_gudang",
    unitGudang: "GBB CISKID (Gudang 1-5)",
    status: "aktif",
    lastLogin: "15 Nov 2026, 21:10",
  },
  {
    id: "usr-operator-01",
    name: "Budi Santoso",
    email: "budi@bulog.co.id",
    nip: "19930820 201802 1 003",
    password: "operator123",
    role: "operator",
    unitGudang: "GBB CISKID",
    status: "aktif",
    lastLogin: "15 Nov 2026, 11:30",
  },
  {
    id: "usr-operator-02",
    name: "Siti Rahmawati",
    email: "siti@bulog.co.id",
    nip: "19950512 201903 2 002",
    password: "operator123",
    role: "operator",
    unitGudang: "GBB CISKID",
    status: "aktif",
    lastLogin: "14 Nov 2026, 16:40",
  },
];
