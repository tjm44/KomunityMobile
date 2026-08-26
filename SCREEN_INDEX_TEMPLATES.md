# 📱 Komunity Mobile & Web Screen Index Templates (`MOB_` & `WEB_`)

This document provides a template reference and directory mapping for all mobile screens (`MOB_`) and web pages (`WEB_`).
The temporary visual indexes (on-screen badges) have been **hidden** from the UI by default (`SHOW_DEV_BADGE = false`).

---

## 📱 Mobile Screen Templates (`MOB_`)

| Index | Screen Code | Component | Category | Description |
| :--- | :--- | :--- | :--- | :--- |
| **MOB-01** | `MOB_01_WELCOME` | `WelcomeScreen` | AUTH | App splash, value proposition, and sign-in entry point |
| **MOB-02** | `MOB_02_LOGIN` | `LoginScreen` | AUTH | Email and password authentication screen |
| **MOB-03** | `MOB_03_SIGNUP` | `SignUpScreen` | AUTH | New account registration & sign-up |
| **MOB-04** | `MOB_04_PHONE_AUTH` | `PhoneAuthScreen` | AUTH | Mobile phone number OTP verification & sign-in |
| **MOB-05** | `MOB_05_PASSWORD_RESET` | `PasswordResetScreen` | AUTH | Password recovery and reset flow |
| **MOB-06** | `MOB_06_PROFILE_SETUP` | `ProfileSetupScreen` | AUTH | Initial user profile setup & metadata configuration |
| **MOB-07** | `MOB_07_HOME` | `HomeScreen` | MAIN | Dashboard feed, collective balance summary, and quick actions |
| **MOB-08** | `MOB_08_DISCOVERY` | `DiscoveryScreen` | MAIN | Search & explore communities, organizations, and causes |
| **MOB-09** | `MOB_09_GROUP_SELECTION` | `GroupSelectionScreen` | GROUPS | Quick group switcher modal |
| **MOB-10** | `MOB_10_PROFILE` | `ProfileScreen` | PROFILE | User settings, multi-factor security, and KYC badge status |
| **MOB-11** | `MOB_11_VERIFY_IDENTITY_PROMPT` | `VerifyIdentityPromptScreen` | PROFILE | Identity verification (KYC) prompt modal |
| **MOB-12** | `MOB_12_CONTRIBUTIONS` | `ContributionsScreen` | WALLET | Transaction history & live ledger of contributions |
| **MOB-13** | `MOB_13_CONTACTS_INVITE` | `ContactsScreen` | GROUPS | Invite phone contacts to groups and stokvels |
| **MOB-14** | `MOB_14_WALLET` | `WalletScreen` | WALLET | Personal digital wallet, top-up, send money, and withdraw |
| **MOB-15** | `MOB_15_GROUP_PURPOSE` | `GroupPurposeScreen` | GROUPS | Select purpose & financial structure for a new group |
| **MOB-16** | `MOB_16_CREATE_GROUP` | `CreateGroupScreen` | GROUPS | Group creation wizard (name, rules, contribution schedule) |
| **MOB-17** | `MOB_17_CREATE_GROUP_MODAL` | `CreateGroupScreen` (Modal) | GROUPS | Modal variant of group creation flow |
| **MOB-18** | `MOB_18_GROUP_PREVIEW` | `GroupPreviewScreen` | GROUPS | Public preview before requesting group membership |
| **MOB-19** | `MOB_19_GROUP_DETAIL` | `GroupDetailScreen` | GROUPS | Group overview, information, rules, and admin actions |
| **MOB-20** | `MOB_20_GROUP_FEED` | `GroupFeedScreen` | POSTS | Discussion feed, announcements, and posts within a group |
| **MOB-21** | `MOB_21_GROUP_MANAGEMENT` | `GroupManagementScreen` | GROUPS | Group admin console (requests, payouts, transfers, rules) |
| **MOB-22** | `MOB_22_EDIT_GROUP` | `EditGroupScreen` | GROUPS | Update group rules, settings, and branding |
| **MOB-23** | `MOB_23_GROUP_WALLET` | `GroupWalletScreen` | WALLET | Shared group wallet balances and transfer approvals |
| **MOB-24** | `MOB_24_MEMBER_LIST` | `MemberListScreen` | GROUPS | Complete directory of active group members & roles |
| **MOB-25** | `MOB_25_MEMBER_PROFILE` | `MemberProfileScreen` | GROUPS | View individual group member profile & contributions |
| **MOB-26** | `MOB_26_CREATE_EDIT_POST` | `CreatePostScreen` | POSTS | Create or edit group feed announcement or post |
| **MOB-27** | `MOB_27_POST_DETAIL` | `PostDetailScreen` | POSTS | Detailed post view with comments, replies, and sharing |
| **MOB-28** | `MOB_28_FUNDRAISERS` | `FundraisersScreen` | FUNDRAISERS | Community fundraising campaigns & emergency causes |
| **MOB-29** | `MOB_29_CREATE_CAMPAIGN` | `CreateCampaignScreen` | FUNDRAISERS | Launch new group-linked or community fundraiser campaign |
| **MOB-30** | `MOB_30_CAMPAIGN_DETAIL` | `CampaignDetailScreen` | FUNDRAISERS | Campaign progress, milestone tracking, and donation modal |
| **MOB-31** | `MOB_31_CREATE_ORGANISATION` | `CreateOrganisationScreen` | ORGANISATIONS | Register new church, NGO, or formal organization |
| **MOB-32** | `MOB_32_ORGANISATION_PREVIEW` | `OrganisationPreviewScreen` | ORGANISATIONS | Public organization overview before joining |
| **MOB-33** | `MOB_33_ORGANISATION_DETAIL` | `OrganisationDetailScreen` | ORGANISATIONS | Organization hub, sub-groups, campaigns, and settings |
| **MOB-34** | `MOB_34_EDIT_ORGANISATION` | `EditOrganisationScreen` | ORGANISATIONS | Update organization details, cover image, and admins |
| **MOB-35** | `MOB_35_NOTIFICATIONS` | `NotificationScreen` | NOTIFICATIONS | In-app notification center and system alerts |

