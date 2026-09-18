import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AuthNavigator } from './AuthNavigator';
import { MainTabsScreen } from './MainTabsScreen';
import { useAuth } from '../context/AuthContext';
import { gradients } from '../constants/theme';
import type { RootStackParamList } from './types';
import type { PurposeSelection } from '../screens/GroupPurposeScreen';
import type { Campaign, Post, Group } from '../types';

// Screen imports
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import VerifyIdentityPromptScreen from '../screens/VerifyIdentityPromptScreen';
import GroupSelectionScreen from '../screens/GroupSelectionScreen';
import GroupPurposeScreen from '../screens/GroupPurposeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupFeedScreen from '../screens/GroupFeedScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupPreviewScreen from '../screens/GroupPreviewScreen';
import GroupManagementScreen from '../screens/GroupManagementScreen';
import GroupWalletScreen from '../screens/GroupWalletScreen';
import GroupDuesLedgerScreen from '../screens/GroupDuesLedgerScreen';
import MemberListScreen from '../screens/MemberListScreen';
import MemberProfileScreen from '../screens/MemberProfileScreen';
import EditGroupScreen from '../screens/EditGroupScreen';
import ContactsScreen from '../screens/ContactsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import CreateCampaignScreen from '../screens/CreateCampaignScreen';
import CampaignDetailScreen from '../screens/CampaignDetailScreen';
import ContributionsScreen from '../screens/ContributionsScreen';
import CreateOrganisationScreen from '../screens/CreateOrganisationScreen';
import OrganisationDetailScreen from '../screens/OrganisationDetailScreen';
import OrganisationPreviewScreen from '../screens/OrganisationPreviewScreen';
import EditOrganisationScreen from '../screens/EditOrganisationScreen';
import NotificationScreen from '../screens/NotificationScreen';
import AnimatedScreen from '../components/AnimatedScreen';
import TopNavBar from '../components/TopNavBar';
import DevScreenBadge from '../components/DevScreenBadge';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const {
    isLoggedIn,
    needsProfileSetup,
    userProfile,
    unreadNotificationCount,
    fetchUnreadNotificationCount,
    checkProfileStatus,
    setNeedsProfileSetup,
  } = useAuth();

  // GroupPurpose->CreateGroup data flows as local state between adjacent screens
  const [groupPurposeSelection, setGroupPurposeSelection] = useState<PurposeSelection | null>(null);
  const [managementRefreshKey, setManagementRefreshKey] = useState(0);

  if (!isLoggedIn) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthNavigator />
      </>
    );
  }

  if (needsProfileSetup) {
    return (
      <>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <ProfileSetupScreen
            onComplete={async () => {
              setNeedsProfileSetup(false);
              await checkProfileStatus();
              // After setup, they will see VerifyIdentity via root stack push
            }}
          />
          <DevScreenBadge id="MOB-06" />
        </View>
      </>
    );
  }

  const notificationBell = (onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      style={{ position: 'relative', padding: 4 }}
    >
      <Text style={{ fontSize: 20 }}>🔔</Text>
      {unreadNotificationCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -4,
            backgroundColor: '#ef4444',
            borderRadius: 9,
            minWidth: 16,
            height: 16,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 3,
            borderWidth: 1.5,
            borderColor: '#ffffff',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: 'bold' }}>
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {/* ── Main Tabs ── */}
        <Stack.Screen name="MainTabs" component={MainTabsScreen} />

        {/* ── Onboarding ── */}
        <Stack.Screen name="VerifyIdentityPrompt">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <VerifyIdentityPromptScreen
                profileId={userProfile?.id as number}
                onVerified={async () => {
                  await checkProfileStatus();
                  navigation.navigate('GroupSelection');
                }}
                onSkip={() => navigation.navigate('GroupSelection')}
              />
              <DevScreenBadge id="MOB-11" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="GroupSelection">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <GroupSelectionScreen
                onJoin={() => navigation.navigate('MainTabs', { initialTab: 'discovery' })}
                onCreate={() => navigation.navigate('GroupPurpose')}
                onCreateOrganisation={() => navigation.navigate('CreateOrganisation')}
              />
              <DevScreenBadge id="MOB-15" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="GroupPurpose">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <GroupPurposeScreen
                onSelect={(selection) => {
                  setGroupPurposeSelection(selection);
                  navigation.navigate('CreateGroup', {
                    purpose: selection.purpose,
                    fund_description: selection.fund_description,
                  });
                }}
                onBack={() => navigation.goBack()}
              />
              <DevScreenBadge id="MOB-16" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="CreateGroup">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <AnimatedScreen animation="slideUp">
                <CreateGroupScreen
                  onBack={() => navigation.goBack()}
                  purpose={route.params?.purpose as any}
                  fund_description={route.params?.fund_description ?? ''}
                  onGroupCreated={(group) => {
                    navigation.navigate('GroupFeed', { group });
                  }}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-17" />
            </LinearGradient>
          )}
        </Stack.Screen>

        {/* ── Group Screens ── */}
        <Stack.Screen name="GroupFeed">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <GroupFeedScreen
                group={route.params.group}
                onBack={() => navigation.goBack()}
                onSelectPost={(post) => navigation.navigate('PostDetail', { post })}
                onCreatePost={() => navigation.navigate('CreatePost', { group: route.params.group })}
              />
              <DevScreenBadge id="MOB-20" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="GroupDetail">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <TopNavBar
                title="Community Details"
                onBack={() => navigation.goBack()}
                rightComponent={notificationBell(() => navigation.navigate('Notifications'))}
              />
              <AnimatedScreen animation="slideRight">
                <GroupDetailScreen
                  group={route.params.group as any}
                  onBack={() => navigation.goBack()}
                  onViewFeed={() => navigation.navigate('GroupFeed', { group: route.params.group })}
                  onManage={() => navigation.navigate('GroupManagement', { group: route.params.group })}
                  onSelectMember={(membership) => navigation.navigate('MemberProfile', { membership })}
                  onViewAllMembers={() => navigation.navigate('MemberList', { group: route.params.group })}
                  onViewWallet={() => navigation.navigate('GroupWallet', { group: route.params.group })}
                  onViewDuesLedger={() => navigation.navigate('GroupDuesLedger', { group: route.params.group })}
                  onEditGroup={() => navigation.navigate('EditGroup', { group: route.params.group })}
                  onInvite={() => navigation.navigate('Contacts', { groupId: route.params.group.id })}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-19" />
            </LinearGradient>
          )}
        </Stack.Screen>

        <Stack.Screen name="GroupPreview">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <GroupPreviewScreen
                  group={route.params.group as any}
                  onBack={() => navigation.goBack()}
                  onGroupJoined={() => navigation.navigate('MainTabs', { initialTab: 'home' })}
                  onGoToVerification={() =>
                    navigation.navigate('MainTabs', { initialTab: 'profile' })
                  }
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-18" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="GroupManagement">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <TopNavBar
                title="Community Management"
                onBack={() => navigation.goBack()}
                rightComponent={notificationBell(() => navigation.navigate('Notifications'))}
              />
              <AnimatedScreen animation="slideRight">
                <GroupManagementScreen
                  group={route.params.group}
                  onBack={() => navigation.goBack()}
                  onSelectMember={(membership) => navigation.navigate('MemberProfile', { membership })}
                  onViewWallet={() => navigation.navigate('GroupWallet', { group: route.params.group })}
                  onViewDuesLedger={() => navigation.navigate('GroupDuesLedger', { group: route.params.group })}
                  onCreateCampaign={() => navigation.navigate('CreateCampaign', { group: route.params.group })}
                  onSelectCampaign={(campaign) => navigation.navigate('CampaignDetail', { campaign })}
                  refreshKey={route.params?.refreshKey ?? 0}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-21" />
            </LinearGradient>
          )}
        </Stack.Screen>

        <Stack.Screen name="GroupWallet">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <GroupWalletScreen
                  group={route.params.group}
                  onBack={() => navigation.goBack()}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-23" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="GroupDuesLedger">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <GroupDuesLedgerScreen
                  group={route.params.group}
                  onBack={() => navigation.goBack()}
                  onEditGroupSettings={() =>
                    navigation.navigate('EditGroup', { group: route.params.group })
                  }
                  onViewWallet={() =>
                    navigation.navigate('MainTabs', { initialTab: 'wallet' })
                  }
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-36" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="MemberList">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <TopNavBar
                title="Community Members"
                onBack={() => navigation.goBack()}
              />
              <AnimatedScreen animation="slideRight">
                <MemberListScreen
                  group={route.params.group}
                  onBack={() => navigation.goBack()}
                  onSelectMember={(membership) => navigation.navigate('MemberProfile', { membership })}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-24" />
            </LinearGradient>
          )}
        </Stack.Screen>

        <Stack.Screen name="MemberProfile">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <MemberProfileScreen
                  membership={route.params.membership}
                  isAdmin={route.params.isAdmin ?? false}
                  onBack={() => navigation.goBack()}
                  onStatusChange={() => {}}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-25" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="EditGroup">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <TopNavBar
                title="Edit Community"
                onBack={() => navigation.goBack()}
              />
              <AnimatedScreen animation="slideUp">
                <EditGroupScreen
                  group={route.params.group}
                  onBack={() => navigation.goBack()}
                  onGroupUpdated={(updatedGroup) => {
                    navigation.goBack();
                  }}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-22" />
            </LinearGradient>
          )}
        </Stack.Screen>

        <Stack.Screen name="Contacts">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideUp">
                <ContactsScreen
                  groupId={Number(route.params.groupId)}
                  onBack={() => navigation.goBack()}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-13" />
            </View>
          )}
        </Stack.Screen>

        {/* ── Post Screens ── */}
        <Stack.Screen name="PostDetail">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <PostDetailScreen
                post={route.params.post as any}
                onBack={() => navigation.goBack()}
                onEditPost={(post: Post) =>
                  navigation.navigate('CreatePost', { post })
                }
              />
              <DevScreenBadge id="MOB-27" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="CreatePost">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <TopNavBar
                title={route.params?.post ? 'Edit Proposal' : 'Create Post'}
                onBack={() => navigation.goBack()}
              />
              <AnimatedScreen animation="slideUp">
                <CreatePostScreen
                  group={route.params?.group as any}
                  post={route.params?.post as any}
                  onBack={() => navigation.goBack()}
                  onPostCreated={() => navigation.goBack()}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-26" />
            </LinearGradient>
          )}
        </Stack.Screen>

        {/* ── Campaign Screens ── */}
        <Stack.Screen name="CreateCampaign">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <AnimatedScreen animation="slideUp">
                <CreateCampaignScreen
                  group={route.params.group}
                  onBack={() => navigation.goBack()}
                  onCreated={() => {
                    setManagementRefreshKey(k => k + 1);
                    navigation.goBack();
                  }}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-29" />
            </LinearGradient>
          )}
        </Stack.Screen>

        <Stack.Screen name="CampaignDetail">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <CampaignDetailScreen
                  campaign={route.params.campaign}
                  isAdmin={(route.params.campaign as any)?.group_detail?.is_admin ?? false}
                  onBack={() => navigation.goBack()}
                  onUpdated={() => navigation.goBack()}
                  onContributePress={(campaign) => {
                    navigation.navigate('MainTabs', {
                      initialTab: 'wallet',
                      preselectedCampaign: campaign,
                    });
                  }}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-30" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="Contributions">
          {({ navigation }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <TopNavBar title="My Contributions" onBack={() => navigation.goBack()} />
              <AnimatedScreen animation="slideRight">
                <ContributionsScreen onBack={() => navigation.goBack()} />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-12" />
            </LinearGradient>
          )}
        </Stack.Screen>

        {/* ── Organisation Screens ── */}
        <Stack.Screen name="CreateOrganisation">
          {({ navigation }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <AnimatedScreen animation="slideUp">
                <CreateOrganisationScreen
                  onBack={() => navigation.goBack()}
                  isUserVerified={!!userProfile?.is_verified}
                  onGoToKYC={() =>
                    navigation.navigate('MainTabs', { initialTab: 'profile' })
                  }
                  onOrganisationCreated={(org) =>
                    navigation.navigate('OrganisationDetail', { organisation: org })
                  }
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-31" />
            </LinearGradient>
          )}
        </Stack.Screen>

        <Stack.Screen name="OrganisationDetail">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <OrganisationDetailScreen
                  organisation={route.params.organisation}
                  onBack={() => navigation.goBack()}
                  onEditOrganisation={() =>
                    navigation.navigate('EditOrganisation', {
                      organisation: route.params.organisation,
                    })
                  }
                  onViewFeed={() =>
                    navigation.navigate('GroupFeed', {
                      group: { ...route.params.organisation, is_organisation: true },
                    })
                  }
                  onManage={() =>
                    navigation.navigate('GroupManagement', {
                      group: route.params.organisation,
                    })
                  }
                  onLaunchFundraiser={() =>
                    navigation.navigate('CreateCampaign', {
                      group: {
                        ...route.params.organisation,
                        is_organisation: true,
                      },
                    })
                  }
                  onViewWallet={() =>
                    navigation.navigate('GroupWallet', {
                      group: route.params.organisation,
                    })
                  }
                  onSelectCampaign={(campaign: Campaign) =>
                    navigation.navigate('CampaignDetail', { campaign })
                  }
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-33" />
            </LinearGradient>
          )}
        </Stack.Screen>

        <Stack.Screen name="OrganisationPreview">
          {({ navigation, route }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <OrganisationPreviewScreen
                  organisation={route.params.organisation}
                  onBack={() => navigation.goBack()}
                  onExplore={() =>
                    navigation.navigate('OrganisationDetail', {
                      organisation: route.params.organisation,
                    })
                  }
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-32" />
            </View>
          )}
        </Stack.Screen>

        <Stack.Screen name="EditOrganisation">
          {({ navigation, route }) => (
            <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
              <TopNavBar title="Edit Organisation" onBack={() => navigation.goBack()} />
              <AnimatedScreen animation="slideUp">
                <EditOrganisationScreen
                  organisation={route.params.organisation}
                  onBack={() => navigation.goBack()}
                  onOrganisationUpdated={(updated) => {
                    navigation.goBack();
                  }}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-34" />
            </LinearGradient>
          )}
        </Stack.Screen>

        {/* ── Notifications ── */}
        <Stack.Screen name="Notifications">
          {({ navigation }) => (
            <View style={{ flex: 1 }}>
              <AnimatedScreen animation="slideRight">
                <NotificationScreen
                  onBack={() => navigation.goBack()}
                  onNotificationsRead={fetchUnreadNotificationCount}
                />
              </AnimatedScreen>
              <DevScreenBadge id="MOB-35" />
            </View>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </>
  );
};
