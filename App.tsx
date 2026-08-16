import React from "react";
import { StatusBar } from "expo-status-bar";
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  StyleSheet as RNStyleSheet,
  BackHandler,
} from "react-native";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import LoginScreen from "./src/screens/LoginScreen";
import PhoneAuthScreen from "./src/screens/PhoneAuthScreen";
import HomeScreen from "./src/screens/HomeScreen";
import GroupFeedScreen from "./src/screens/GroupFeedScreen";
import PostDetailScreen from "./src/screens/PostDetailScreen";
import GroupDetailScreen from "./src/screens/GroupDetailScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import WalletScreen from "./src/screens/WalletScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import DiscoveryScreen from "./src/screens/DiscoveryScreen";
import GroupPreviewScreen from "./src/screens/GroupPreviewScreen";
import PasswordResetScreen from "./src/screens/PasswordResetScreen";
import GroupManagementScreen from "./src/screens/GroupManagementScreen";
import MemberProfileScreen from "./src/screens/MemberProfileScreen";
import MemberListScreen from "./src/screens/MemberListScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import GroupWalletScreen from "./src/screens/GroupWalletScreen";
import GroupSelectionScreen from "./src/screens/GroupSelectionScreen";
import CreateGroupScreen from "./src/screens/CreateGroupScreen";
import ContributionsScreen from "./src/screens/ContributionsScreen";
import EditGroupScreen from "./src/screens/EditGroupScreen";
import ContactsScreen from "./src/screens/ContactsScreen";
import GroupPurposeScreen, { type PurposeSelection } from "./src/screens/GroupPurposeScreen";
import CreateCampaignScreen from "./src/screens/CreateCampaignScreen";
import CampaignDetailScreen from "./src/screens/CampaignDetailScreen";
import FundraisersScreen from "./src/screens/FundraisersScreen";
import AnimatedScreen from "./src/components/AnimatedScreen";
import BottomNavBar from "./src/components/BottomNavBar";
import TopNavBar from "./src/components/TopNavBar";
import ErrorBoundary from "./src/components/ErrorBoundary";
import DevScreenBadge from "./src/components/DevScreenBadge";
import CreateOrganisationScreen from "./src/screens/CreateOrganisationScreen";
import OrganisationDetailScreen from "./src/screens/OrganisationDetailScreen";
import EditOrganisationScreen from "./src/screens/EditOrganisationScreen";
import OrganisationPreviewScreen from "./src/screens/OrganisationPreviewScreen";
import VerifyIdentityPromptScreen from "./src/screens/VerifyIdentityPromptScreen";
import NotificationScreen from "./src/screens/NotificationScreen";
import client, { setAuthToken, loadToken, clearToken } from "./src/api/client";