---

## 💻 Web Screen Templates (`WEB_`)

| Index | Screen Code | Path / Route | Category | Description |
| :--- | :--- | :--- | :--- | :--- |
| **WEB-01** | `WEB_01_LANDING` | `/` | PUBLIC | Main public landing page and value proposition |
| **WEB-02** | `WEB_02_PUBLIC_FUNDRAISERS` | `/dashboard/fundraisers/public` | PUBLIC | Publicly accessible fundraiser campaigns showcase |
| **WEB-03** | `WEB_03_LOGIN` | `/login` | AUTH | Web user sign-in and authentication |
| **WEB-04** | `WEB_04_REGISTER` | `/register` | AUTH | New user account registration |
| **WEB-05** | `WEB_05_FORGOT_PASSWORD` | `/forgot-password` | AUTH | Account password recovery flow |
| **WEB-06** | `WEB_06_DASHBOARD_HOME` | `/dashboard` | DASHBOARD | Main user dashboard hub & activity overview |
| **WEB-07** | `WEB_07_SEARCH_DISCOVERY` | `/dashboard/search` | DASHBOARD | Global search and exploration of groups & organizations |
| **WEB-08** | `WEB_08_PROFILE` | `/dashboard/profile` | PROFILE | User profile, security settings, and KYC status |
| **WEB-09** | `WEB_09_WALLET` | `/dashboard/wallet` | WALLET | Personal digital wallet, top-up, send, withdraw, history |
| **WEB-10** | `WEB_10_GROUPS_LIST` | `/dashboard/groups` | GROUPS | Overview of joined groups, stokvels, and community funds |
| **WEB-11** | `WEB_11_GROUP_DETAIL` | `/dashboard/groups/[id]` | GROUPS | Group discussion feed, announcements, and details |
| **WEB-12** | `WEB_12_GROUP_MANAGE` | `/dashboard/groups/[id]/manage` | GROUPS | Group administration console, payout & request approvals |
| **WEB-13** | `WEB_13_POST_DETAIL` | `/dashboard/groups/[id]/posts/[postId]` | POSTS | Post discussion view with comments, replies, and sharing |
| **WEB-14** | `WEB_14_FUNDRAISERS_DASHBOARD` | `/dashboard/fundraisers` | FUNDRAISERS | Dashboard of active fundraising campaigns |
| **WEB-15** | `WEB_15_CREATE_FUNDRAISER` | `/dashboard/fundraisers/create` | FUNDRAISERS | Launch new community cause or fundraiser campaign |
| **WEB-16** | `WEB_16_ORGANISATIONS_LIST` | `/dashboard/organisations` | ORGANISATIONS | Directory of registered organizations, churches, and NGOs |
| **WEB-17** | `WEB_17_ORGANISATION_DETAIL` | `/dashboard/organisations/[id]` | ORGANISATIONS | Organization hub, sub-campaigns, and details |
| **WEB-18** | `WEB_18_CREATE_ORGANISATION` | `/dashboard/organisations/create` | ORGANISATIONS | Register a new organization entity |

---

## ⚙️ Visibility Control

Both mobile and web components maintain a `SHOW_DEV_BADGE` toggle:
- Mobile: `src/components/DevScreenBadge.tsx` -> `SHOW_DEV_BADGE = false`
- Web: `components/DevBadge.tsx` -> `SHOW_DEV_BADGE = false`

To re-enable temporary visual index overlays during development or design reviews, set `SHOW_DEV_BADGE = true` or pass `visible={true}` to the badge component.
