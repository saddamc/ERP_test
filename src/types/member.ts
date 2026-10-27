export type MemberStatusCode = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXPIRED";

export type SubLedgerType = "SUBSCRIPTION" | "DINING" | "CARD_ROOM";

export interface MemberSpouseItem {
  id?: string;
  spouseIndex: number;
  name: string;
  dob?: string | null;
  mobile?: string | null;
  bloodGroup?: string | null;
  anniversary?: string | null;
  email?: string | null;
  signatureUrl?: string | null;
}

export interface MemberChildItem {
  id?: string;
  childIndex: number;
  name: string;
  dob?: string | null;
  gender?: string | null;
}

export interface MemberReferenceItem {
  id?: string;
  refMemberNo?: string | null;
  refName: string;
  phone?: string | null;
}

export interface MemberNomineeItem {
  id?: string;
  name: string;
  relation: string;
  phone?: string | null;
  sharePercent: number;
}

export interface MemberProfile {
  id: string;
  accountNo: string;
  prefix?: string | null;
  title?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  bloodGroup?: string | null;
  profession?: string | null;
  creditLimit: number;
  status: MemberStatusCode;
  
  // 3 Sub-Ledger live balances
  subscriptionBalance: number;
  diningBalance: number;
  cardRoomBalance: number;
  totalOutstanding: number;

  spouses: MemberSpouseItem[];
  children: MemberChildItem[];
  references: MemberReferenceItem[];
  nominees: MemberNomineeItem[];
}
