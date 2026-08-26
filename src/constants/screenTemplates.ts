export type MobScreenId =
  | 'MOB-01' | 'MOB-02' | 'MOB-03' | 'MOB-04' | 'MOB-05' | 'MOB-06'
  | 'MOB-07' | 'MOB-08' | 'MOB-09' | 'MOB-10' | 'MOB-11' | 'MOB-12'
  | 'MOB-13' | 'MOB-14' | 'MOB-15' | 'MOB-16' | 'MOB-17' | 'MOB-18'
  | 'MOB-19' | 'MOB-20' | 'MOB-21' | 'MOB-22' | 'MOB-23' | 'MOB-24'
  | 'MOB-25' | 'MOB-26' | 'MOB-27' | 'MOB-28' | 'MOB-29' | 'MOB-30'
  | 'MOB-31' | 'MOB-32' | 'MOB-33' | 'MOB-34' | 'MOB-35';

export interface MobScreenTemplate {
  id: MobScreenId;
  code: string;
  name: string;
  screenComponent: string;
  category: 'AUTH' | 'MAIN' | 'GROUPS' | 'POSTS' | 'ORGANISATIONS' | 'FUNDRAISERS' | 'PROFILE' | 'WALLET' | 'NOTIFICATIONS';
  description: string;
}

