'use client';

import { useState, useRef, useEffect } from 'react';
import { Plane, Users, MapPin, Calendar, Settings, Bell, User, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import FlowingMenu from '@/components/FlowingMenu';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';

interface TravelGroup {
  group_id: string;
  destination: string;
  destination_display: string;
  created_at: string;
  member_count: number;
  members: Array<{
    user_id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  }>;
}

export default function DashboardPage() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [travelGroups, setTravelGroups] = useState<TravelGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<{
    first_name: string;
    profile_picture?: string;
  } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, profile_picture')
          .eq('user_id', user.id)
          .single();
        if (error) {
          console.error('Profile fetch error:', error);
        }
        if (data) {
          setFirstName(data.first_name);
          setUserProfile(data);
        } else {
          setFirstName(null);
          setUserProfile(null);
        }
      }
      setProfileLoading(false);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchTravelGroups = async () => {
      setGroupsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all groups the user is a member of
        const { data: groupMemberships, error: membershipError } = await supabase
          .from('group_members')
          .select(`
            group_id,
            travel_groups!inner(
              group_id,
              destination,
              destination_display,
              created_at
            )
          `)
          .eq('user_id', user.id);

        if (membershipError) {
          console.error('Error fetching group memberships:', membershipError);
          return;
        }

        // For each group, get all members
        const groupsWithMembers = await Promise.all(
          groupMemberships.map(async (membership) => {
            const { data: members, error: membersError } = await supabase
              .from('group_members')
              .select(`
                user_id,
                profiles!group_members_user_id_fkey(
                  first_name,
                  last_name,
                  profile_picture
                )
              `)
              .eq('group_id', membership.group_id);

            if (membersError) {
              console.error('Error fetching group members:', membersError);
              return null;
            }

            const formattedMembers = members.map(member => ({
              user_id: member.user_id,
              first_name: (member.profiles as any)?.first_name || 'Unknown',
              last_name: (member.profiles as any)?.last_name || 'User',
              profile_picture: (member.profiles as any)?.profile_picture || 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png'
            }));

            return {
              group_id: (membership.travel_groups as any).group_id,
              destination: (membership.travel_groups as any).destination,
              destination_display: (membership.travel_groups as any).destination_display,
              created_at: (membership.travel_groups as any).created_at,
              member_count: formattedMembers.length,
              members: formattedMembers
            };
          })
        );

        const validGroups = groupsWithMembers.filter(group => group !== null) as TravelGroup[];
        setTravelGroups(validGroups);
      } catch (error) {
        console.error('Error fetching travel groups:', error);
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchTravelGroups();
  }, [refreshTrigger]);

  const handleLeaveTrip = (groupId: string) => {
    // Refresh the travel groups list
    setRefreshTrigger(prev => prev + 1);
  };

  const notifications = [
    {
      id: 1,
      message: "Toby has finished mentioning their preferences for the Paris trip",
      time: "2 minutes ago",
      unread: true
    },
    {
      id: 2,
      message: "Sarah added new photos to the Tokyo itinerary",
      time: "1 hour ago",
      unread: true
    },
    {
      id: 3,
      message: "Flight prices dropped for your London trip",
      time: "3 hours ago",
      unread: false
    }
  ];

  // FlowingMenu items based on travel plans
  const flowingMenuItems = travelGroups.map(group => ({
    link: `/ai-preferences?groupId=${group.group_id}`, // Will be updated by handleTripClick
    text: group.destination_display,
    groupId: group.group_id,
    members: group.members.slice(0, 3).map(member => ({
      name: `${member.first_name} ${member.last_name}`,
      avatar: member.profile_picture || `https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop`
    })),
    additionalMembers: Math.max(0, group.member_count - 3),
    image: `https://images.pexels.com/photos/${
      group.destination_display.toLowerCase().includes('paris') ? '338515' : 
      group.destination_display.toLowerCase().includes('tokyo') ? '2506923' : 
      group.destination_display.toLowerCase().includes('bali') ? '1320684' :
      '1320684'
    }/pexels-photo-${
      group.destination_display.toLowerCase().includes('paris') ? '338515' : 
      group.destination_display.toLowerCase().includes('tokyo') ? '2506923' : 
      group.destination_display.toLowerCase().includes('bali') ? '1320684' :
      '1320684'
    }.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop`,
    destination: group.destination
  }));

  const handleTripClick = async (groupId: string) => {
    try {
      // Check if itinerary exists
      const { data: groupData, error } = await supabase
        .from('travel_groups')
        .select('itinerary')
        .eq('group_id', groupId)
        .single();

      if (error) {
        console.error('Error checking itinerary:', error);
        return;
      }

      // Store group ID for navigation
      localStorage.setItem('currentGroupId', groupId);

      if (groupData.itinerary) {
        // Itinerary exists, go to travel plan
        window.location.href = `/travel-plan?groupId=${groupId}`;
      } else {
        // No itinerary, go to AI preferences
        window.location.href = `/ai-preferences?groupId=${groupId}`;
      }
    } catch (error) {
      console.error('Error handling trip click:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Navigation */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl px-4">
        <div className="bg-white rounded-2xl nav-shadow px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <Link href="/" className="flex items-center">
              <img src="/logo_blue.png" alt="a2b.ai logo" className="h-10 w-auto" />
            </Link>
            
            <div className="flex items-center space-x-4">
              {/* Settings */}
              <Link href="/settings">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-6 h-6" />
                </button>
              </Link>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {userProfile?.profile_picture ? (
                      <img
                        src={userProfile.profile_picture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
                    <Link href="/account-details" className="w-full block px-4 py-2 text-left text-gray-700 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4" />
                        <span>Account Details</span>
                      </div>
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <button 
                      onClick={() => window.location.href = '/auth'}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Log Out</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 pt-36">
        <div className="mb-12">
          {profileLoading ? (
            <div className="text-2xl text-gray-700 mb-4">Loading...</div>
          ) : firstName ? (
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Hey {firstName}! Where to next?</h1>
          ) : (
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Hey there! Where to next?</h1>
          )}
          <p className="text-xl text-gray-600">Start planning your next trip!</p>
        </div>

        {/* Travel Plans */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Travel Plans</h2>
          
          {groupsLoading ? (
            <div className="bg-gray-100 rounded-2xl h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your trips...</p>
              </div>
            </div>
          ) : travelGroups.length > 0 ? (
            /* FlowingMenu Section */
            <div className="mb-8">
              <div className="bg-gray-900 rounded-2xl overflow-hidden" style={{ minHeight: '400px', height: 'auto' }}>
                <FlowingMenu 
                  items={flowingMenuItems.map(item => ({ 
                    ...item, 
                    onLeaveTrip: handleLeaveTrip,
                    onClick: () => handleTripClick(item.groupId!)
                  }))} 
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-12 text-center mb-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
              <p className="text-gray-600 mb-6">Create your first travel plan to get started!</p>
              <Link href="/create-trip">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold">
                  Create Your First Trip
                </Button>
              </Link>
            </div>
          )}
            
          {travelGroups.length > 0 && (
            <div className="space-y-4">
              {/* Create New Travel Plan Card */}
              <Link href="/create-trip">
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-semibold text-gray-700">Create New Travel Plan</span>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}