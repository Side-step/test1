export const PLATFORM = {
  name: "S2E",
  fullName: "Social-to-Earn",
  tagline: "Earn rewards for real social engagement",
  minWithdrawalTokens: 500,
  signupReward: 50,
  socialLinkReward: 30,
  referralReward: 100,
  minTwitterAgeDays: 30,
  minTwitterFollowers: 10,
  referralMissionsRequired: 3,
} as const;

export const SOCIAL_PLATFORMS = {
  X: { name: "X (Twitter)", icon: "x-twitter", color: "#000000" },
  TELEGRAM: { name: "Telegram", icon: "telegram", color: "#26A5E4" },
  INSTAGRAM: { name: "Instagram", icon: "instagram", color: "#E4405F" },
  DISCORD: { name: "Discord", icon: "discord", color: "#5865F2" },
  YOUTUBE: { name: "YouTube", icon: "youtube", color: "#FF0000" },
} as const;
