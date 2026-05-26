export type MembershipRole = "owner" | "admin" | "member" | "viewer";

export type Membership = {
  id: string;
  tenantId: string;
  profileId: string;
  role: MembershipRole;
  createdAt: string;
  updatedAt: string;
};
