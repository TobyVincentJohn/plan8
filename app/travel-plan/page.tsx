'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Home, 
  Plane, 
  Hotel, 
  Calendar, 
  MapPin, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Check,
  RotateCcw,
  Clock,
  Navigation,
  Star,
  DollarSign,
  Settings,
  Copy,
  Trash2,
  RefreshCw,
  Edit3,
  Car,
  Train,
  Ship,
  BookOpen,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import InteractiveMap from '@/components/InteractiveMap';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import DateIcon from '@/components/DateIcon';
import { getLocationImage } from '@/lib/getLocationImage';
import { FadeIn } from '@/components/ui/fade-in';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getGooglePlacePhotoUrl } from '@/lib/getPlacePhoto';

interface Place {
  id: string;
  name: string;
  description: string;
  image: string;
  duration: string;
  walkTime?: string;
  distance?: string;
  travelMode?: 'walk' | 'car' | 'train' | 'metro' | 'ferry';
  type?: string;
  visitTime?: string;
  voted?: 'accept' | 'deny' | null;
  coordinates?: {
    lat: number;
    lng: number;
  };
  travelModes?: Record<string, { duration: string; distance: string }>;
  date: string;
  day: string;
  month: string;
}

interface DayItinerary {
  date: string;
  day: string;
  month: string;
  places: Place[];
  expanded?: boolean;
}

interface Flight {
  id: string;
  airline: string;
  iata_code?: string;
  departure: string;
  arrival: string;
  duration: string;
  price: string;
  stops: string;
  flight_type: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_date?: string;
  arrival_date?: string;
}

interface Hotel {
  id: string;
  name: string;
  rating: number;
  price: string;
  image: string;
  amenities: string[];
}

interface ItineraryData {
  itinerary: DayItinerary[];
  flights: Flight[];
  hotels: Hotel[];
  mapLocations: any[];
  budgetRange?: string;
}

interface TripMember {
  name: string;
  avatar: string;
}

// Helper to get the correct year for a given month and day
function getClosestYear(month: string, day: string): number {
  const now = new Date();
  const monthIndex = new Date(`${month} 1, 2000`).getMonth();
  const targetDate = new Date(now.getFullYear(), monthIndex, Number(day));
  if (targetDate < now) {
    // If the date has already passed this year, use next year
    return now.getFullYear() + 1;
  }
  return now.getFullYear();
}

