-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PRESIDENT', 'SECRETARY', 'FINANCE', 'ADMIN');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccountCategory" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('JOURNAL', 'CASH_PAYMENT', 'CASH_RECEIVE', 'BANK_PAYMENT', 'BANK_RECEIVE', 'CONTRA');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'QUEUED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubLedgerType" AS ENUM ('SUBSCRIPTION', 'DINING', 'CARD_ROOM');

-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'MOBILE_WALLET');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FINANCE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "prefix" TEXT,
    "title" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "profession" TEXT,
    "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberSpouse" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "spouseIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "mobile" TEXT,
    "bloodGroup" TEXT,
    "anniversary" TIMESTAMP(3),
    "email" TEXT,
    "signatureUrl" TEXT,

    CONSTRAINT "MemberSpouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberChild" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "childIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" TEXT,

    CONSTRAINT "MemberChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberReference" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "refMemberNo" TEXT,
    "refName" TEXT NOT NULL,
    "phone" TEXT,

    CONSTRAINT "MemberReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberNominee" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "phone" TEXT,
    "sharePercent" DECIMAL(5,2) NOT NULL DEFAULT 100.00,

    CONSTRAINT "MemberNominee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountHead" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AccountCategory" NOT NULL,
    "isControlHead" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "voucherDate" TIMESTAMP(3) NOT NULL,
    "bankCode" TEXT,
    "bankName" TEXT,
    "paymentTo" TEXT,
    "narration" TEXT NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherLine" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "VoucherLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralLedgerEntry" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "financialAccountId" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "entryDate" TIMESTAMP(3) NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberLedgerEntry" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "voucherId" TEXT,
    "ledgerType" "SubLedgerType" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "runningBalance" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "subscriptionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "diningAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "cardRoomAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "advanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gatewayRef" TEXT,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL DEFAULT 'BANK',
    "provider" TEXT,
    "accountNumber" TEXT,
    "accountCode" TEXT,
    "bankIdentifierCode" TEXT,
    "branchName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "accountHeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Member_accountNo_key" ON "Member"("accountNo");

-- CreateIndex
CREATE UNIQUE INDEX "AccountHead_code_key" ON "AccountHead"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNo_key" ON "Voucher"("voucherNo");

-- AddForeignKey
ALTER TABLE "MemberSpouse" ADD CONSTRAINT "MemberSpouse_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberChild" ADD CONSTRAINT "MemberChild_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberReference" ADD CONSTRAINT "MemberReference_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberNominee" ADD CONSTRAINT "MemberNominee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountHead" ADD CONSTRAINT "AccountHead_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherLine" ADD CONSTRAINT "VoucherLine_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherLine" ADD CONSTRAINT "VoucherLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GeneralLedgerEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GeneralLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralLedgerEntry" ADD CONSTRAINT "GeneralLedgerEntry_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberLedgerEntry" ADD CONSTRAINT "MemberLedgerEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberLedgerEntry" ADD CONSTRAINT "MemberLedgerEntry_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_accountHeadId_fkey" FOREIGN KEY ("accountHeadId") REFERENCES "AccountHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

