import React from "react";
import { gsap } from "gsap";
import { ChevronRight, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { transferHostOnLeave } from "@/lib/hostTransfer";

interface MenuItemProps {
  link: string;
  text: string;
  image: string;
  destination?: string;
  members?: { name: string; avatar: string }[];
  additionalMembers?: number;
  groupId?: string;
  onLeaveTrip?: (groupId: string) => void;
  onClick?: () => void;
}

interface FlowingMenuProps {
  items?: MenuItemProps[];
}

// Function to get location images from Unsplash API
const getLocationImages = async (destination: string): Promise<string[]> => {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination)}&per_page=5&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        // Request specific dimensions and crop mode from Unsplash
        return data.results.map((result: any) => 
          `${result.urls.regular}&w=800&h=200&fit=crop&crop=edges`
        );
      }
    }
  } catch (error) {
    console.error('Error fetching location images:', error);
  }
  
  // Fallback to default image repeated 5 times
  return Array(5).fill(`https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg?auto=compress&cs=tinysrgb&w=800&h=200&fit=crop`);
};

const FlowingMenu: React.FC<FlowingMenuProps> = ({ items = [] }) => {
  const containerHeight = Math.max(400, items.length * 120); // Minimum 400px, or 120px per item
  
  return (
    <div className="w-full overflow-hidden" style={{ height: `${containerHeight}px` }}>
      <nav className="flex flex-col h-full m-0 p-0 bg-gray-900">
        {items.map((item, idx) => (
          <MenuItem key={idx} {...item} />
        ))}
      </nav>
    </div>
  );
};

