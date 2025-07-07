'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plane, Check, X, ArrowLeft, Copy } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import VoiceAgentWidget from '@/components/VoiceAgentWidget';
import { FadeIn } from '@/components/ui/fade-in';

interface User {
  id: string;
  name: string;
  avatar: string;
  completed: boolean;
}

interface MemberProfile {
  first_name: string;
  last_name: string;
  profile_picture?: string;
}

interface Member {
  user_id: string;
  profiles: MemberProfile;
}

export default function AIPreferencesPage() {
  const [userCompleted, setUserCompleted] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState<string>('');
  const [destination_display, setDestinationDisplay] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    const loadGroupData = async () => {
      try {
        // Get group ID from URL params first, then localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlGroupId = urlParams.get('groupId');
        const storedGroupId = urlGroupId || localStorage.getItem('currentGroupId');
        
        if (!storedGroupId) {
          // Redirect to dashboard if no group ID
          window.location.href = '/dashboard';
          return;
        }

        // Update localStorage if we got groupId from URL
        if (urlGroupId) {
          localStorage.setItem('currentGroupId', urlGroupId);
        }

        setGroupId(storedGroupId);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth';
          return;
        }

        setCurrentUserId(user.id);

        // Load group details including destination
        const { data: groupData, error: groupError } = await supabase
          .from('travel_groups')
          .select('destination, host_id, destination_display')
          .eq('group_id', storedGroupId)
          .single();

        if (groupError) {
          console.error('Error loading group details:', groupError);
          return;
        }

        setDestination(groupData.destination);
        setDestinationDisplay(groupData.destination_display);
        setIsHost(groupData.host_id === user.id);

        // Load group members
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select(`
            user_id,
            preferences_completed_at,
            profiles(
              first_name,
              last_name,
              profile_picture
            )
          `)
          .eq('group_id', storedGroupId);

        if (membersError) {
          console.error('Error loading group members:', membersError);
          setGroupMembers([]);
          return;
        }

        const formattedMembers: User[] = (membersData || []).map((member: any) => {
          const profile = member.profiles;
          if (!profile) {
            return {
              id: member.user_id,
              name: member.user_id === user.id ? 'You' : 'Unknown User',
              avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
              completed: member.user_id === user.id ? userCompleted : Math.random() > 0.3
            };
          }
          
          return {
            id: member.user_id,
            name: member.user_id === user.id ? 'You' : `${profile.first_name} ${profile.last_name}`,
            avatar: profile.profile_picture || 'https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png',
            completed: member.user_id === user.id ? userCompleted : !!member.preferences_completed_at
          };
        });

        setGroupMembers(formattedMembers);
        console.log('Formatted members:', formattedMembers);
      } catch (error) {
        console.error('Error loading group data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [userCompleted]);

  const allUsersReady = groupMembers.every(user => user.completed);

  const handleConfirmPreferences = () => {
    setUserCompleted(true);
  };

  const copyInviteLink = async () => {
    try {
      const inviteLink = `${window.location.origin}/join/${groupId}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleGenerateTravelPlan = async () => {
    if (!groupId) return;
    
    setGeneratingPlan(true);
    try {
      // First, determine travel dates and flight class
      const datesResponse = await fetch('/api/determine-travel-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });

      if (!datesResponse.ok) {
        throw new Error('Failed to determine travel dates');
      }

      const datesData = await datesResponse.json();
      console.log('Travel dates determined:', datesData);

      // Then generate the itinerary
      const itineraryResponse = await fetch('/api/generate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId })
      });

      if (!itineraryResponse.ok) {
        throw new Error('Failed to generate itinerary');
      }

      // Redirect to travel plan page
      window.location.href = `/travel-plan?groupId=${groupId}`;
    } catch (error) {
      console.error('Error generating travel plan:', error);
      alert('Failed to generate travel plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white overflow-hidden">
      {/* Floating Navigation */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl nav-shadow px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <Link href="/dashboard" className="flex items-center">
              <img src="/logo_blue.png" alt="a2b.ai logo" className="h-10 w-auto" />
            </Link>
            
            <Link href="/dashboard">
              <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-6rem)] mt-24">
        {/* Main Content Area */}
        <div className="flex-1 relative">
          <FadeIn>
            {/* Left Content Container */}
            <div className="h-full flex flex-col pl-24 pr-8 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
              <div className="mb-8 mt-12">
                <div className="flex items-center justify-between gap-8">
                  <div className="text-left flex-1">
                    <h1 className="text-5xl font-bold text-gray-900 mb-4">Share Your Travel Preferences</h1>
                    <p className="text-xl text-gray-600">Tell our AI what you&apos;re looking for in this {destination_display} trip</p>
                  </div>

                  {/* Confirm Preferences Button */}
                  <Button
                    onClick={handleConfirmPreferences}
                    disabled={userCompleted}
                    className={`shrink-0 w-64 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 ${
                      userCompleted 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {userCompleted ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Check className="w-5 h-5" />
                        <span>Preferences Confirmed</span>
                      </div>
                    ) : (
                      'Confirm My Preferences'
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                {/* ElevenLabs Conversational AI Widget - only render after loading */}
                {!loading && currentUserId && groupId && destination ? (
                  <div className="flex-1 flex h-full">
                    {/* Info Boxes */}
                    <div className="w-[42rem] flex flex-col gap-6 mr-12">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl px-8 py-8 text-white shadow-[0_8px_32px_rgba(59,130,246,0.3)]">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <span className="text-2xl">🤖</span>
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold mb-1">Meet Maya</h3>
                            <p className="text-blue-100 text-lg">Your AI Travel Concierge</p>
                          </div>
                        </div>
                        <p className="text-lg leading-relaxed opacity-95 mb-6">
                          Maya is an advanced AI travel agent designed to understand your unique travel style, preferences, and interests. 
                          She'll craft a personalized itinerary that perfectly matches your travel personality and creates unforgettable experiences.
                        </p>
                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                          <p className="text-lg font-medium mb-2">✨ Ready to start planning?</p>
                          <p className="text-blue-100">Click the call button on the right to begin your conversation with Maya!</p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl px-8 py-8 text-white shadow-[0_8px_32px_rgba(99,102,241,0.3)]">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <span className="text-xl">📋</span>
                          </div>
                          <h3 className="text-2xl font-bold">Important Instructions</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold">1</span>
                            </div>
                            <p className="text-lg leading-relaxed">
                              <span className="font-semibold">Start talking to Maya</span> by clicking the call button on the right side
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold">2</span>
                            </div>
                            <p className="text-lg leading-relaxed">
                              <span className="font-semibold">Don't miss important details</span> like your free dates, budget preferences, and where you'll be traveling from
                            </p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-sm font-bold">3</span>
                            </div>
                            <p className="text-lg leading-relaxed">
                              <span className="font-semibold">After the call ends</span>, click "Confirm My Preferences" and wait for the host to generate the travel plan
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Voice AI Widget Container - Main Content */}
                    <div className="flex-1" style={{ minHeight: '500px' }}>
                      <VoiceAgentWidget
                        agentId="agent_01jxy55f0afx8aax07xahyqsy5"
                        userId={currentUserId}
                        groupId={groupId}
                        destination={destination}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading AI assistant...</p>
                      {loading && <p className="text-sm text-gray-500 mt-2">Loading trip details...</p>}
                      {!currentUserId && <p className="text-sm text-gray-500 mt-2">Getting user information...</p>}
                      {!groupId && <p className="text-sm text-gray-500 mt-2">Loading group information...</p>}
                      {!destination && <p className="text-sm text-gray-500 mt-2">Loading destination...</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Right Sidebar - User Status */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
          {/* Members List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Trip Members</h3>
          
          <div className="space-y-4">
            {groupMembers.map((user) => (
              <div key={user.id} className="flex items-center space-x-3 p-3 bg-white rounded-xl shadow-sm">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className={`text-sm ${user.completed ? 'text-green-600' : 'text-gray-500'}`}>
                    {user.completed ? 'Preferences shared' : 'Pending...'}
                  </p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  user.completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {user.completed ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Bottom Controls - Fixed */}
          <div className="p-6 border-t border-gray-200 space-y-3">
            {/* Copy Invite Link */}
            <Button
              onClick={copyInviteLink}
              variant="outline"
              className="w-full py-3 rounded-xl font-medium"
            >
              {copied ? (
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Copied!</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Copy className="w-4 h-4" />
                  <span>Copy Invite Link</span>
                </div>
              )}
            </Button>

            {/* Generate Travel Plan Button */}
            <Button
              onClick={handleGenerateTravelPlan}
              disabled={!allUsersReady || !isHost || generatingPlan}
              title={!isHost ? "Waiting for host to generate travel plan" : ""}
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 relative ${
                allUsersReady && isHost && !generatingPlan
                  ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {generatingPlan ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating Plan...</span>
                </div>
              ) : isHost ? (
                'Generate Travel Plan'
              ) : (
                'Waiting for Host'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}