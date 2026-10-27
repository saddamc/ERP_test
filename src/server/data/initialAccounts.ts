export interface InitialAccount {
  code: string;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  controlHead: string;
  isBank?: boolean;
  isCash?: boolean;
}

export const INITIAL_CHART_OF_ACCOUNTS: InitialAccount[] = [
  // 1000 ASSETS - CASH & BANK
  { code: "1001", name: "Main Cash in Hand Desk", category: "ASSET", controlHead: "Current Assets", isCash: true },
  { code: "1002", name: "Secretary Office Petty Cash", category: "ASSET", controlHead: "Current Assets", isCash: true },
  { code: "1101", name: "Sonali Bank - Main Operational A/C", category: "ASSET", controlHead: "Bank Accounts", isBank: true },
  { code: "1102", name: "Dhaka Bank - Club Development Fund", category: "ASSET", controlHead: "Bank Accounts", isBank: true },
  { code: "1103", name: "City Bank - Credit Card Settlement A/C", category: "ASSET", controlHead: "Bank Accounts", isBank: true },

  // 1120 MEMBER RECEIVABLES (CONTROL HEADS)
  { code: "1121", name: "Member Subscription Receivable", category: "ASSET", controlHead: "Member Receivables" },
  { code: "1122", name: "Member Dining Room Receivable", category: "ASSET", controlHead: "Member Receivables" },
  { code: "1123", name: "Member Card Room Receivable", category: "ASSET", controlHead: "Member Receivables" },
  { code: "1124", name: "Guest & Miscellaneous Receivables", category: "ASSET", controlHead: "Member Receivables" },

  // 2000 LIABILITIES
  { code: "2001", name: "Member Advance Deposits Payable", category: "LIABILITY", controlHead: "Current Liabilities" },
  { code: "2002", name: "General Accounts Payable (Suppliers)", category: "LIABILITY", controlHead: "Current Liabilities" },
  { code: "2003", name: "Accrued Utility Bills (DESCO / Titas)", category: "LIABILITY", controlHead: "Current Liabilities" },
  { code: "2004", name: "Staff Provident Fund Payable", category: "LIABILITY", controlHead: "Current Liabilities" },

  // 3000 EQUITY / CAPITAL FUND
  { code: "3001", name: "Club General Capital Fund", category: "EQUITY", controlHead: "Club Equity" },
  { code: "3002", name: "Retained Surplus / (Deficit)", category: "EQUITY", controlHead: "Club Equity" },

  // 4000 REVENUE / INCOME
  { code: "4001", name: "Monthly / Annual Subscription Income", category: "INCOME", controlHead: "Membership Income" },
  { code: "4002", name: "New Member Admission & Registration Fee", category: "INCOME", controlHead: "Membership Income" },
  { code: "4101", name: "Dining Room & Restaurant Food Sales", category: "INCOME", controlHead: "Facility Income" },
  { code: "4102", name: "Beverage & Soft Drinks Sales", category: "INCOME", controlHead: "Facility Income" },
  { code: "4201", name: "Card Room Daily Table Charges", category: "INCOME", controlHead: "Card Room Income" },
  { code: "4202", name: "Card Tournament Registration Fees", category: "INCOME", controlHead: "Card Room Income" },
  { code: "4301", name: "Club Community Hall Rent Income", category: "INCOME", controlHead: "Miscellaneous Income" },

  // 5000 EXPENSES (SUB-CODES & CATEGORIES)
  { code: "5101", name: "Staff Salaries, Wages & Allowances", category: "EXPENSE", controlHead: "5100 Administrative" },
  { code: "5102", name: "Printing, Stationery & Ledger Forms", category: "EXPENSE", controlHead: "5100 Administrative" },
  { code: "5103", name: "Telephone, SMS & Internet Charges", category: "EXPENSE", controlHead: "5100 Administrative" },
  { code: "5104", name: "Audit & Professional Legal Fees", category: "EXPENSE", controlHead: "5100 Administrative" },
  { code: "5201", name: "Food & Kitchen Grocery Purchases", category: "EXPENSE", controlHead: "5200 Dining & Catering" },
  { code: "5202", name: "Beverage & Bakery Purchases", category: "EXPENSE", controlHead: "5200 Dining & Catering" },
  { code: "5203", name: "Kitchen Gas, Fuel & Cooking Utensils", category: "EXPENSE", controlHead: "5200 Dining & Catering" },
  { code: "5301", name: "Playing Cards & Card Room Consumables", category: "EXPENSE", controlHead: "5300 Card Room & Sports" },
  { code: "5302", name: "Billiard & Table Maintenance", category: "EXPENSE", controlHead: "5300 Card Room & Sports" },
  { code: "5401", name: "Electricity Bills & Generator Diesel", category: "EXPENSE", controlHead: "5400 Club Maintenance" },
  { code: "5402", name: "Building Repair, Painting & Plumbing", category: "EXPENSE", controlHead: "5400 Club Maintenance" },
  { code: "5403", name: "Security Guard & Cleaning Services", category: "EXPENSE", controlHead: "5400 Club Maintenance" },
];