export default function App() {
  const [fontsLoaded] = useFonts({
    "Outfit-Bold": require("./assets/fonts/Outfit-Bold.ttf"),
    "Outfit-Regular": require("./assets/fonts/Outfit-Regular.ttf"),
  });
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isSigningUp, setIsSigningUp] = React.useState(false);
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = React.useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [showWelcome, setShowWelcome] = React.useState(true);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<any>(null);
  const [selectedPost, setSelectedPost] = React.useState<any>(null);
  const [editingPost, setEditingPost] = React.useState<any>(null);
  const [viewingGroupDetails, setViewingGroupDetails] =
    React.useState<any>(null);
  const [isCreatingPost, setIsCreatingPost] = React.useState(false);
  const [viewingWallet, setViewingWallet] = React.useState(false);
  const [isDiscovering, setIsDiscovering] = React.useState(false);
  const [isManagingGroup, setIsManagingGroup] = React.useState<any>(null);
  const [viewingMemberProfile, setViewingMemberProfile] =
    React.useState<any>(null);
  const [isViewingAllMembers, setIsViewingAllMembers] =
    React.useState<any>(null);
  const [viewingGroupWallet, setViewingGroupWallet] = React.useState<any>(null);
  const [isChoosingGroup, setIsChoosingGroup] = React.useState(false);
  const [isChoosingGroupPurpose, setIsChoosingGroupPurpose] = React.useState(false);
  const [groupPurposeSelection, setGroupPurposeSelection] = React.useState<PurposeSelection | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);
  const [isViewingContributions, setIsViewingContributions] =
    React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState<any>(null);
  const [isInviting, setIsInviting] = React.useState<any>(null); // Group to invite to
  const [previewingGroup, setPreviewingGroup] = React.useState<any>(null); // Discovery preview
  const [viewingCampaign, setViewingCampaign] = React.useState<any>(null); // For FundraisersScreen
  const [isCreatingCampaign, setIsCreatingCampaign] = React.useState<any>(null); // group object
  const [managementRefreshKey, setManagementRefreshKey] = React.useState(0);
  const [preselectedCampaignForWallet, setPreselectedCampaignForWallet] = React.useState<any>(null);
  
  // Organisation States
  const [isCreatingOrganisation, setIsCreatingOrganisation] = React.useState(false);
  const [viewingOrganisationDetails, setViewingOrganisationDetails] = React.useState<any>(null);
  const [editingOrganisation, setEditingOrganisation] = React.useState<any>(null);
  const [previewingOrganisation, setPreviewingOrganisation] = React.useState<any>(null);

  // Identity Verification States
  const [isPromptingVerification, setIsPromptingVerification] = React.useState(false);
  const [autoShowKycOnProfile, setAutoShowKycOnProfile] = React.useState(false);

  // Notification Screen State
  const [viewingNotifications, setViewingNotifications] = React.useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);

  const fetchUnreadNotificationCount = React.useCallback(async () => {
    try {
      const notifRes = await client.get("notifications/unread_count/");
      setUnreadNotificationCount(notifRes.data.unread_count || 0);
    } catch (err) {
      console.log("Error fetching unread notification count:", err);
    }
  }, []);

  const activeTab_ref = React.useRef<"home" | "discovery" | "wallet" | "profile" | "fundraisers">("home");
  const [activeTab, setActiveTab] = React.useState<
    "home" | "discovery" | "wallet" | "profile" | "fundraisers"
  >("home");

  const url = Linking.useURL();

  const resetSubScreens = React.useCallback(() => {
    setSelectedGroup(null);
    setSelectedPost(null);
    setEditingPost(null);
    setViewingGroupDetails(null);
    setIsCreatingPost(false);
    setViewingWallet(false);
    setAutoShowKycOnProfile(false);
    setIsDiscovering(false);
    setIsManagingGroup(null);
    setViewingMemberProfile(null);
    setIsViewingAllMembers(null);
    setViewingGroupWallet(null);
    setIsViewingContributions(false);
    setEditingGroup(null);
    setPreviewingGroup(null);
    setViewingCampaign(null);
    setIsCreatingCampaign(null);
    setIsCreatingOrganisation(false);
    setViewingOrganisationDetails(null);
    setEditingOrganisation(null);
    setPreviewingOrganisation(null);
    setViewingNotifications(false);
  }, []);

  const handleDeepLink = React.useCallback(
    async (initialUrl: string | null) => {
      if (!initialUrl) return;
      try {
        const { hostname, path } = Linking.parse(initialUrl);
        console.log("Handling deep link:", { hostname, path });

        // Handle komunity://group/123 or komunity://post/456
        // For some schemes, hostname is the primary segment
        const segment = hostname || path?.split("/")[0];
        const id = path?.includes("/")
          ? path.split("/")[1] || path.split("/")[0]
          : path;

        if (segment === "group" && id) {
          const response = await client.get(`groups/${id}/`);
          resetSubScreens();
          setSelectedGroup(response.data);
          setActiveTab("home");
        } else if (segment === "post" && id) {
          const response = await client.get(`posts/${id}/`);
          resetSubScreens();
          setSelectedPost(response.data);

          // Also fetch/set the group context for the post
          if (response.data.group) {
            const groupRes = await client.get(`groups/${response.data.group}/`);
            setSelectedGroup(groupRes.data);
          }
          setActiveTab("home");
        }
      } catch (error) {
        console.error("Deep link error:", error);
      }
    },
    [resetSubScreens],
  );

  React.useEffect(() => {
    if (url && isLoggedIn && !isCheckingAuth) {
      handleDeepLink(url);
    }
  }, [url, isLoggedIn, isCheckingAuth, handleDeepLink]);

  // Hook Android hardware back button / gesture navigation into app navigation
  React.useEffect(() => {
    const onBackPress = () => {
      // Not logged in — let welcome/login/signup handle their own back or default behavior
      if (!isLoggedIn) {
        if (isResettingPassword) {
          setIsResettingPassword(false);
          return true;
        }
        if (isSigningUp) {
          setIsSigningUp(false);
          return true;
        }
        if (!showWelcome) {
          setShowWelcome(true);
          return true;
        }
        return false; // Let OS handle (exit app)
      }

      // Profile setup / group selection flows
      if (needsProfileSetup) return false;
      if (isChoosingGroup) return false;

      // Sub-screen navigation — mirrors getCurrentBackAction()
      if (viewingNotifications) { setViewingNotifications(false); return true; }
      if (isCreatingGroup) { setIsCreatingGroup(false); setIsChoosingGroupPurpose(true); return true; }
      if (isChoosingGroupPurpose) { setIsChoosingGroupPurpose(false); return true; }
      if (viewingCampaign) { setViewingCampaign(null); return true; }
      if (isCreatingCampaign) { setIsCreatingCampaign(null); return true; }
      if (isViewingContributions) { setIsViewingContributions(false); return true; }
      if (editingGroup) { setEditingGroup(null); return true; }
      if (viewingMemberProfile) { setViewingMemberProfile(null); return true; }
      if (isViewingAllMembers) { setIsViewingAllMembers(null); return true; }
      if (viewingGroupWallet) { setViewingGroupWallet(null); return true; }
      if (isManagingGroup) { setIsManagingGroup(null); return true; }
      if (isInviting) { setIsInviting(null); return true; }
      if (editingPost) { setEditingPost(null); return true; }
      if (selectedPost) { setSelectedPost(null); return true; }
      if (isCreatingPost) { setIsCreatingPost(false); return true; }
      if (viewingGroupDetails) { setViewingGroupDetails(null); return true; }
      if (previewingGroup) { setPreviewingGroup(null); return true; }
      if (selectedGroup) { setSelectedGroup(null); return true; }

      // On a root tab — if not home, go to home first
      if (activeTab !== "home") {
        resetSubScreens();
        setActiveTab("home");
        return true;
      }

      // Already on home with no sub-screens — let OS default (minimize/exit)
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => subscription.remove();
  }, [
    isLoggedIn,
    isSigningUp,
    isResettingPassword,
    showWelcome,
    needsProfileSetup,
    isChoosingGroup,
    isCreatingGroup,
    isViewingContributions,
    editingGroup,
    viewingMemberProfile,
    isViewingAllMembers,
    viewingGroupWallet,
    isManagingGroup,
    isInviting,
    editingPost,
    selectedPost,
    isCreatingPost,
    viewingGroupDetails,
    previewingGroup,
    selectedGroup,
    activeTab,
    resetSubScreens,
  ]);

  // Auto-login: try to restore session from secure storage on launch
  React.useEffect(() => {
    const tryAutoLogin = async () => {
      try {
        const token = await loadToken();
        if (token) {
          // Validate the token by fetching the profile
          const response = await client.get("profiles/me/");
          setUserProfile(response.data);
          if (!response.data.is_complete) {
            setNeedsProfileSetup(true);
          }
          setIsLoggedIn(true);
          fetchUnreadNotificationCount();
        }
      } catch (error) {
        // Token is invalid or expired — clear it and show login
        console.log("Auto-login failed, showing login screen");
        await clearToken();
      } finally {
        setIsCheckingAuth(false);
      }
    };
    tryAutoLogin();
  }, []);

  const checkProfileStatus = async () => {
    try {
      const response = await client.get("profiles/me/");
      if (!response.data.is_complete) {
        setNeedsProfileSetup(true);
      } else {
        setNeedsProfileSetup(false);
      }
      setUserProfile(response.data);
    } catch (error) {
      console.error("Error checking profile status:", error);
      // If we can't check, assume it might need setup if it's a new user
    }
  };

  const handleLoginSuccess = async () => {
    await checkProfileStatus();
    setIsLoggedIn(true);
    fetchUnreadNotificationCount();
  };

  const handleSignUpSuccess = async () => {
    setNeedsProfileSetup(true);
    setIsLoggedIn(true);
    setIsSigningUp(false);
  };

  const handleLogout = async () => {
    console.log("App: Logging out...");
    await clearToken();
    setIsLoggedIn(false);
    setActiveTab("home");
    setSelectedGroup(null);
    setSelectedPost(null);
    setEditingPost(null);
    setViewingGroupDetails(null);
    setIsCreatingPost(false);
    setViewingWallet(false);
    setIsDiscovering(false);
    setIsManagingGroup(null);
    setViewingMemberProfile(null);
    setIsViewingAllMembers(null);
    setViewingGroupWallet(null);
    setNeedsProfileSetup(false);
    setUserProfile(null);
    setPreviewingGroup(null);
  };

  // Show loading screen while checking for stored token or loading fonts
  if (isCheckingAuth || !fontsLoaded) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#ffffff",
            }}
          >
            <Text
              style={{
                fontSize: 36,
                fontWeight: "bold",
                color: "#2563eb",
                marginBottom: 16,
              }}
            >
              Komunity
            </Text>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  const handlePhoneAuthSuccess = async (isNewUser?: boolean) => {
    await checkProfileStatus();
    if (isNewUser) {
      setNeedsProfileSetup(true);
    }
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          {showWelcome ? (
            <View style={{ flex: 1 }}>
              <WelcomeScreen
                onShowLogin={() => {
                  setShowWelcome(false);
                }}
                onShowSignUp={() => {
                  setShowWelcome(false);
                }}
              />
              <DevScreenBadge id="MOB-01" />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <PhoneAuthScreen
                onLoginSuccess={handlePhoneAuthSuccess}
                onBack={() => setShowWelcome(true)}
              />
              <DevScreenBadge id="MOB-04" />
            </View>
          )}
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (needsProfileSetup) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={{ flex: 1 }}>
            <ProfileSetupScreen
              onComplete={async () => {
                setNeedsProfileSetup(false);
                // Fetch user profile to get the newly created profile ID for verification
                await checkProfileStatus();
                setIsPromptingVerification(true);
              }}
            />
            <DevScreenBadge id="MOB-06" />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (isPromptingVerification) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={{ flex: 1 }}>
            <VerifyIdentityPromptScreen
              profileId={userProfile?.id}
              onVerified={async () => {
                await checkProfileStatus();
                setIsPromptingVerification(false);
                setIsChoosingGroup(true);
              }}
              onSkip={() => {
                setIsPromptingVerification(false);
                setIsChoosingGroup(true);
              }}
            />
            <DevScreenBadge id="MOB-11" />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (isChoosingGroup) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={{ flex: 1 }}>
            <GroupSelectionScreen
              onJoin={() => {
                setIsChoosingGroup(false);
                setActiveTab("discovery");
              }}
              onCreate={() => {
                setIsChoosingGroup(false);
                setIsChoosingGroupPurpose(true);
              }}
              onCreateOrganisation={() => {
                setIsChoosingGroup(false);
                setIsCreatingOrganisation(true);
              }}
            />
            <DevScreenBadge id="MOB-15" />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  if (isChoosingGroupPurpose) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={{ flex: 1 }}>
            <GroupPurposeScreen
              onSelect={(selection) => {
                setGroupPurposeSelection(selection);
                setIsChoosingGroupPurpose(false);
                setIsCreatingGroup(true);
              }}
              onBack={() => {
                setIsChoosingGroupPurpose(false);
                setIsChoosingGroup(true);
              }}
            />
            <DevScreenBadge id="MOB-16" />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  const getCurrentBackAction = () => {
    if (viewingNotifications) return () => setViewingNotifications(false);
    if (isCreatingOrganisation) return () => setIsCreatingOrganisation(false);
    if (editingOrganisation) return () => setEditingOrganisation(null);
    if (viewingOrganisationDetails) return () => setViewingOrganisationDetails(null);
    if (previewingOrganisation) return () => setPreviewingOrganisation(null);
    if (isCreatingGroup) return () => setIsCreatingGroup(false);
    if (isViewingContributions) return () => setIsViewingContributions(false);
    if (editingGroup) return () => setEditingGroup(null);
    if (viewingMemberProfile) return () => setViewingMemberProfile(null);
    if (isViewingAllMembers) return () => setIsViewingAllMembers(null);
    if (viewingGroupWallet) return () => setViewingGroupWallet(null);
    if (isManagingGroup) return () => setIsManagingGroup(null);
    if (editingPost) return () => setEditingPost(null);
    if (selectedPost) return () => setSelectedPost(null);
    if (isCreatingPost) return () => setIsCreatingPost(false);
    if (viewingGroupDetails) return () => setViewingGroupDetails(null);
    if (previewingGroup) return () => setPreviewingGroup(null);
    if (selectedGroup) return () => setSelectedGroup(null);
    return undefined;
  };

  const shouldShowTopNavBar = () => {
    if (viewingNotifications) return false;
    if (isCreatingOrganisation) return true;
    if (editingOrganisation) return true;
    if (viewingOrganisationDetails) return true;
    if (previewingOrganisation) return true;
    if (isCreatingGroup) return true;
    if (viewingMemberProfile) return false;
    if (isViewingAllMembers) return true;
    if (viewingGroupWallet) return false;
    if (isManagingGroup) return true;
    if (editingPost) return true;
    if (selectedPost) return false;
    if (isCreatingPost) return true;
    if (isInviting) return false;
    if (editingGroup) return true;
    if (viewingGroupDetails) return true;
    if (selectedGroup) return false;

    if (isViewingContributions) return true;

    // The bottom tab screens all have their own custom headers
    return false;
  };

  const getCurrentTitle = () => {
    if (viewingNotifications) return "Notifications";
    if (isCreatingOrganisation) return "Register Organisation";
    if (editingOrganisation) return "Edit Organisation";
    if (viewingOrganisationDetails) return viewingOrganisationDetails.name;
    if (previewingOrganisation) return previewingOrganisation.name;
    if (isCreatingGroup) return "Create Community";
    if (isViewingContributions) return "My Contributions";
    if (editingGroup) return "Edit Community";
    if (viewingMemberProfile)
      return viewingMemberProfile.member_detail.full_name;
    if (isViewingAllMembers) return "Community Members";
    if (viewingGroupWallet) return (viewingGroupWallet.is_organisation || viewingGroupWallet.entity_type) ? "Organisation Wallet" : "Group Wallet";
    if (isManagingGroup) return "Community Management";
    if (editingPost) return "Edit Proposal";
    if (selectedPost) return "Discussion";
    if (isCreatingPost) return "Create Post";
    if (viewingGroupDetails) return "Community Details";
    if (selectedGroup) return selectedGroup.name;

    if (activeTab === "home") return "My Hub";
    if (activeTab === "discovery") return "Explore";
    if (activeTab === "wallet") return "Wallet";
    if (activeTab === "profile") return "Profile";
    return "Komunity";
  };

  /** DEV ONLY – maps current navigation state to a screen ID for DevScreenBadge */
  const getScreenId = (): string => {
    // Sub-screens / overlays (highest priority)
    if (viewingNotifications)   return 'MOB-35';
    if (isCreatingOrganisation) return 'MOB-31';
    if (editingOrganisation)    return 'MOB-34';
    if (previewingOrganisation) return 'MOB-32';
    if (viewingOrganisationDetails) return 'MOB-33';
    if (isCreatingCampaign)     return 'MOB-29';
    if (viewingCampaign)        return 'MOB-30';
    if (isCreatingGroup)        return 'MOB-17';
    if (viewingMemberProfile)   return 'MOB-25';
    if (isViewingAllMembers)    return 'MOB-24';
    if (viewingGroupWallet)     return 'MOB-23';
    if (isManagingGroup)        return 'MOB-21';
    if (editingPost)            return 'MOB-26'; // editing reuses CreatePostScreen
    if (selectedPost)           return 'MOB-27';
    if (isCreatingPost)         return 'MOB-26';
    if (isInviting)             return 'MOB-13'; // ContactsScreen
    if (editingGroup)           return 'MOB-22';
    if (viewingGroupDetails)    return 'MOB-19';
    if (selectedGroup)          return 'MOB-20'; // GroupFeedScreen
    // Bottom tabs
    if (activeTab === 'home')      return 'MOB-07';
    if (activeTab === 'discovery') {
      if (previewingGroup)         return 'MOB-18';
      if (previewingOrganisation)  return 'MOB-32';
      return 'MOB-08';
    }
    if (activeTab === 'wallet') {
      if (isViewingContributions)  return 'MOB-12';
      return 'MOB-14';
    }
    if (activeTab === 'profile')     return 'MOB-10';
    if (activeTab === 'fundraisers') return 'MOB-28';
    return 'MOB-??';
  };

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#bfdbfe', '#f1f5f9', '#ffffff']}
          style={{ flex: 1 }}
        >
          {shouldShowTopNavBar() && (
            <TopNavBar
              title={getCurrentTitle()}
              onBack={getCurrentBackAction()}
              rightComponent={
                <TouchableOpacity
                  onPress={() => setViewingNotifications(true)}
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
              }
            />
          )}
          <View style={{ flex: 1, marginBottom: 70 }}>
            {viewingNotifications ? (
              <AnimatedScreen animation="slideRight">
                <NotificationScreen
                  onBack={() => setViewingNotifications(false)}
                  onNotificationsRead={fetchUnreadNotificationCount}
                />
              </AnimatedScreen>
            ) : isCreatingOrganisation ? (
              <AnimatedScreen animation="slideUp">
                <CreateOrganisationScreen
                  onBack={() => setIsCreatingOrganisation(false)}
                  isUserVerified={!!userProfile?.is_verified}
                  onGoToKYC={() => {
                    setIsCreatingOrganisation(false);
                    setActiveTab("profile");
                  }}
                  onOrganisationCreated={(org) => {
                    setIsCreatingOrganisation(false);
                    setViewingOrganisationDetails(org);
                    setActiveTab("home");
                  }}
                />
              </AnimatedScreen>
            ) : editingOrganisation ? (
              <AnimatedScreen animation="slideUp">
                <EditOrganisationScreen
                  organisation={editingOrganisation}
                  onBack={() => setEditingOrganisation(null)}
                  onOrganisationUpdated={(updated) => {
                    setEditingOrganisation(null);
                    setViewingOrganisationDetails(updated);
                  }}
                />
              </AnimatedScreen>
            ) : isCreatingCampaign ? (
              <AnimatedScreen animation="slideUp">
                <CreateCampaignScreen
                  group={isCreatingCampaign}
                  onBack={() => setIsCreatingCampaign(null)}
                  onCreated={(campaign) => {
                    setIsCreatingCampaign(null);
                    // Increment key so GroupManagementScreen re-fetches campaigns
                    setManagementRefreshKey(k => k + 1);
                  }}
                />
              </AnimatedScreen>
            ) : previewingOrganisation ? (
              <AnimatedScreen animation="slideRight">
                <OrganisationPreviewScreen
                  organisation={previewingOrganisation}
                  onBack={() => setPreviewingOrganisation(null)}
                  onExplore={() => {
                    setViewingOrganisationDetails(previewingOrganisation);
                    setPreviewingOrganisation(null);
                  }}
                />
              </AnimatedScreen>
            ) : viewingCampaign ? (
              <AnimatedScreen animation="slideRight">
                <CampaignDetailScreen
                  campaign={viewingCampaign}
                  isAdmin={viewingCampaign?.group_detail?.is_admin ?? false}
                  onBack={() => setViewingCampaign(null)}
                  onUpdated={(updated) => setViewingCampaign(updated)}
                  onContributePress={(campaign) => {
                    setPreselectedCampaignForWallet(campaign);
                    setViewingCampaign(null);
                    setActiveTab("wallet");
                  }}
                />
              </AnimatedScreen>
            ) : isCreatingGroup ? (
              <AnimatedScreen animation="slideUp">
                <CreateGroupScreen
                  onBack={() => {
                    setIsCreatingGroup(false);
                    setIsChoosingGroupPurpose(true);
                  }}
                  purpose={groupPurposeSelection?.purpose}
                  fund_description={groupPurposeSelection?.fund_description ?? ''}
                  onGroupCreated={(group) => {
                    setIsCreatingGroup(false);
                    setSelectedGroup(group);
                    setActiveTab("home");
                  }}
                />
              </AnimatedScreen>
            ) : viewingMemberProfile ? (
              <AnimatedScreen animation="slideRight">
                <MemberProfileScreen
                  membership={viewingMemberProfile}
                  isAdmin={
                    selectedGroup?.is_admin ||
                    isManagingGroup?.is_admin ||
                    viewingGroupDetails?.is_admin
                  }
                  onBack={() => setViewingMemberProfile(null)}
                  onStatusChange={() => {}}
                />
              </AnimatedScreen>
            ) : isViewingAllMembers ? (
              <AnimatedScreen animation="slideRight">
                <MemberListScreen
                  group={isViewingAllMembers}
                  onBack={() => setIsViewingAllMembers(null)}
                  onSelectMember={(membership) =>
                    setViewingMemberProfile(membership)
                  }
                />
              </AnimatedScreen>
            ) : viewingGroupWallet ? (
              <AnimatedScreen animation="slideRight">
                <GroupWalletScreen
                  group={viewingGroupWallet}
                  onBack={() => setViewingGroupWallet(null)}
                />
              </AnimatedScreen>
            ) : isManagingGroup ? (
              <AnimatedScreen animation="slideRight">
                <GroupManagementScreen
                  group={isManagingGroup}
                  onBack={() => setIsManagingGroup(null)}
                  onSelectMember={(membership) =>
                    setViewingMemberProfile(membership)
                  }
                  onViewWallet={() => {
                    setViewingGroupWallet(isManagingGroup);
                  }}
                  onCreateCampaign={() => {
                    setIsCreatingCampaign(isManagingGroup);
                  }}
                  onSelectCampaign={(campaign) => {
                    setViewingCampaign(campaign);
                  }}
                  refreshKey={managementRefreshKey}
                />
              </AnimatedScreen>
            ) : editingPost ? (
              <AnimatedScreen animation="slideUp">
                <CreatePostScreen
                  group={selectedGroup}
                  post={editingPost}
                  onBack={() => setEditingPost(null)}
                  onPostCreated={() => {
                    setEditingPost(null);
                    setSelectedPost(null);
                  }}
                />
              </AnimatedScreen>
            ) : selectedPost ? (
              <PostDetailScreen
                post={selectedPost}
                onBack={() => setSelectedPost(null)}
                onEditPost={(post: any) => setEditingPost(post)}
              />
            ) : isCreatingPost ? (
              <AnimatedScreen animation="slideUp">
                <CreatePostScreen
                  group={selectedGroup}
                  onBack={() => setIsCreatingPost(false)}
                  onPostCreated={() => setIsCreatingPost(false)}
                />
              </AnimatedScreen>
            ) : isInviting ? (
              <AnimatedScreen animation="slideUp">
                <ContactsScreen
                  groupId={isInviting.id}
                  onBack={() => setIsInviting(null)}
                />
              </AnimatedScreen>
            ) : editingGroup ? (
              <AnimatedScreen animation="slideUp">
                <EditGroupScreen
                  group={editingGroup}
                  onBack={() => setEditingGroup(null)}
                  onGroupUpdated={(updatedGroup) => {
                    setEditingGroup(null);
                    if (viewingGroupDetails)
                      setViewingGroupDetails(updatedGroup);
                    if (selectedGroup) setSelectedGroup(updatedGroup);
                  }}
                />
              </AnimatedScreen>
            ) : viewingOrganisationDetails ? (
              <AnimatedScreen animation="slideRight">
                <OrganisationDetailScreen
                  organisation={viewingOrganisationDetails}
                  onBack={() => setViewingOrganisationDetails(null)}
                  onEditOrganisation={() => setEditingOrganisation(viewingOrganisationDetails)}
                  onViewFeed={() => {
                    setSelectedGroup({ ...viewingOrganisationDetails, is_organisation: true });
                    setViewingOrganisationDetails(null);
                  }}
                  onManage={() => {
                    setIsManagingGroup(viewingOrganisationDetails);
                  }}
                  onLaunchFundraiser={() => {
                    setIsCreatingCampaign({ ...viewingOrganisationDetails, is_organisation: true });
                  }}
                  onViewWallet={() => {
                    setViewingGroupWallet(viewingOrganisationDetails);
                  }}
                  onSelectCampaign={(campaign: any) => {
                    setViewingCampaign(campaign);
                  }}
                />
              </AnimatedScreen>
            ) : viewingGroupDetails ? (
              <AnimatedScreen animation="slideRight">
                <GroupDetailScreen
                  group={viewingGroupDetails}
                  onBack={() => setViewingGroupDetails(null)}
                  onViewFeed={() => {
                    setSelectedGroup(viewingGroupDetails);
                    setViewingGroupDetails(null); // Clear context when jumping to feed to make feed primary
                  }}
                  onManage={() => {
                    setIsManagingGroup(viewingGroupDetails);
                  }}
                  onSelectMember={(membership) =>
                    setViewingMemberProfile(membership)
                  }
                  onViewAllMembers={() => {
                    setIsViewingAllMembers(viewingGroupDetails);
                  }}
                  onViewWallet={() => {
                    setViewingGroupWallet(viewingGroupDetails);
                  }}
                  onEditGroup={() => {
                    setEditingGroup(viewingGroupDetails);
                  }}
                  onInvite={() => {
                    setIsInviting(viewingGroupDetails);
                  }}
                />
              </AnimatedScreen>
            ) : selectedGroup ? (
              <GroupFeedScreen
                group={selectedGroup}
                onBack={() => setSelectedGroup(null)}
                onSelectPost={(post) => setSelectedPost(post)}
                onCreatePost={() => setIsCreatingPost(true)}
              />
            ) : (
              <View style={{ flex: 1 }}>
                {activeTab === "home" && (
                  <HomeScreen
                    onSelectGroup={(group: any) => setSelectedGroup(group)}
                    onViewGroupDetails={(group: any) =>
                      setViewingGroupDetails(group)
                    }
                    onViewWallet={() => setActiveTab("wallet")}
                    onDiscover={() => setActiveTab("discovery")}
                    onCreateGroup={() => setIsChoosingGroupPurpose(true)}
                    onOpenNotifications={() => setViewingNotifications(true)}
                  />
                )}
                {activeTab === "discovery" && (
                  previewingGroup ? (
                    <AnimatedScreen animation="slideRight">
                      <GroupPreviewScreen
                        group={previewingGroup}
                        onBack={() => setPreviewingGroup(null)}
                        onGroupJoined={() => {
                          setPreviewingGroup(null);
                          setActiveTab("home");
                        }}
                        onGoToVerification={() => {
                          setPreviewingGroup(null);
                          setActiveTab("profile");
                          setAutoShowKycOnProfile(true);
                        }}
                      />
                    </AnimatedScreen>
                  ) : previewingOrganisation ? (
                    <AnimatedScreen animation="slideRight">
                      <OrganisationPreviewScreen
                        organisation={previewingOrganisation}
                        onBack={() => setPreviewingOrganisation(null)}
                        onExplore={() => {
                          setViewingOrganisationDetails(previewingOrganisation);
                          setPreviewingOrganisation(null);
                        }}
                      />
                    </AnimatedScreen>
                  ) : (
                    <DiscoveryScreen
                      onBack={() => setActiveTab("home")}
                      onGroupJoined={() => setActiveTab("home")}
                      onViewGroupDetails={(group: any) => setPreviewingGroup(group)}
                      onViewOrganisationPreview={(org: any) => setPreviewingOrganisation(org)}
                      onGoToVerification={() => {
                        setActiveTab("profile");
                        setAutoShowKycOnProfile(true);
                      }}
                    />
                  )
                )}
                {activeTab === "wallet" &&
                  (isViewingContributions ? (
                    <AnimatedScreen animation="slideRight">
                      <ContributionsScreen
                        onBack={() => setIsViewingContributions(false)}
                      />
                    </AnimatedScreen>
                  ) : (
                    <WalletScreen
                      onBack={() => setActiveTab("home")}
                      onViewContributions={() =>
                        setIsViewingContributions(true)
                      }
                      initialCampaign={preselectedCampaignForWallet}
                      onClearInitialCampaign={() => setPreselectedCampaignForWallet(null)}
                    />
                  ))}
                {activeTab === "profile" && (
                  <ProfileScreen
                    onBack={() => setActiveTab("home")}
                    onLogout={handleLogout}
                    onProfileUpdate={checkProfileStatus}
                    onViewOrganisationDetails={(org: any) => setViewingOrganisationDetails(org)}
                    autoShowKyc={autoShowKycOnProfile}
                  />
                )}
                {activeTab === "fundraisers" && (
                  <FundraisersScreen
                    onSelectCampaign={(campaign) => setViewingCampaign(campaign)}
                  />
                )}
              </View>
            )}
          </View>

          {/* DEV: floating screen ID badge */}
          <DevScreenBadge id={getScreenId()} />

          <BottomNavBar
            activeTab={activeTab}
            onTabPress={(tab) => {
              resetSubScreens();
              setActiveTab(tab);
              fetchUnreadNotificationCount();
            }}
            profilePicture={userProfile?.profile_picture}
            unreadNotificationCount={unreadNotificationCount}
          />
          </LinearGradient>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