export default function TravelPlanPage() {
  const [itineraryData, setItineraryData] = useState<ItineraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedDays, setExpandedDays] = useState<string[]>(['15']);
  const [itineraryExpanded, setItineraryExpanded] = useState(true);
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [regenerateVotes, setRegenerateVotes] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [hasVotedRegenerate, setHasVotedRegenerate] = useState(false);
  const [showMobileMap, setShowMobileMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tripTitle, setTripTitle] = useState('');
  const [dayExpandedStates, setDayExpandedStates] = useState<Record<string, boolean>>({});
  const [sidebarFullyOpen, setSidebarFullyOpen] = useState(true);
  const [savingTitle, setSavingTitle] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [tripImage, setTripImage] = useState<string>('https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop');
  const [destination, setDestination] = useState<string>('');
  const [selectedHotel, setSelectedHotel] = useState<string | null>(null);
  const [hasConfirmedItinerary, setHasConfirmedItinerary] = useState(false);
  const [allConfirmed, setAllConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const toastId = useRef(0);
  const [showRegenTooltip, setShowRegenTooltip] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState('');
  const [submittingRegen, setSubmittingRegen] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [airlineLogos, setAirlineLogos] = useState<{ [airline: string]: string }>({});

  const settingsRef = useRef<HTMLDivElement>(null);
  const mobileSettingsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ centerMapAt: (lat: number, lng: number) => void }>(null);

  // Compute if all places have been voted by the user
  const allPlacesVoted = itineraryData?.itinerary?.every(day => day.places.every(place => place.voted)) ?? false;

  // Move fetchOrGenerateItinerary to top-level so it can be called from anywhere
  const fetchOrGenerateItinerary = async () => {
    try {
      const groupId = searchParams.get('groupId');
      if (!groupId) {
        setError('Group ID not found.');
        setLoading(false);
        return;
      }

      // Fetch itinerary places from the new table
      const { data: placesData, error: placesError } = await supabase
        .from('itinerary_places')
        .select('*')
        .eq('group_id', groupId)
        .order('day_number', { ascending: true })
        .order('place_number', { ascending: true });

      if (placesError) throw placesError;

      // Group places by day
      const daysMap: Record<number, Place[]> = {};
      (placesData || []).forEach((place: any) => {
        if (!daysMap[place.day_number]) daysMap[place.day_number] = [];
        daysMap[place.day_number].push({
          id: place.id,
          name: place.place_name,
          description: place.description,
          image: place.image_link,
          duration: place.time_spent,
          type: place.type,
          visitTime: place.visit_time,
          coordinates: place.coordinates ? JSON.parse(place.coordinates) : undefined,
          date: place.date,
          day: place.day,
          month: place.month,
        });
      });
      // Convert to DayItinerary[]
      const itinerary: DayItinerary[] = Object.entries(daysMap).map(([dayNum, places]) => ({
        date: places[0]?.date || '',
        day: places[0]?.day || `Day ${dayNum}`,
        month: places[0]?.month || '',
        places,
      })).sort((a, b) => Number(a.day.split(' ')[1]) - Number(b.day.split(' ')[1]));

      // Fetch available_hotels and main_image and trip_name from travel_groups
      const { data: groupData, error: groupError } = await supabase
        .from('travel_groups')
        .select('available_hotels, main_image, destination_display, trip_name, destination, selected_flight')
        .eq('group_id', groupId)
        .single();
      if (groupError) throw groupError;

      // Set main image if available
      if (groupData?.main_image) {
        setTripImage(groupData.main_image);
      } else if (groupData?.destination_display || groupData?.destination) {
        const imageUrl = await getLocationImage(groupData.destination_display || groupData.destination);
        setTripImage(imageUrl);
      }

      // Set trip title
      setTripTitle(groupData?.trip_name || groupData?.destination_display || groupData?.destination || 'Trip Plan');
      setDestination(groupData?.destination_display || groupData?.destination || '');

      // Parse hotels from available_hotels
      let hotels: Hotel[] = [];
      if (groupData?.available_hotels) {
        hotels = groupData.available_hotels;
      }

      // Parse flights from selected_flight
      let flights: Flight[] = [];
      if (groupData?.selected_flight) {
        const selectedFlight = groupData.selected_flight;
        if (selectedFlight.parsed_details) {
          const parsed = selectedFlight.parsed_details;
          const iataCode = selectedFlight.iata_code;
          // Going flight
          if (parsed.going_flight) {
            flights.push({
              id: "going",
              flight_type: "Going",
              airline: parsed.airlines_used?.[0] || "Unknown Airline",
              iata_code: iataCode,
              departure: parsed.going_flight.departure_time,
              departure_date: parsed.going_flight.departure_date,
              arrival: parsed.going_flight.arrival_time,
              arrival_date: parsed.going_flight.arrival_date,
              duration: parsed.going_flight.duration,
              stops: parsed.going_flight.stops,
              price: "",
              departure_airport: parsed.going_flight.departure_airport,
              arrival_airport: parsed.going_flight.arrival_airport
            });
          }
          // Return flight
          if (parsed.return_flight) {
            flights.push({
              id: "return",
              flight_type: "Return",
              airline: parsed.airlines_used?.[1] || parsed.airlines_used?.[0] || "Unknown Airline",
              iata_code: iataCode,
              departure: parsed.return_flight.departure_time,
              departure_date: parsed.return_flight.departure_date,
              arrival: parsed.return_flight.arrival_time,
              arrival_date: parsed.return_flight.arrival_date,
              duration: parsed.return_flight.duration,
              stops: parsed.return_flight.stops,
              price: `${parsed.total_price}`,
              departure_airport: parsed.return_flight.departure_airport,
              arrival_airport: parsed.return_flight.arrival_airport
            });
          }
        } else {
          // Fallback to basic parsing
          flights = [
            {
              id: "1",
              airline: selectedFlight.text_content?.split(' ')[0] || "Unknown Airline",
              iata_code: selectedFlight.iata_code,
              price: selectedFlight.text_content?.match(/\$\d+/)?.[0] || "",
              departure: "See flight details",
              arrival: "See flight details",
              duration: "See flight details",
              stops: "See flight details",
              flight_type: "Going",
              departure_airport: "",
              arrival_airport: "",
              departure_date: "",
              arrival_date: ""
            }
          ];
        }
      }

      setItineraryData({
        itinerary,
        flights,
        hotels,
        mapLocations: [],
      });
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch itinerary');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrGenerateItinerary();
  }, [searchParams]);

  useEffect(() => {
    const groupId = searchParams.get('groupId');
    if (!groupId) return;

    // Subscribe to group_members changes for this group
    const channel = supabase
      .channel('group-members-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          // Re-fetch members when a change occurs
          fetchOrGenerateItinerary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (mobileSettingsRef.current && !mobileSettingsRef.current.contains(event.target as Node)) {
        setShowMobileSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Show scroll button when near the bottom of the page
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000; // Show button when within 1000px of bottom
      setShowScrollTop(scrolledToBottom);
      
      if (isMobile || !itineraryData) return;
      
      const dayIds = itineraryData.itinerary.map(day => day.date);
      const sections = ['overview', 'flights', 'hotels', ...dayIds];
      const scrollPosition = window.scrollY + 200;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, itineraryData]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!sidebarCollapsed) {
      timeout = setTimeout(() => setSidebarFullyOpen(true), 300);
    } else {
      setSidebarFullyOpen(false);
    }
    return () => clearTimeout(timeout);
  }, [sidebarCollapsed]);

  const handleMouseEnter = (id: string, event: React.MouseEvent) => {
    setHoveredTooltip(id);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId]
    );
  };

  const toggleDayInMain = (dayId: string) => {
    setDayExpandedStates(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
  };

  const scrollToSection = (sectionId: string) => {
    if (isMobile) {
      setActiveSection(sectionId);
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRegenerateVote = async () => {
    if (hasVotedRegenerate || regenerating) return;
    setShowRegenModal(true);
  };

  const submitRegenerateFeedback = async () => {
    setSubmittingRegen(true);
    setRegenError('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error('Not authenticated');
      const groupId = searchParams.get('groupId');
      if (!groupId) throw new Error('No group ID');
      const payload = { groupId, userId: data.user.id, feedback: regenFeedback };
      console.log('Submitting regenerate feedback:', payload);
      const response = await fetch('/api/regenerate-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to submit feedback');
      }
      setHasVotedRegenerate(true);
      setShowRegenModal(false);
      setRegenFeedback('');
      // If regeneration happened, refetch group data and reset vote state
      if (result.regenerated) {
        await fetchOrGenerateItinerary();
        setHasVotedRegenerate(false);
      }
    } catch (err: any) {
      setRegenError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmittingRegen(false);
    }
  };

  const handleDeletePlan = () => {
    window.location.href = '/dashboard';
  };

  const copyInviteLink = () => {
    const groupId = searchParams.get('groupId');
    navigator.clipboard.writeText(`${window.location.origin}/join/${groupId}`);
  };

  const handleTitleEdit = () => {
    setIsEditingTitle(false);
    saveTripTitle();
  };

  const saveTripTitle = async () => {
    const groupId = searchParams.get('groupId');
    if (!groupId || savingTitle) return;
    
    setSavingTitle(true);
    try {
      const { error } = await supabase
        .from('travel_groups')
        .update({ trip_name: tripTitle })
        .eq('group_id', groupId);

      if (error) {
        console.error('Error saving trip title:', error);
      }
    } catch (error) {
      console.error('Error saving trip title:', error);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleEdit();
    }
  };

  const handleConfirmItinerary = async () => {
    setConfirming(true);
    const groupId = searchParams.get('groupId');
    const { data } = await supabase.auth.getUser();
    if (!data.user?.id || !groupId) return;
    if (selectedHotel) {
      await supabase
        .from('group_members')
        .update({ selected_hotel: selectedHotel })
        .eq('group_id', groupId)
        .eq('user_id', data.user.id);
    }
    await supabase
      .from('group_members')
      .update({ confirm_itinerary_vote: true })
      .eq('group_id', groupId)
      .eq('user_id', data.user.id);
    setHasConfirmedItinerary(true);
    setConfirming(false);

    // If only one member in the group, redirect immediately
    if (totalMembers === 1) {
      window.location.href = `/itinerary-confirmation?groupId=${groupId}`;
    }
  };

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'walking': return <span title="Walk">🚶</span>;
      case 'bicycling': return <span title="Bike">🏍️</span>;
      case 'driving': return <span title="Car">🚗</span>;
      case 'transit': return <span title="Transit">🚆</span>;
      default: return <span title="Travel">🚗</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'monument': return 'Monument';
      case 'museum': return 'Museum';
      case 'park': return 'Park';
      case 'food': return 'Restaurant';
      case 'shopping': return 'Shopping';
      case 'photo_spot': return 'Photo Spot';
      case 'historical': return 'Historical';
      case 'entertainment': return 'Entertainment';
      case 'cultural': return 'Cultural';
      case 'nature': return 'Nature';
      default: return 'Attraction';
    }
  };

  const showToast = (message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Subscribe to group_members changes for hotel voting and regenerate voting
  useEffect(() => {
    const groupId = searchParams.get('groupId');
    if (!groupId) return;
    let currentUserId: string | null = null;
    supabase.auth.getUser().then(({ data }) => {
      currentUserId = data.user?.id || null;
    });
    const channel = supabase
      .channel('group-members-toast')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (!currentUserId || newRow.user_id === currentUserId) return;
          // Fetch user profile for first name
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', newRow.user_id)
            .single();
          const firstName = profileData?.first_name || 'A user';
          // Hotel vote notification
          if (newRow.selected_hotel && newRow.selected_hotel !== oldRow.selected_hotel) {
            // Get hotel name from itineraryData
            const hotel = itineraryData?.hotels?.find(h => h.id === newRow.selected_hotel);
            if (hotel) {
              showToast(`${firstName} has voted for ${hotel.name}`);
            }
          }
          // Regenerate vote notification
          if (newRow.regenerate_vote && !oldRow.regenerate_vote) {
            showToast(`${firstName} has requested to regenerate the itinerary`);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, itineraryData]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    // Fetch airline logos for all flights
    const fetchLogos = async () => {
      if (!itineraryData?.flights) return;
      const logoMap: { [airline: string]: string } = {};
      await Promise.all(
        itineraryData.flights.map(async (flight) => {
          if (flight.airline && !airlineLogos[flight.airline]) {
            const logoUrl = await getGooglePlacePhotoUrl(flight.airline + ' airline logo');
            logoMap[flight.airline] = logoUrl || '';
          }
        })
      );
      setAirlineLogos((prev) => ({ ...prev, ...logoMap }));
    };
    fetchLogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itineraryData?.flights]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-gray-800">Generating Your Travel Plan...</h1>
          <p className="text-gray-600 mt-2">Our AI is crafting the perfect trip for you. This might take a moment.</p>
        </div>
      </div>
    );
  }

  if (error || !itineraryData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-2xl font-bold text-red-600">Oops! Something went wrong.</h1>
          <p className="text-gray-600 mt-2">{error || 'Could not load itinerary data.'}</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { itinerary, flights, hotels, mapLocations } = itineraryData;

  // Fallback: reconstruct mapLocations from itinerary if missing or empty
  const computedMapLocations =
    mapLocations && mapLocations.length > 0
      ? mapLocations
      : itinerary.flatMap((day) =>
          day.places.map((place) => ({
            id: place.id,
            name: place.name,
            lat: place.coordinates?.lat || 0,
            lng: place.coordinates?.lng || 0,
            day: day.month,
            type: place.type,
            visitTime: place.visitTime,
            duration: place.duration,
            walkTimeFromPrevious: place.walkTime,
          }))
        );

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, isExternal: true, href: '/dashboard' },
    { id: 'overview', label: 'Trip Overview', icon: MapPin },
    { id: 'flights', label: 'Flights', icon: Plane },
    { id: 'hotels', label: 'Hotels', icon: Hotel },
  ];

  const renderStarRating = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-600 ml-1">{rating}</span>
      </div>
    );
  };

  const renderMainContent = () => {
    if (isMobile) {
      switch (activeSection) {
        case 'overview':
          return renderOverviewContent();
        case 'flights':
          return renderFlightsContent();
        case 'hotels':
          return renderHotelsContent();
        case 'itinerary':
          return renderItineraryContent();
        default:
          return renderOverviewContent();
      }
    }

    return (
      <div className="space-y-12">
        <div id="overview">{renderOverviewContent()}</div>
        <div id="flights">{renderFlightsContent()}</div>
        <div id="hotels">{renderHotelsContent()}</div>
        <div id="itinerary">{renderItineraryContent()}</div>
      </div>
    );
  };

  const renderOverviewContent = () => (
    <FadeIn>
      <div className="space-y-8">
        {/* Trip Image */}
        <div className="w-full h-[28rem] md:h-[36rem] rounded-2xl overflow-hidden bg-gray-200">
          <img
            src={tripImage}
            alt={destination}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Trip Header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={tripTitle}
                  onChange={(e) => setTripTitle(e.target.value)}
                  onBlur={handleTitleEdit}
                  onKeyPress={handleTitleKeyPress}
                  className="text-2xl md:text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
                  autoFocus
                  disabled={savingTitle}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{tripTitle}</h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={savingTitle}
                  >
                    {savingTitle ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit3 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
              <p className="text-lg text-gray-600 mt-1">
                {itinerary[0]?.month} {itinerary[0]?.date}-{itinerary[itinerary.length - 1]?.date}, {itinerary[0] ? getClosestYear(itinerary[0].month, itinerary[0].date) : ''} • {itinerary.length} Days
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl md:text-2xl font-bold text-blue-600">
                {itineraryData.budgetRange ? itineraryData.budgetRange : 'Price varies'}
              </p>
              <p className="text-sm text-gray-600">estimated budget per person</p>
            </div>
          </div>
          
          {/* Trip Members */}
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 font-medium text-sm">Travelers:</span>
            <div className="flex -space-x-2">
              {tripMembers.map((member, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-200"
                  style={{ zIndex: tripMembers.length - index }}
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <span className="text-gray-600 text-sm">{tripMembers.length} travelers</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <Plane className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Suggested Flight</h3>
            <p className="text-xs text-gray-600">{flights?.[0]?.airline || 'Air India'} • {flights?.[0]?.stops || 'Direct'}</p>
            <p className="text-xs text-gray-500">{flights?.[0]?.duration || '8h 15m'}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <Hotel className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Suggested Hotel</h3>
            <p className="text-xs text-gray-600">{hotels?.[0]?.name || 'Hotel Name'}</p>
            <p className="text-xs text-gray-500">{hotels?.[0]?.rating || 4.5}★ • {hotels?.[0]?.price || '$180/night'}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 text-center">
            <MapPin className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Activities</h3>
            <p className="text-xs text-gray-600">{itinerary.flatMap(day => day.places).length} attractions</p>
            <p className="text-xs text-gray-500">Museums, landmarks</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!allConfirmed ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleConfirmItinerary}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold"
              disabled={hasConfirmedItinerary || confirming}
          >
              {hasConfirmedItinerary ? 'Waiting for others to confirm...' : confirming ? 'Confirming...' : 'Confirm Itinerary'}
          </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => {
                const groupId = searchParams.get('groupId');
                window.location.href = `/itinerary-confirmation?groupId=${groupId}`;
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold"
            >
              Go to Confirmation
            </Button>
          </div>
        )}

        {/* Voting Progress */}
        <div className="text-center text-sm text-gray-600 space-y-1">
          {regenerateVotes > 0 && (
            <p>Regenerate votes: {regenerateVotes}/{totalMembers}</p>
          )}
        </div>
      </div>
    </FadeIn>
  );

  const renderFlightsContent = () => (
    <FadeIn>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Best Flight Option</h2>
        </div>
        
        <div className="flex items-stretch">
          <div className="flex-1 max-w-[500px]">
            <div className="bg-white rounded-2xl py-2 px-6">
              {(flights || []).map((flight, index) => (
                <>
                  {index > 0 && (
                    <div className="my-4 flex items-center">
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <span className="mx-4 text-xs text-gray-400 font-semibold">Return Flight</span>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                  )}
                  <div key={flight.id} className="flex items-center">
                    {/* Airline logo using IATA code if available */}
                    {flight.iata_code ? (
                      <img
                        src={`https://content.airhex.com/content/logos/airlines_${flight.iata_code}_60_60_s.png`}
                        alt={flight.airline + ' logo'}
                        className="w-10 h-10 rounded-full object-contain mr-4 border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-100 mr-4 flex items-center justify-center">
                        <Plane className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {flight.flight_type === 'Going' && <span className="text-blue-600 mr-2">Going</span>}
                          {flight.flight_type === 'Return' && <span className="text-green-600 mr-2">Return</span>}
                          {flight.airline}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-6 text-gray-600 text-sm">
                        <div>
                          <p className="font-medium">{flight.departure} <span className="ml-1 text-xs text-gray-400">{flight.departure_date}</span></p>
                          <p className="text-xs">{flight.departure_airport ? `${flight.departure_airport} Departure` : 'Departure'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-px bg-gray-300"></div>
                          <Plane className="w-3 h-3" />
                          <div className="w-6 h-px bg-gray-300"></div>
                        </div>
                        <div>
                          <p className="font-medium">{flight.arrival} <span className="ml-1 text-xs text-gray-400">{flight.arrival_date}</span></p>
                          <p className="text-xs">{flight.arrival_airport ? `${flight.arrival_airport} Arrival` : 'Arrival'}</p>
                        </div>
                        <div className="text-xs">
                          <p>{flight.duration}</p>
                          <p>{flight.stops}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ))}
            </div>
          </div>
          
          <div className="w-px bg-gray-200"></div>
          
          <div className="w-72 ml-4">
            <div className="w-full h-full bg-white rounded-2xl py-2 px-4 flex flex-col justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-600">Round Trip Total</p>
                <p className="text-3xl font-bold text-blue-600">
                  {flights && flights.length > 1 ? `${flights[1].price}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );

  const renderHotelsContent = () => (
    <FadeIn>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Recommended Hotels</h2>
        {itineraryData?.hotels && (
          <div className="grid grid-cols-1 gap-6">
            {itineraryData.hotels.map((hotel) => (
              <div
                key={hotel.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/3 flex items-center justify-center py-3">
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-[260px] h-[260px] object-cover rounded-lg"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {hotel.name}
                        </h3>
                        <div className="mt-1">
                          {renderStarRating(hotel.rating)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {hotel.price}
                        </div>
                        <div className="text-sm text-gray-500">per night</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {hotel.amenities.map((amenity, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                      <Button
                        onClick={() => setSelectedHotel(hotel.id)}
                        variant={selectedHotel === hotel.id ? "default" : "secondary"}
                        className={`w-full ${selectedHotel === hotel.id ? 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-none' : ''}`}
                      >
                        {selectedHotel === hotel.id ? "Selected" : "Select Hotel"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FadeIn>
  );

  const renderItineraryContent = () => (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold text-gray-900">Daily Itinerary</h2>
      
      <div className="space-y-6">
        {itinerary.map((day, dayIndex) => (
          <FadeIn key={day.date} delay={dayIndex * 100}>
            <div id={day.date} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleDayInMain(day.date)}
                className="w-full p-6 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Day {dayIndex + 1}</h3>
                  <p className="text-sm text-gray-600">{day.day}, {day.month} {day.date} {getClosestYear(day.month, day.date)}</p>
                </div>
                {dayExpandedStates[day.date] ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                dayExpandedStates[day.date] ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="p-6 pt-0 space-y-6">
                  {day.places.map((place, index) => (
                    <div key={place.id}>
                      {/* Place card */}
                      <div
                        onMouseEnter={() => {
                          if (place.coordinates?.lat && place.coordinates?.lng) {
                            mapRef.current?.centerMapAt(place.coordinates.lat, place.coordinates.lng);
                          }
                        }}
                      >
                        <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex space-x-4">
                            <div className="w-40 h-32 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <img
                              src={place.image}
                              alt={place.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div>
                                  <h4 className="text-base font-semibold text-gray-900">{place.name}</h4>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <span className="bg-gray-200 px-2 py-1 rounded-full">{getTypeLabel(place.type || 'attraction')}</span>
                                    {place.visitTime && <span>Visit at {place.visitTime}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{place.description}</p>
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Scroll to Top Button - Positioned inside itinerary box */}
      <button
        onClick={scrollToTop}
        className={`absolute bottom-6 right-6 z-10 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition-all duration-150 shadow-lg hover:scale-110 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-6 h-6" />
      </button>
    </div>
  );

  const renderSidebar = () => (
    <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed h-full z-10`}>
      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Logo and Back Button */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className={`flex items-center space-x-2`}>
                <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <Plane className="w-4 h-4 text-white" />
                </div>
                <span className={`text-lg font-bold text-gray-900 transition-opacity duration-300 ${sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>Plan8</span>
              </div>
            )}
            <Button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              variant="ghost"
              size="sm"
              className="p-1"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-2">
          {sidebarItems.map((item) => {
            if (item.isExternal) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100`}
                  onMouseEnter={(e) => sidebarCollapsed && handleMouseEnter(item.id, e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="h-8 flex items-center">
                    <item.icon className="w-4 h-4 text-gray-600 transition-opacity duration-300" />
                  </div>
                  {!sidebarCollapsed && (
                    <span className={`font-medium text-gray-700 text-sm transition-opacity duration-300 ${sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>{item.label}</span>
                  )}
                </a>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 ${
                  activeSection === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
                onMouseEnter={(e) => sidebarCollapsed && handleMouseEnter(item.id, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="h-8 flex items-center">
                  <item.icon className="w-4 h-4 transition-opacity duration-300" />
                </div>
                {!sidebarCollapsed && (
                  <span className={`font-medium text-sm transition-opacity duration-300 ${sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>{item.label}</span>
                )}
              </button>
            );
          })}

          {/* Itinerary Section */}
          <div className="mt-2">
            <button
              onClick={() => setItineraryExpanded(!itineraryExpanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
            >
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                {!sidebarCollapsed && (
                  <span className={`font-medium text-sm transition-opacity duration-300 ${
                    sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}>Itinerary</span>
                )}
              </div>
              {!sidebarCollapsed && (
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                  itineraryExpanded ? 'rotate-180' : ''
                }`} />
              )}
            </button>

            {/* Itinerary Days List */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              itineraryExpanded && !sidebarCollapsed ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="ml-4 mt-1 space-y-1 overflow-y-auto">
                {itinerary.map((day, idx) => (
                  <button
                    key={day.date}
                    onClick={() => scrollToSection(day.date)}
                    id={`sidebar-${day.date}`}
                    className={`w-full flex items-center space-x-2 px-2 py-2 rounded-lg transition-colors hover:bg-gray-100 ${
                      activeSection === day.date ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    } transition-opacity duration-300 ${sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    style={{ transitionDelay: `${150 + idx * 80}ms` }}
                  >
                    <DateIcon month={day.month} date={day.date} className="w-8" />
                    <span className="font-medium text-sm">Day {idx + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 space-y-2">
        <button
          onClick={handleRegenerateVote}
          disabled={hasVotedRegenerate}
          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
            hasVotedRegenerate ? 'bg-gray-100 text-gray-500' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          {!sidebarCollapsed && (
            <span className={`font-medium text-sm whitespace-nowrap transition-opacity duration-300 ${
              sidebarFullyOpen ? 'opacity-100' : 'opacity-0'
            }`}>
              {hasVotedRegenerate ? 'Waiting for others...' : 'Regenerate'}
              {regenerateVotes > 0 && !hasVotedRegenerate && ` (${regenerateVotes}/${totalMembers})`}
            </span>
          )}
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
        >
          <Settings className="w-4 h-4" />
          {!sidebarCollapsed && (
            <span className={`font-medium text-sm whitespace-nowrap transition-opacity duration-300 ${
              sidebarFullyOpen ? 'opacity-100' : 'opacity-0'
            }`}>
              Settings
            </span>
          )}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <Plane className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Plan8</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowMobileMap(!showMobileMap)}
                variant="outline"
                className="px-3 py-1 rounded-lg text-sm"
              >
                {showMobileMap ? 'Close Map' : 'View Map'}
              </Button>
              <div className="relative" ref={mobileSettingsRef}>
                <Button
                  onClick={() => setShowMobileSettings(!showMobileSettings)}
                  variant="outline"
                  className="p-2 rounded-lg"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                {showMobileSettings && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                    <button
                      onClick={copyInviteLink}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">Copy Invite Link</span>
                    </button>
                    <button
                      onClick={handleRegenerateVote}
                      disabled={hasVotedRegenerate || regenerating}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                        hasVotedRegenerate ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''
                      }`}
                    >
                      <div className="h-8 flex items-center">
                        <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                      </div>
                      <span className="text-sm text-gray-700">
                        {regenerating ? 'Regenerating...' : hasVotedRegenerate ? 'Waiting for others...' : 'Regenerate'}
                      </span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">Delete Trip</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Map Overlay */}
        {showMobileMap && (
          <div className="fixed inset-0 z-50 bg-white">
            <div className="h-full flex flex-col">
              <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Map View</h3>
                <Button
                  onClick={() => setShowMobileMap(false)}
                  variant="outline"
                  className="px-3 py-1 rounded-lg text-sm"
                >
                  Close
                </Button>
              </div>
              <div className="flex-1">
                <InteractiveMap
                  locations={computedMapLocations}
                  center={computedMapLocations[0] ? { lat: computedMapLocations[0].lat, lng: computedMapLocations[0].lng } : { lat: 48.8566, lng: 2.3522 }}
                  zoom={12}
                  className="w-full h-full"
                  ref={mapRef}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-20">
          {renderMainContent()}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around">
          {[
            { id: 'overview', label: 'Overview', icon: MapPin },
            { id: 'flights', label: 'Flights', icon: Plane },
            { id: 'hotels', label: 'Hotels', icon: Hotel },
            { id: 'itinerary', label: 'Itinerary', icon: Calendar }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                activeSection === item.id ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {renderSidebar()}
        {/* Main Content Area */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex items-start`} style={{ width: 'auto' }}>
          <div className="max-w-[900px] w-full px-6 pt-6 pb-6 mx-auto">
            {renderMainContent()}
          </div>
        </div>

        {/* Map Section */}
        <div className="hidden md:block flex-1 bg-gray-100 border-l border-gray-200 sticky top-0 h-screen">
          <InteractiveMap
            locations={computedMapLocations}
            center={computedMapLocations[0] ? { lat: computedMapLocations[0].lat, lng: computedMapLocations[0].lng } : { lat: 48.8566, lng: 2.3522 }}
            zoom={12}
            className="w-full h-full"
            ref={mapRef}
          />
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Travel Plan</h3>
              <p className="text-gray-600 mb-4">Are you sure? :(</p>
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeletePlan}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tooltips */}
        {hoveredTooltip && sidebarCollapsed && (
          <div
            className="fixed z-50 bg-gray-900 text-white px-2 py-1 rounded-lg text-xs pointer-events-none"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
            }}
          >
            {
              sidebarItems.find(item => item.id === hoveredTooltip)?.label ||
             itinerary.find(day => day.date === hoveredTooltip)?.month ||
              (hoveredTooltip ? hoveredTooltip.charAt(0).toUpperCase() + hoveredTooltip.slice(1) : '')
            }
          </div>
        )}

        {/* Vote Tooltips */}
        {hoveredTooltip && hoveredTooltip.startsWith('accept-') && (
          <div
            className="fixed z-50 bg-green-900 text-white px-2 py-1 rounded-lg text-xs pointer-events-none"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
            }}
          >
            Vote to Accept
          </div>
        )}
        {hoveredTooltip && hoveredTooltip.startsWith('deny-') && (
          <div
            className="fixed z-50 bg-red-900 text-white px-2 py-1 rounded-lg text-xs pointer-events-none"
            style={{
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y - 10,
            }}
          >
            Vote to Reject
          </div>
        )}

        {/* Render toasts */}
        <div className="fixed top-6 right-6 z-50 space-y-2">
          {toasts.map((toast) => (
            <div key={toast.id} className="bg-blue-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
              {toast.message}
            </div>
          ))}
        </div>

        {/* Regenerate Feedback Modal */}
        {showRegenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-2">Regenerate Itinerary</h2>
              <p className="text-gray-600 mb-4">Tell us what you liked about the itinerary and what you would like to see replaced.</p>
              <Textarea
                value={regenFeedback}
                onChange={e => setRegenFeedback(e.target.value)}
                rows={8}
                className="w-full mb-2 text-lg p-4 min-h-[180px]"
                placeholder="Share your feedback..."
                disabled={submittingRegen}
              />
              {regenError && <div className="text-red-600 text-sm mb-2">{regenError}</div>}
              <div className="flex justify-end space-x-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowRegenModal(false); setRegenFeedback(''); setRegenError(''); }}
                  disabled={submittingRegen}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitRegenerateFeedback}
                  disabled={submittingRegen || !regenFeedback.trim()}
                  className="bg-[#2049be] hover:bg-[#183a96] text-white border-none"
                >
                  {submittingRegen ? 'Submitting...' : 'Done'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}