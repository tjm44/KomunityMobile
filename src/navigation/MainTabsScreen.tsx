import React, { useState, useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FundraisersScreen from '../screens/FundraisersScreen';
import BottomNavBar from '../components/BottomNavBar';
import DevScreenBadge from '../components/DevScreenBadge';
import { useAuth } from '../context/AuthContext';
import { gradients } from '../constants/theme';
import type { RootStackParamList } from './types';
import type { Group, Organisation, Campaign } from '../types';

type TabName = 'home' | 'discovery' | 'wallet' | 'fundraisers' | 'profile';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export const MainTabsScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    userProfile,
    unreadNotificationCount,
    fetchUnreadNotificationCount,
    handleLogout,
    checkProfileStatus,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabName>(
    route.params?.initialTab ?? 'home'
  );
  const [autoShowKycOnProfile, setAutoShowKycOnProfile] = useState(false);
  const [preselectedCampaignForWallet, setPreselectedCampaignForWallet] = useState<any>(
    route.params?.preselectedCampaign ?? null
  );

  // Update tab if route params change
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
    if (route.params?.preselectedCampaign) {
      setPreselectedCampaignForWallet(route.params.preselectedCampaign);
    }
  }, [route.params]);

  // Back button handling on main tabs: if on non-home tab, go back to home.
  // If on home tab, return false to let OS handle (exit/minimize app).
  useEffect(() => {
    const onBackPress = () => {
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeTab]);

  const getScreenId = (): string => {
    switch (activeTab) {
      case 'home':
        return 'MOB-07';
      case 'discovery':
        return 'MOB-08';
      case 'wallet':
        return 'MOB-14';
      case 'profile':
        return 'MOB-10';
      case 'fundraisers':
        return 'MOB-28';
      default:
        return 'MOB-07';
    }
  };

  const profileName = userProfile?.first_name || userProfile?.full_name || (userProfile as any)?.username || userProfile?.phone || 'U';
  const userInitial = (typeof profileName === 'string' && profileName.length > 0 ? profileName[0] : 'U').toUpperCase();

  return (
    <LinearGradient colors={[...gradients.screenBackground]} style={{ flex: 1 }}>
      <View style={{ flex: 1, marginBottom: 70 }}>
        {activeTab === 'home' && (
          <HomeScreen
            onSelectGroup={(group: any) => navigation.navigate('GroupFeed', { group })}
            onViewGroupDetails={(group: any) => navigation.navigate('GroupDetail', { group })}
            onViewWallet={() => setActiveTab('wallet')}
            onDiscover={() => setActiveTab('discovery')}
            onCreateGroup={() => navigation.navigate('GroupPurpose')}
            onOpenNotifications={() => navigation.navigate('Notifications')}
          />
        )}

        {activeTab === 'discovery' && (
          <DiscoveryScreen
            onBack={() => setActiveTab('home')}
            onGroupJoined={() => setActiveTab('home')}
            onViewGroupDetails={(group: any) => navigation.navigate('GroupPreview', { group })}
            onViewOrganisationPreview={(org: any) =>
              navigation.navigate('OrganisationPreview', { organisation: org })
            }
            onGoToVerification={() => {
              setActiveTab('profile');
              setAutoShowKycOnProfile(true);
            }}
          />
        )}

        {activeTab === 'wallet' && (
          <WalletScreen
            onBack={() => setActiveTab('home')}
            onViewContributions={() => navigation.navigate('Contributions')}
            initialCampaign={preselectedCampaignForWallet}
            onClearInitialCampaign={() => setPreselectedCampaignForWallet(null)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            onBack={() => setActiveTab('home')}
            onLogout={handleLogout}
            onProfileUpdate={checkProfileStatus}
            onViewOrganisationDetails={(org: any) =>
              navigation.navigate('OrganisationDetail', { organisation: org })
            }
            autoShowKyc={autoShowKycOnProfile}
          />
        )}

        {activeTab === 'fundraisers' && (
          <FundraisersScreen
            onSelectCampaign={(campaign: Campaign) =>
              navigation.navigate('CampaignDetail', { campaign })
            }
          />
        )}
      </View>

      <DevScreenBadge id={getScreenId()} />

      <BottomNavBar
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          fetchUnreadNotificationCount();
        }}
        profilePicture={userProfile?.profile_picture}
        userInitial={userInitial}
        unreadNotificationCount={unreadNotificationCount}
      />
    </LinearGradient>
  );
};