export const MOB_SCREEN_TEMPLATES: Record<MobScreenId, MobScreenTemplate> = {
  'MOB-01': { id: 'MOB-01', code: 'MOB_01_WELCOME', name: 'Welcome Screen', screenComponent: 'WelcomeScreen', category: 'AUTH', description: 'App splash, value proposition, and login/signup navigation entry' },
  'MOB-02': { id: 'MOB-02', code: 'MOB_02_LOGIN', name: 'Login Screen', screenComponent: 'LoginScreen', category: 'AUTH', description: 'Email and password authentication screen' },
  'MOB-03': { id: 'MOB-03', code: 'MOB_03_SIGNUP', name: 'Sign Up Screen', screenComponent: 'SignUpScreen', category: 'AUTH', description: 'New account creation and registration flow' },
  'MOB-04': { id: 'MOB-04', code: 'MOB_04_PHONE_AUTH', name: 'Phone Auth Screen', screenComponent: 'PhoneAuthScreen', category: 'AUTH', description: 'Mobile phone number OTP verification & sign-in' },
  'MOB-05': { id: 'MOB-05', code: 'MOB_05_PASSWORD_RESET', name: 'Password Reset Screen', screenComponent: 'PasswordResetScreen', category: 'AUTH', description: 'Account password recovery and reset screen' },
  'MOB-06': { id: 'MOB-06', code: 'MOB_06_PROFILE_SETUP', name: 'Profile Setup Screen', screenComponent: 'ProfileSetupScreen', category: 'AUTH', description: 'First-time user profile details configuration' },
  'MOB-07': { id: 'MOB-07', code: 'MOB_07_HOME', name: 'Home Feed Screen', screenComponent: 'HomeScreen', category: 'MAIN', description: 'Main user dashboard, active group shortcuts, balance overview' },
  'MOB-08': { id: 'MOB-08', code: 'MOB_08_DISCOVERY', name: 'Discovery Screen', screenComponent: 'DiscoveryScreen', category: 'MAIN', description: 'Search and explore communities, organizations, and fundraisers' },
  'MOB-09': { id: 'MOB-09', code: 'MOB_09_GROUP_SELECTION', name: 'Group Selection Screen', screenComponent: 'GroupSelectionScreen', category: 'GROUPS', description: 'Quick group switcher and selection screen' },
  'MOB-10': { id: 'MOB-10', code: 'MOB_10_PROFILE', name: 'Profile Screen', screenComponent: 'ProfileScreen', category: 'PROFILE', description: 'User account details, settings, and KYC status' },
  'MOB-11': { id: 'MOB-11', code: 'MOB_11_VERIFY_IDENTITY_PROMPT', name: 'Verify Identity Prompt', screenComponent: 'VerifyIdentityPromptScreen', category: 'PROFILE', description: 'Identity verification / KYC prompt modal' },
  'MOB-12': { id: 'MOB-12', code: 'MOB_12_CONTRIBUTIONS', name: 'Contributions History', screenComponent: 'ContributionsScreen', category: 'WALLET', description: 'Ledger of all past group and campaign contributions' },
  'MOB-13': { id: 'MOB-13', code: 'MOB_13_CONTACTS_INVITE', name: 'Contacts & Invite', screenComponent: 'ContactsScreen', category: 'GROUPS', description: 'Invite contacts to join savings groups or organizations' },
  'MOB-14': { id: 'MOB-14', code: 'MOB_14_WALLET', name: 'Personal Wallet', screenComponent: 'WalletScreen', category: 'WALLET', description: 'Digital wallet balances, top-up, money transfers, and withdrawals' },
  'MOB-15': { id: 'MOB-15', code: 'MOB_15_GROUP_PURPOSE', name: 'Group Purpose Selection', screenComponent: 'GroupPurposeScreen', category: 'GROUPS', description: 'Select purpose & financial structure when creating a group' },
  'MOB-16': { id: 'MOB-16', code: 'MOB_16_CREATE_GROUP', name: 'Create Group Screen', screenComponent: 'CreateGroupScreen', category: 'GROUPS', description: 'Wizard for defining group name, rules, contribution amounts' },
  'MOB-17': { id: 'MOB-17', code: 'MOB_17_CREATE_GROUP_MODAL', name: 'Create Group Modal', screenComponent: 'CreateGroupScreen', category: 'GROUPS', description: 'Modal variant of group creation wizard' },
  'MOB-18': { id: 'MOB-18', code: 'MOB_18_GROUP_PREVIEW', name: 'Group Preview Screen', screenComponent: 'GroupPreviewScreen', category: 'GROUPS', description: 'Public details preview before requesting group membership' },
  'MOB-19': { id: 'MOB-19', code: 'MOB_19_GROUP_DETAIL', name: 'Group Detail Screen', screenComponent: 'GroupDetailScreen', category: 'GROUPS', description: 'Group overview, information, rules, and admin actions' },
  'MOB-20': { id: 'MOB-20', code: 'MOB_20_GROUP_FEED', name: 'Group Feed Screen', screenComponent: 'GroupFeedScreen', category: 'POSTS', description: 'Discussion feed, announcements, and posts within a group' },
  'MOB-21': { id: 'MOB-21', code: 'MOB_21_GROUP_MANAGEMENT', name: 'Group Management Console', screenComponent: 'GroupManagementScreen', category: 'GROUPS', description: 'Admin console for member requests, payouts, and transfers' },
  'MOB-22': { id: 'MOB-22', code: 'MOB_22_EDIT_GROUP', name: 'Edit Group Screen', screenComponent: 'EditGroupScreen', category: 'GROUPS', description: 'Update group rules, branding, and setting parameters' },
  'MOB-23': { id: 'MOB-23', code: 'MOB_23_GROUP_WALLET', name: 'Group Wallet Screen', screenComponent: 'GroupWalletScreen', category: 'WALLET', description: 'Shared group treasury, balances, and transfer approvals' },
  'MOB-24': { id: 'MOB-24', code: 'MOB_24_MEMBER_LIST', name: 'Member List Screen', screenComponent: 'MemberListScreen', category: 'GROUPS', description: 'Complete roster of active group members and roles' },
  'MOB-25': { id: 'MOB-25', code: 'MOB_25_MEMBER_PROFILE', name: 'Member Profile Screen', screenComponent: 'MemberProfileScreen', category: 'GROUPS', description: 'Individual group member details and contribution history' },
  'MOB-26': { id: 'MOB-26', code: 'MOB_26_CREATE_EDIT_POST', name: 'Create / Edit Post Screen', screenComponent: 'CreatePostScreen', category: 'POSTS', description: 'Compose or edit a group feed announcement or post' },
  'MOB-27': { id: 'MOB-27', code: 'MOB_27_POST_DETAIL', name: 'Post Detail Screen', screenComponent: 'PostDetailScreen', category: 'POSTS', description: 'Full post view with comments, replies, and sharing options' },
  'MOB-28': { id: 'MOB-28', code: 'MOB_28_FUNDRAISERS', name: 'Fundraisers Screen', screenComponent: 'FundraisersScreen', category: 'FUNDRAISERS', description: 'Community fundraising campaigns and emergency causes' },
  'MOB-29': { id: 'MOB-29', code: 'MOB_29_CREATE_CAMPAIGN', name: 'Create Campaign Screen', screenComponent: 'CreateCampaignScreen', category: 'FUNDRAISERS', description: 'Launch a new community or group-linked fundraiser campaign' },
  'MOB-30': { id: 'MOB-30', code: 'MOB_30_CAMPAIGN_DETAIL', name: 'Campaign Detail Screen', screenComponent: 'CampaignDetailScreen', category: 'FUNDRAISERS', description: 'Fundraiser campaign progress, donation goal, and action buttons' },
  'MOB-31': { id: 'MOB-31', code: 'MOB_31_CREATE_ORGANISATION', name: 'Create Organisation Screen', screenComponent: 'CreateOrganisationScreen', category: 'ORGANISATIONS', description: 'Register a new church, NGO, or formal organization' },
  'MOB-32': { id: 'MOB-32', code: 'MOB_32_ORGANISATION_PREVIEW', name: 'Organisation Preview Screen', screenComponent: 'OrganisationPreviewScreen', category: 'ORGANISATIONS', description: 'Public organization overview before joining' },
  'MOB-33': { id: 'MOB-33', code: 'MOB_33_ORGANISATION_DETAIL', name: 'Organisation Detail Screen', screenComponent: 'OrganisationDetailScreen', category: 'ORGANISATIONS', description: 'Organization hub, campaigns, sub-groups, and management' },
  'MOB-34': { id: 'MOB-34', code: 'MOB_34_EDIT_ORGANISATION', name: 'Edit Organisation Screen', screenComponent: 'EditOrganisationScreen', category: 'ORGANISATIONS', description: 'Update organization branding, details, and administrators' },
  'MOB-35': { id: 'MOB-35', code: 'MOB_35_NOTIFICATIONS', name: 'Notification Screen', screenComponent: 'NotificationScreen', category: 'NOTIFICATIONS', description: 'In-app notification center for activity and transactional updates' },
};
