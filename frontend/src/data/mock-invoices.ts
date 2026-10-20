import type { BillingInvoice, BusinessInfo, VoiceDraft } from "@/types/billing";

export const MOCK_BUSINESS: BusinessInfo = {
  id: "biz-001",
  name: "TechMart Electronics Pvt. Ltd.",
  logo_url: null,
  gst_number: "29AABCT1332L1ZP",
  phone: "+91 98765 43210",
  email: "billing@techmart.in",
  address: "42, MG Road, Bengaluru, Karnataka - 560001",
  signature_url: null,
  seal_url: null
};

/** Shown for new users who have not created any invoices yet. */
export const SAMPLE_INVOICES: BillingInvoice[] = [
  {
    id: "sample-gst-001",
    invoice_number: "SAMPLE-GST-001",
    invoice_type: "gst",
    is_sample: true,
    status: "paid",
    customer_name: "Rajesh Kumar Traders",
    customer_id: "sample-cust-gst",
    invoice_date: "2026-05-28",
    due_date: "2026-06-12",
    place_of_supply: "Karnataka",
    amount: 28450,
    bill_to: {
      name: "Rajesh Kumar Traders",
      gst_number: "29AABCR1234M1Z5",
      phone: "+91 98450 12345",
      email: "rajesh@rktraders.in",
      address: "15, Commercial Street, Bengaluru - 560001"
    },
    ship_to: {
      name: "Rajesh Kumar Traders",
      gst_number: "29AABCR1234M1Z5",
      phone: "+91 98450 12345",
      address: "Warehouse B, Peenya Industrial Area, Bengaluru - 560058"
    },
    line_items: [
      {
        id: "sli-gst-1",
        item_name: "Samsung Galaxy S24 Ultra 256GB",
        hsn_sac: "8517",
        serial_no: "SN-S24U-001234",
        imei: "356789012345678",
        quantity: 2,
        unit_price: 10999,
        gst_percent: 18,
        amount: 25957.64
      },
      {
        id: "sli-gst-2",
        item_name: "Samsung Galaxy Buds3 Pro",
        hsn_sac: "8518",
        serial_no: "SN-BUDS3-005678",
        quantity: 1,
        unit_price: 14999,
        gst_percent: 18,
        amount: 17698.82
      }
    ],
    totals: {
      subtotal: 36997,
      cgst: 0,
      sgst: 0,
      igst: 6659.46,
      discount: 15206.46,
      round_off: -0.46,
      grand_total: 28450,
      received_amount: 20000,
      balance_amount: 8450,
      amount_in_words: "Twenty Eight Thousand Four Hundred Fifty Rupees Only"
    },
    notes: "Sample GST invoice (inter-state IGST). Tap the mic to create your own.",
    created_at: "2026-05-28T10:30:00Z",
    updated_at: "2026-05-30T14:22:00Z"
  },
  {
    id: "sample-retail-001",
    invoice_number: "SAMPLE-RETAIL-001",
    invoice_type: "retail",
    is_sample: true,
    status: "paid",
    customer_name: "Walk-in Customer",
    customer_id: "sample-cust-retail",
    invoice_date: "2026-06-01",
    due_date: "2026-06-01",
    place_of_supply: "Karnataka",
    amount: 4720,
    bill_to: {
      name: "Walk-in Customer",
      phone: "+91 98765 43210",
      address: "Counter Sale"
    },
    ship_to: {
      name: "Walk-in Customer",
      address: "Counter Sale"
    },
    line_items: [
      {
        id: "sli-retail-1",
        item_name: "Boat Airdopes 441 Pro",
        hsn_sac: "8518",
        quantity: 2,
        unit_price: 1999,
        gst_percent: 18,
        amount: 4717.64
      }
    ],
    totals: {
      subtotal: 3998,
      cgst: 359.82,
      sgst: 359.82,
      igst: 0,
      discount: 0,
      round_off: 2.36,
      grand_total: 4720,
      received_amount: 4720,
      balance_amount: 0,
      amount_in_words: "Four Thousand Seven Hundred Twenty Rupees Only"
    },
    notes: "Sample retail bill (intra-state CGST + SGST). Tap the mic to create your own.",
    created_at: "2026-06-01T08:45:00Z",
    updated_at: "2026-06-01T08:45:00Z"
  }
];

