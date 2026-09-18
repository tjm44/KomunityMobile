import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PurposeSelection } from '../screens/GroupPurposeScreen';
import type { Group, GroupMember, Campaign, Post, Organisation } from '../types';

export type RootStackParamList = {
  // Main Tab Container
  MainTabs: { initialTab?: 'home' | 'discovery' | 'wallet' | 'profile' | 'fundraisers'; preselectedCampaign?: Campaign } | undefined;

  // Onboarding / Setup Screens
  ProfileSetup: undefined;
  VerifyIdentityPrompt: { profileId?: number | string } | undefined;
  GroupSelection: undefined;
  GroupPurpose: undefined;

  // Group Screens
  GroupFeed: { group: Group };
  GroupDetail: { group: Group };
  GroupPreview: { group: Group };
  GroupManagement: { group: Group; refreshKey?: number };
  GroupWallet: { group: Group };
  GroupDuesLedger: { group: Group };
  MemberList: { group: Group };
  MemberProfile: { membership: GroupMember; isAdmin?: boolean };
  CreateGroup: { purpose?: string; fund_description?: string } | undefined;
  EditGroup: { group: Group };
  Contacts: { groupId: number | string };

  // Post Screens
  PostDetail: { post: Post };
  CreatePost: { group?: Group; post?: Post } | undefined;

  // Campaign Screens
  CreateCampaign: { group: Group };
  CampaignDetail: { campaign: Campaign };
  Contributions: undefined;

  // Organisation Screens
  CreateOrganisation: undefined;
  OrganisationDetail: { organisation: Organisation };
  OrganisationPreview: { organisation: Organisation };
  EditOrganisation: { organisation: Organisation };

  // Notifications
  Notifications: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneAuth: { sessionNotice?: string | null } | undefined;
  Login: undefined;
  SignUp: undefined;
  PasswordReset: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type AuthStackNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