const MenuItem: React.FC<MenuItemProps> = ({ link, text, image, destination, members = [], additionalMembers = 0, groupId, onLeaveTrip, onClick }) => {
  const itemRef = React.useRef<HTMLDivElement>(null);
  const marqueeRef = React.useRef<HTMLDivElement>(null);
  const marqueeInnerRef = React.useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [dynamicImages, setDynamicImages] = React.useState<string[]>([]);

  const animationDefaults = { duration: 0.6, ease: "expo" };

  // Load dynamic images when component mounts or destination changes
  React.useEffect(() => {
    const loadImages = async () => {
      if (destination) {
        const images = await getLocationImages(destination);
        setDynamicImages(images);
      } else {
        // If no destination, use the default image repeated 5 times
        setDynamicImages(Array(5).fill(image));
      }
    };
    loadImages();
  }, [destination, image]);

  const findClosestEdge = (
    mouseX: number,
    mouseY: number,
    width: number,
    height: number
  ): "top" | "bottom" => {
    const topEdgeDist = Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY, 2);
    const bottomEdgeDist =
      Math.pow(mouseX - width / 2, 2) + Math.pow(mouseY - height, 2);
    return topEdgeDist < bottomEdgeDist ? "top" : "bottom";
  };

  const handleMouseEnter = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    setIsHovered(true);
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current)
      return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = findClosestEdge(
      ev.clientX - rect.left,
      ev.clientY - rect.top,
      rect.width,
      rect.height
    );

    const tl = gsap.timeline({ defaults: animationDefaults });
    tl.set(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" })
      .set(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" })
      .to([marqueeRef.current, marqueeInnerRef.current], { y: "0%" });
  };

  const handleMouseLeave = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    setIsHovered(false);
    if (!itemRef.current || !marqueeRef.current || !marqueeInnerRef.current)
      return;
    const rect = itemRef.current.getBoundingClientRect();
    const edge = findClosestEdge(
      ev.clientX - rect.left,
      ev.clientY - rect.top,
      rect.width,
      rect.height
    );

    const tl = gsap.timeline({ defaults: animationDefaults });
    tl.to(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }).to(
      marqueeInnerRef.current,
      { y: edge === "top" ? "101%" : "-101%" },
      "<"
    );
  };

  // Don't render marquee content until we have images
  const repeatedMarqueeContent = React.useMemo(() => {
    if (dynamicImages.length === 0) return null;

    // Create a sequence of text and images that will be repeated
    const sequence = dynamicImages.map((imageUrl, index) => (
      <React.Fragment key={`original-${index}`}>
        <span className="text-[#000000] uppercase font-normal text-[4vh] leading-[1.2] p-[1vh_1vw_0]">
          {text}
        </span>
        <div
          className="w-[400px] h-[8vh] my-[2em] mx-[2vw] p-[1em_0] rounded-[50px] bg-cover bg-center overflow-hidden"
          style={{ 
            backgroundImage: `url(${imageUrl})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            minWidth: '150px',
            maxWidth: '150px'
          }}
        />
      </React.Fragment>
    ));

    // Repeat the sequence multiple times with unique keys
    return [
      ...sequence.map((item, i) => (
        <React.Fragment key={`sequence1-${i}`}>{item}</React.Fragment>
      )),
      ...sequence.map((item, i) => (
        <React.Fragment key={`sequence2-${i}`}>{item}</React.Fragment>
      )),
      ...sequence.map((item, i) => (
        <React.Fragment key={`sequence3-${i}`}>{item}</React.Fragment>
      ))
    ];
  }, [text, dynamicImages]);
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleLeaveTrip = async () => {
    if (!groupId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Transfer host if necessary before leaving
      await transferHostOnLeave(groupId, user.id);

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving trip:', error);
        return;
      }

      if (onLeaveTrip) {
        onLeaveTrip(groupId);
      }
    } catch (error) {
      console.error('Error leaving trip:', error);
    }
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <>
    <div
      className="flex-1 relative overflow-hidden text-center shadow-[0_-1px_0_0_#fff] min-h-[120px]"
      ref={itemRef}
    >
      <a
        className="flex items-center h-full relative cursor-pointer no-underline bg-[#1d4ed8] hover:bg-[#f8ff6c] transition-colors duration-300 px-8"
        href={onClick ? undefined : link}
        onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      >
        {/* Left Side - Destination and Members */}
        <div className="flex-1 text-left">
          <h3 className="text-[#f8ff6c] hover:text-[#1d4ed8] text-[4vh] font-bold uppercase mb-2 transition-colors duration-300">
            {text}
          </h3>
          
          {/* Member Avatars */}
          <div className={`flex items-center space-x-2 transition-all duration-300 ${
            isHovered ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
          }`}>
            <div className="flex -space-x-2">
              {members.slice(0, 3).map((member, index) => (
                <div
                  key={index}
                  className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gray-200"
                  style={{ zIndex: members.length - index }}
                >
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            {(additionalMembers > 0 || members.length > 3) && (
              <span className="text-[#f8ff6c] hover:text-[#1d4ed8] font-medium ml-2 text-sm transition-colors duration-300">
                +{members.length > 3 ? additionalMembers + (members.length - 3) : additionalMembers} others
              </span>
            )}
          </div>
        </div>

        {/* Right Side - Go Button */}
        <div className="flex items-center">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
            style={{ 
              backgroundColor: '#f8ff6c',
              opacity: isHovered ? 0 : 1,
              transform: isHovered ? 'scale(0.8)' : 'scale(1)'
            }}
          >
            <ChevronRight className="w-6 h-6" style={{ color: '#1d4ed8' }} />
          </div>
        </div>
      </a>
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none bg-white translate-y-[101%]"
        ref={marqueeRef}
      >
        <div className="h-full w-[200%] flex" ref={marqueeInnerRef}>
          <div className="flex items-center relative h-full w-[200%] will-change-transform animate-marquee">
            {repeatedMarqueeContent}
          </div>
        </div>
      </div>
    </div>

    {/* Context Menu */}
    {showContextMenu && (
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[150px]"
        style={{
          left: contextMenuPosition.x,
          top: contextMenuPosition.y,
        }}
      >
        <button
          onClick={() => {
            setShowContextMenu(false);
            setShowLeaveConfirm(true);
          }}
          className="w-full flex items-center space-x-2 px-4 py-2 text-left hover:bg-red-50 transition-colors text-red-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Trip</span>
        </button>
      </div>
    )}

    {/* Leave Confirmation Modal */}
    {showLeaveConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 max-w-sm mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Leave Trip</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to leave the {text} trip? You won't be able to see the itinerary or participate in planning.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowLeaveConfirm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleLeaveTrip();
                setShowLeaveConfirm(false);
              }}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Leave Trip
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default FlowingMenu;