export const MOCK_INVOICES: BillingInvoice[] = [
  {
    id: "inv-001",
    invoice_number: "INV-2026-0042",
    status: "paid",
    customer_name: "Rajesh Kumar Traders",
    customer_id: "cust-001",
    invoice_date: "2026-05-28",
    due_date: "2026-06-12",
    place_of_supply: "Karnataka",
    amount: 28450,
    bill_to: {
      name: "Rajesh Kumar Traders",
      gst_number: "29AABCR1234M1Z5",
      phone: "+91 98450 12345",
      email: "rajesh@rktraders.in",
      address: "15, Commercial Street, Bengaluru - 560001"
    },
    ship_to: {
      name: "Rajesh Kumar Traders",
      gst_number: "29AABCR1234M1Z5",
      phone: "+91 98450 12345",
      address: "Warehouse B, Peenya Industrial Area, Bengaluru - 560058"
    },
    line_items: [
      {
        id: "li-001",
        item_name: "Samsung Galaxy S24 Ultra 256GB",
        hsn_sac: "8517",
        serial_no: "SN-S24U-001234",
        imei: "356789012345678",
        quantity: 2,
        unit_price: 10999,
        gst_percent: 18,
        amount: 25957.64
      },
      {
        id: "li-002",
        item_name: "Samsung Galaxy Buds3 Pro",
        hsn_sac: "8518",
        serial_no: "SN-BUDS3-005678",
        quantity: 1,
        unit_price: 14999,
        gst_percent: 18,
        amount: 17698.82
      }
    ],
    totals: {
      subtotal: 36997,
      cgst: 0,
      sgst: 0,
      igst: 6659.46,
      discount: 15206.46,
      round_off: -0.46,
      grand_total: 28450,
      received_amount: 20000,
      balance_amount: 8450,
      amount_in_words: "Twenty Eight Thousand Four Hundred Fifty Rupees Only"
    },
    notes: "Payment terms: Net 15 days. Goods once sold will not be taken back.",
    created_at: "2026-05-28T10:30:00Z",
    updated_at: "2026-05-30T14:22:00Z"
  },
  {
    id: "inv-002",
    invoice_number: "INV-2026-0041",
    status: "sent",
    customer_name: "Priya Enterprises",
    customer_id: "cust-002",
    invoice_date: "2026-05-25",
    due_date: "2026-06-09",
    place_of_supply: "Tamil Nadu",
    amount: 45600,
    bill_to: {
      name: "Priya Enterprises",
      gst_number: "33AABCP5678K1Z2",
      phone: "+91 98765 67890",
      email: "accounts@priyaent.com",
      address: "88, Anna Salai, Chennai - 600002"
    },
    ship_to: {
      name: "Priya Enterprises - Branch Office",
      gst_number: "33AABCP5678K1Z2",
      phone: "+91 98765 67891",
      address: "Plot 12, Tidel Park, Chennai - 600113"
    },
    line_items: [
      {
        id: "li-003",
        item_name: "Dell Latitude 5540 Laptop i7/16GB/512GB",
        hsn_sac: "8471",
        serial_no: "DL-LAT-5540-78901",
        quantity: 3,
        unit_price: 72000,
        gst_percent: 18,
        amount: 254880
      },
      {
        id: "li-004",
        item_name: "Logitech MX Master 3S Mouse",
        hsn_sac: "8471",
        serial_no: "LG-MX3S-45678",
        quantity: 5,
        unit_price: 8999,
        gst_percent: 18,
        amount: 53094.1
      }
    ],
    totals: {
      subtotal: 307974.1,
      cgst: 0,
      sgst: 0,
      igst: 55435.34,
      discount: 317809.44,
      round_off: 0,
      grand_total: 45600,
      received_amount: 0,
      balance_amount: 45600,
      amount_in_words: "Forty Five Thousand Six Hundred Rupees Only"
    },
    notes: null,
    created_at: "2026-05-25T09:15:00Z",
    updated_at: "2026-05-25T09:15:00Z"
  },
  {
    id: "inv-003",
    invoice_number: "INV-2026-0040",
    status: "overdue",
    customer_name: "Sharma Mobile Hub",
    customer_id: "cust-003",
    invoice_date: "2026-05-10",
    due_date: "2026-05-25",
    place_of_supply: "Maharashtra",
    amount: 18750,
    bill_to: {
      name: "Sharma Mobile Hub",
      gst_number: "27AABCS9012H1Z8",
      phone: "+91 91234 56789",
      address: "Shop 7, Linking Road, Mumbai - 400050"
    },
    ship_to: {
      name: "Sharma Mobile Hub",
      gst_number: "27AABCS9012H1Z8",
      phone: "+91 91234 56789",
      address: "Shop 7, Linking Road, Mumbai - 400050"
    },
    line_items: [
      {
        id: "li-005",
        item_name: "OnePlus 12R 256GB",
        hsn_sac: "8517",
        serial_no: "OP12R-SN-112233",
        imei: "867530912345678",
        quantity: 5,
        unit_price: 3199,
        gst_percent: 18,
        amount: 18865.1
      }
    ],
    totals: {
      subtotal: 15995,
      cgst: 1439.55,
      sgst: 1439.55,
      igst: 0,
      discount: 124.2,
      round_off: 0,
      grand_total: 18750,
      received_amount: 5000,
      balance_amount: 13750,
      amount_in_words: "Eighteen Thousand Seven Hundred Fifty Rupees Only"
    },
    notes: "Urgent delivery requested.",
    created_at: "2026-05-10T11:00:00Z",
    updated_at: "2026-05-10T11:00:00Z"
  },
  {
    id: "inv-004",
    invoice_number: "INV-2026-0039",
    status: "draft",
    customer_name: "Green Valley Retail",
    customer_id: "cust-004",
    invoice_date: "2026-06-01",
    due_date: "2026-06-16",
    place_of_supply: "Kerala",
    amount: 9200,
    bill_to: {
      name: "Green Valley Retail",
      gst_number: "32AABCG3456L1Z4",
      phone: "+91 94470 11223",
      address: "MG Road, Kochi - 682016"
    },
    ship_to: {
      name: "Green Valley Retail",
      address: "MG Road, Kochi - 682016"
    },
    line_items: [
      {
        id: "li-006",
        item_name: "Boat Airdopes 441 Pro",
        hsn_sac: "8518",
        quantity: 10,
        unit_price: 780,
        gst_percent: 18,
        amount: 9204
      }
    ],
    totals: {
      subtotal: 7800,
      cgst: 702,
      sgst: 702,
      igst: 0,
      discount: 4,
      round_off: 0,
      grand_total: 9200,
      received_amount: 0,
      balance_amount: 9200,
      amount_in_words: "Nine Thousand Two Hundred Rupees Only"
    },
    notes: "Draft - pending customer confirmation.",
    created_at: "2026-06-01T08:45:00Z",
    updated_at: "2026-06-01T08:45:00Z"
  },
  {
    id: "inv-005",
    invoice_number: "INV-2026-0038",
    status: "paid",
    customer_name: "Metro Wholesale Distributors",
    customer_id: "cust-005",
    invoice_date: "2026-05-20",
    due_date: "2026-06-04",
    place_of_supply: "Delhi",
    amount: 125000,
    bill_to: {
      name: "Metro Wholesale Distributors",
      gst_number: "07AABCM7890P1Z1",
      phone: "+91 98100 99887",
      email: "purchase@metrowholesale.in",
      address: "Sector 18, Noida - 201301"
    },
    ship_to: {
      name: "Metro Wholesale - Godown 3",
      address: "Plot 45, Industrial Area, Ghaziabad - 201009"
    },
    line_items: [
      {
        id: "li-007",
        item_name: "HP LaserJet Pro M404dn Printer",
        hsn_sac: "8443",
        serial_no: "HP-M404-998877",
        quantity: 10,
        unit_price: 18500,
        gst_percent: 18,
        amount: 218300
      },
      {
        id: "li-008",
        item_name: "HP 59A Black Toner Cartridge",
        hsn_sac: "8443",
        batch: "BATCH-2026-Q2",
        quantity: 20,
        unit_price: 6200,
        gst_percent: 18,
        amount: 146320
      }
    ],
    totals: {
      subtotal: 309000,
      cgst: 0,
      sgst: 0,
      igst: 55620,
      discount: 239620,
      round_off: 0,
      grand_total: 125000,
      received_amount: 125000,
      balance_amount: 0,
      amount_in_words: "One Lakh Twenty Five Thousand Rupees Only"
    },
    notes: null,
    created_at: "2026-05-20T14:00:00Z",
    updated_at: "2026-05-22T10:30:00Z"
  },
  {
    id: "inv-006",
    invoice_number: "INV-2026-0037",
    status: "sent",
    customer_name: "Digital World Store",
    customer_id: "cust-006",
    invoice_date: "2026-05-18",
    due_date: "2026-06-02",
    place_of_supply: "Gujarat",
    amount: 34200,
    bill_to: {
      name: "Digital World Store",
      gst_number: "24AABCD4567G1Z3",
      phone: "+91 98250 33445",
      address: "CG Road, Ahmedabad - 380009"
    },
    ship_to: {
      name: "Digital World Store",
      address: "CG Road, Ahmedabad - 380009"
    },
    line_items: [
      {
        id: "li-009",
        item_name: "Apple iPad Air M2 128GB WiFi",
        hsn_sac: "8471",
        serial_no: "AP-IPAD-M2-556677",
        quantity: 4,
        unit_price: 59900,
        gst_percent: 18,
        amount: 282728
      }
    ],
    totals: {
      subtotal: 239600,
      cgst: 0,
      sgst: 0,
      igst: 43128,
      discount: 248528,
      round_off: 0,
      grand_total: 34200,
      received_amount: 10000,
      balance_amount: 24200,
      amount_in_words: "Thirty Four Thousand Two Hundred Rupees Only"
    },
    notes: null,
    created_at: "2026-05-18T16:20:00Z",
    updated_at: "2026-05-18T16:20:00Z"
  }
];

export const MOCK_VOICE_DRAFTS: VoiceDraft[] = [
  {
    id: "vd-001",
    title: "Voice draft - Sharma Mobile",
    created_at: "2026-06-02T09:30:00Z",
    extraction: {
      customer: "Sharma Mobile Hub",
      items: [
        { name: "OnePlus Nord CE4", serial_numbers: ["SN-001", "SN-002"], quantity: 2, rate: 24999 }
      ],
      transcript: "Create invoice for Sharma Mobile Hub, two OnePlus Nord CE4, serial numbers SN-001 and SN-002 at twenty four thousand nine hundred ninety nine each."
    }
  },
  {
    id: "vd-002",
    title: "Voice draft - Bulk accessories",
    created_at: "2026-06-01T15:45:00Z",
    extraction: {
      customer: "Green Valley Retail",
      items: [{ name: "USB-C Cable 2m", quantity: 50, rate: 299 }],
      transcript: "Invoice Green Valley Retail fifty USB-C cables two meter at two ninety nine each."
    }
  }
];
