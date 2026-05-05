import { cache } from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// ============================================================
// UserAccess Type — all access booleans + identity
// ============================================================

export interface UserAccess {
  userId: number;
  email: string;
  name: string;
  isSuperAdmin: boolean;

  // dashboard
  accessDashboardGeneralRead: boolean;
  // unit
  accessUnitRead: boolean;
  accessUnitCreate: boolean;
  accessUnitUpdate: boolean;
  accessUnitDelete: boolean;
  accessUnitReport: boolean;
  // accessory
  accessAccessoryRead: boolean;
  accessAccessoryCreate: boolean;
  accessAccessoryUpdate: boolean;
  accessAccessorySell: boolean;
  accessAccessoryDelete: boolean;
  accessAccessoryReport: boolean;
  accessAccessoryHistory: boolean;
  // message
  accessMessageSend: boolean;
  accessMessageHistory: boolean;
  // customer
  accessCustomerRead: boolean;
  accessCustomerCreate: boolean;
  accessCustomerUpdate: boolean;
  accessCustomerDelete: boolean;
  // user
  accessUserRead: boolean;
  accessUserCreate: boolean;
  accessUserUpdate: boolean;
  accessUserDelete: boolean;
  // worker
  accessWorkerRead: boolean;
  accessWorkerCreate: boolean;
  accessWorkerUpdate: boolean;
  accessWorkerDelete: boolean;
  accessWorkerReport: boolean;
  // information
  accessInformationRead: boolean;
  accessInformationUpdate: boolean;
  // cashflow
  accessCashflowRead: boolean;
  accessCashflowCreate: boolean;
  accessCashflowUpdate: boolean;
  accessCashflowDelete: boolean;
  // imbursement
  accessImbursementRead: boolean;
  accessImbursementCreate: boolean;
  accessImbursementUpdate: boolean;
  accessImbursementDelete: boolean;
}

// ============================================================
// getCurrentUserAccess — cached per request cycle
// ============================================================

export const getCurrentUserAccess = cache(
  async (): Promise<UserAccess | null> => {
    const session = await getSession();
    if (!session) return null;

    const user = await prisma.user.findFirst({
      where: { id: session.userId, deletedAt: null },
      omit: { password: true },
    });

    if (!user) {
      // User deleted or not found — session is invalid
      return null;
    }

    const sa = user.isSuperAdmin;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: sa,

      accessDashboardGeneralRead: sa || user.accessDashboardGeneralRead,

      accessUnitRead: sa || user.accessUnitRead,
      accessUnitCreate: sa || user.accessUnitCreate,
      accessUnitUpdate: sa || user.accessUnitUpdate,
      accessUnitDelete: sa || user.accessUnitDelete,
      accessUnitReport: sa || user.accessUnitReport,

      accessAccessoryRead: sa || user.accessAccessoryRead,
      accessAccessoryCreate: sa || user.accessAccessoryCreate,
      accessAccessoryUpdate: sa || user.accessAccessoryUpdate,
      accessAccessorySell: sa || user.accessAccessorySell,
      accessAccessoryDelete: sa || user.accessAccessoryDelete,
      accessAccessoryReport: sa || user.accessAccessoryReport,
      accessAccessoryHistory: sa || user.accessAccessoryHistory,

      accessMessageSend: sa || user.accessMessageSend,
      accessMessageHistory: sa || user.accessMessageHistory,

      accessCustomerRead: sa || user.accessCustomerRead,
      accessCustomerCreate: sa || user.accessCustomerCreate,
      accessCustomerUpdate: sa || user.accessCustomerUpdate,
      accessCustomerDelete: sa || user.accessCustomerDelete,

      accessUserRead: sa || user.accessUserRead,
      accessUserCreate: sa || user.accessUserCreate,
      accessUserUpdate: sa || user.accessUserUpdate,
      accessUserDelete: sa || user.accessUserDelete,

      accessWorkerRead: sa || user.accessWorkerRead,
      accessWorkerCreate: sa || user.accessWorkerCreate,
      accessWorkerUpdate: sa || user.accessWorkerUpdate,
      accessWorkerDelete: sa || user.accessWorkerDelete,
      accessWorkerReport: sa || user.accessWorkerReport,

      accessInformationRead: sa || user.accessInformationRead,
      accessInformationUpdate: sa || user.accessInformationUpdate,

      accessCashflowRead: sa || user.accessCashflowRead,
      accessCashflowCreate: sa || user.accessCashflowCreate,
      accessCashflowUpdate: sa || user.accessCashflowUpdate,
      accessCashflowDelete: sa || user.accessCashflowDelete,

      accessImbursementRead: sa || user.accessImbursementRead,
      accessImbursementCreate: sa || user.accessImbursementCreate,
      accessImbursementUpdate: sa || user.accessImbursementUpdate,
      accessImbursementDelete: sa || user.accessImbursementDelete,
    };
  },
);
