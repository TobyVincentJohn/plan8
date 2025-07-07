'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plane, Users, MapPin, Calendar, Check, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface TravelGroup {
  group_id: string;
  destination: string;
  destination_display: string;
  created_at: string;
  host: {
    first_name: string;
    last_name: string;
  };
  member_count: number;
}

interface GroupMember {
  user_id: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
}

export default function JoinTripPage({ params }: { params: { groupId: string } }) {
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [travelGroup, setTravelGroup] = useState<TravelGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndLoadGroup = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // First, try to load travel group details using service role or public access
        // We'll use a direct query without RLS restrictions for public group info
        const { data: groupData, error: groupError } = await supabase
          .from('travel_groups')
          .select('group_id, destination, destination_display, created_at, host_id')
          .eq('group_id', params.groupId)
          .single();

        if (groupError) {
          console.error('Group query error:', groupError);
          setError('Travel group not found');
          setLoading(false);
          return;
        }

        if (!groupData) {
          setError('Travel group not found');
          setLoading(false);
          return;
        }

        // Get host profile information
        const { data: hostData, error: hostError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', groupData.host_id)
          .single();

        if (hostError) {
          console.error('Host query error:', hostError);
          setError('Failed to load group host information');
          setLoading(false);
          return;
        }

        // Load group members
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select(`
            user_id,
            profiles!group_members_user_id_fkey(first_name, last_name, profile_picture)
          `)
          .eq('group_id', params.groupId);

        if (membersError) {
          console.error('Members query error:', membersError);
          // Don't fail completely if we can't load members, just show empty list
        }

        const formattedMembers = membersData?.map(member => ({
          user_id: member.user_id,
          first_name: (member.profiles as any)?.first_name || 'Unknown',
          last_name: (member.profiles as any)?.last_name || 'User',
          profile_picture: (member.profiles as any)?.profile_picture
        })) || [];

        // Check if current user is already a member
        const isCurrentUserMember = formattedMembers.some(member => member.user_id === user.id);
        setIsAlreadyMember(isCurrentUserMember);

        setTravelGroup({
          group_id: groupData.group_id,
          destination: groupData.destination,
          destination_display: groupData.destination_display,
          created_at: groupData.created_at,
          host: {
            first_name: hostData.first_name,
            last_name: hostData.last_name
          },
          member_count: formattedMembers.length
        });
        setMembers(formattedMembers);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An error occurred while loading the trip details');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadGroup();
  }, [params.groupId]);

  const handleJoinTrip = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Add user to group members
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: params.groupId,
          user_id: user.id,
          regenerate_vote: false,
          place_votes: {},
          confirm_itinerary_vote: false
        });

      if (joinError) {
        if (joinError.code === '23505') { // Unique constraint violation
          setError('You are already a member of this trip');
        } else {
          console.error('Join error:', joinError);
          throw new Error('Failed to join trip: ' + joinError.message);
        }
        return;
      }

      setSuccess(true);
      
      // Store group ID for AI preferences
      localStorage.setItem('currentGroupId', params.groupId);
      
      // Redirect to AI preferences after a short delay
      setTimeout(() => {
        router.push('/ai-preferences');
      }, 2000);

    } catch (err) {
      console.error('Join trip error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setJoining(false);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900">a2b.ai</span>
          </div>
          
          <div className="bg-white rounded-3xl card-shadow p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Join the Trip</h1>
            <p className="text-gray-600 mb-6">
              You need to sign in to join this travel group.
            </p>
            <Link href="/auth">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold">
                Sign In to Join
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error && !travelGroup) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900">a2b.ai</span>
          </div>
          
          <div className="bg-white rounded-3xl card-shadow p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip Not Found</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/dashboard">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900">a2b.ai</span>
          </div>
          
          <div className="bg-white rounded-3xl card-shadow p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the Trip!</h1>
            <p className="text-gray-600 mb-6">
              You&apos;ve successfully joined the {travelGroup?.destination_display} trip. 
              Redirecting you to share your preferences...
            </p>
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900">a2b.ai</span>
          </div>
        </div>

        {/* Trip Details Card */}
        <div className="bg-white rounded-3xl card-shadow p-8 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              You&apos;re Invited to Join a Trip!
            </h1>
            <p className="text-gray-600">
              {travelGroup?.host.first_name} {travelGroup?.host.last_name} has invited you to join their trip
            </p>
          </div>

          {/* Trip Info */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <MapPin className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">{travelGroup?.destination_display}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">
                  {travelGroup?.member_count} {travelGroup?.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700">
                  Created {new Date(travelGroup?.created_at || '').toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Current Members */}
          {members.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Current Members</h3>
              <div className="flex justify-center">
                <div className="flex -space-x-2">
                  {members.slice(0, 5).map((member, index) => (
                    <div
                      key={member.user_id}
                      className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-gray-200"
                      style={{ zIndex: members.length - index }}
                      title={`${member.first_name} ${member.last_name}`}
                    >
                      {member.profile_picture ? (
                        <img
                          src={member.profile_picture}
                          alt={`${member.first_name} ${member.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src="https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png"
                          alt={`${member.first_name} ${member.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                  {members.length > 5 && (
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-semibold">+{members.length - 5}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600 text-center">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isAlreadyMember ? (
              <Link href="/ai-preferences" className="flex-1">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold">
                  Continue to Preferences
                </Button>
              </Link>
            ) : (
              <Button
                onClick={handleJoinTrip}
                disabled={joining}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
              >
                {joining ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Joining...</span>
                  </div>
                ) : (
                  'Join This Trip'
                )}
              </Button>
            )}
            <Link href="/dashboard" className="flex-1">
              <Button
                variant="outline"
                className="w-full py-3 rounded-xl font-semibold"
              >
                Maybe Later
              </Button>
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}