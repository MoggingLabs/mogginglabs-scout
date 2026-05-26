export class ProfileNotProvisionedError extends Error {
  readonly profileId: string;

  constructor(profileId: string) {
    super(`Profile is not provisioned for user ${profileId}.`);
    this.name = "ProfileNotProvisionedError";
    this.profileId = profileId;
  }
}

export class NoActiveMembershipError extends Error {
  readonly profileId: string;

  constructor(profileId: string) {
    super(`No active tenant membership exists for profile ${profileId}.`);
    this.name = "NoActiveMembershipError";
    this.profileId = profileId;
  }
}
