'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { Plane, ArrowRight, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { getLocationImage } from '@/lib/getLocationImage';

export default function CreateTripPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [destination, setDestination] = useState('');
  const [destinationDisplay, setDestinationDisplay] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const router = useRouter();

  const steps = [
    { id: 'destination', question: 'Where would you like to go?' },
    { id: 'invite', question: 'Invite your travel buddies' }
  ];

  const currentStepData = steps[currentStep];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const createTravelGroup = useCallback(async () => {
    if (!destination.trim() || !destinationDisplay.trim()) return null;

    setLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return null;
      }

      console.log('Creating group with host_id:', user.id);

      // Generate main image URL
      const mainImageUrl = await getLocationImage(destinationDisplay.trim() || destination.trim());

      // Create travel group
      const { data: groupData, error: groupError } = await supabase
        .from('travel_groups')
        .insert({
          host_id: user.id,
          destination: destination.trim(),
          destination_display: destinationDisplay.trim(),
          trip_name: `Trip to ${destinationDisplay.trim()}`,
          main_image: mainImageUrl
        })
        .select('group_id')
        .single();

      if (groupError) {
        setError('Failed to create travel group: ' + groupError.message + ` (host_id: ${user.id})`);
        setLoading(false);
        return null;
      }

      // Add host as group member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.group_id,
          user_id: user.id,
          regenerate_vote: false,
          place_votes: {}
        });

      if (memberError) {
        setError('Failed to add host to group: ' + memberError.message);
        setLoading(false);
        return null;
      }

      return groupData.group_id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, [destination, destinationDisplay]);

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!destination.trim() || !destinationDisplay.trim()) return;
      
      // Create travel group when moving to invite step
      const createdGroupId = await createTravelGroup();
      if (!createdGroupId) return;

      setGroupId(createdGroupId);
      setInviteLink(`${window.location.origin}/join/${createdGroupId}`);

      // Transition to next step
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(1);
        setTimeout(() => {
          setIsVisible(true);
        }, 50);
      }, 300);
    } else {
      // Complete trip creation
      if (groupId) {
        // Store group ID in localStorage for the AI preferences page
        localStorage.setItem('currentGroupId', groupId);
      }
      setTimeout(() => {
        window.location.href = '/ai-preferences';
      }, 500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentStep === 0) {
      handleNext();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <div className="space-y-6">
          <LocationAutocomplete
            onSelect={(prediction) => {
              const mainName = prediction.structured_formatting?.main_text || prediction.description;
              setDestinationDisplay(mainName);
              setDestination(prediction.description);
            }}
            placeholder="Enter destination (e.g., Paris, Tokyo, New York, France, California)"
            className="h-16 text-lg rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-center"
          />

          <div className="flex justify-center">
            <Button
              onClick={handleNext}
              disabled={!destination.trim() || !destinationDisplay.trim()}
              className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              value={inviteLink}
              readOnly
              className="h-16 text-lg rounded-xl border-gray-300 bg-gray-50 text-center pr-16"
            />
            <button
              onClick={copyToClipboard}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
          
          <p className="text-center text-gray-600">
            Share this link with your friends to invite them to your {destinationDisplay} trip
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleNext}
            disabled={loading}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Setting up...</span>
              </div>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Complete Trip Setup
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Plane className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-gray-900">a2b.ai</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className={`transition-all duration-300 ease-in-out transform ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <div className="bg-white rounded-3xl card-shadow p-8 md:p-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {currentStepData?.question}
              </h1>
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>

            {renderStepContent()}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className={`text-center mt-6 transition-all duration-300 ease-in-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}