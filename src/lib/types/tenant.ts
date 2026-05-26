export type TenantStatus = "active" | "archived";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
};
