'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const featureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
        }
      });
    }, observerOptions);

    if (heroRef.current) observer.observe(heroRef.current);
    if (featureRef.current) observer.observe(featureRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="min-h-screen bg-white flex items-center justify-center px-4 pt-24">
      <div className="w-full mx-auto">
        {/* Hero Card */}
        <div 
          ref={heroRef}
          className="bg-white rounded-3xl card-shadow overflow-hidden mb-32 opacity-0 translate-y-8 transition-all duration-700 ease-out"
        >
          {/* Hero Image with Overlay Text */}
          <div className="relative h-[500px] md:h-[930px]">
            <Image
              src="/bg.png"
              alt="Travel Planning Background"
              fill
              className="object-cover object-center"
              priority
              quality={95}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            
            {/* Hero Text Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
                  <span style={{ color: '#f8ff6c' }}>Trips made social,</span>
                  <br />
                  <span style={{ color: '#f8ff6c' }}>plans made easy.</span>
                </h1>
                <Link href="/auth">
                  <Button 
                    className="text-black font-semibold px-8 py-4 text-lg rounded-full transition-all duration-200 hover:scale-105"
                    style={{ backgroundColor: '#f8ff6c' }}
                  >
                    Start Planning
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Feature Description */}
        <div 
          ref={featureRef}
          className="max-w-6xl mx-auto text-center mb-48 opacity-0 translate-y-8 transition-all duration-700 ease-out"
        >
          <div className="mb-12">
            <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">
              Collaborative Planning Made Simple
            </h3>
            <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
              Plan your perfect trip with friends and family in real-time. Share ideas, vote on destinations, 
              split costs, and create unforgettable memories together. Our AI-powered suggestions help you 
              discover hidden gems and optimize your itinerary for the best experience.
            </p>
          </div>
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
              <svg className="w-10 h-10 text-blue-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m13-3.13V7a4 4 0 00-3-3.87M6 4.13A4 4 0 003 7v6m0 0a4 4 0 003 3.87m0 0h12m0 0a4 4 0 003-3.87" /></svg>
              <h4 className="font-semibold text-lg mb-2">Collaborative Trip Planning</h4>
              <p className="text-gray-600">Plan trips together with friends and family in real-time.</p>
            </div>
            {/* Feature 2 */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
              <svg className="w-10 h-10 text-purple-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M12 4v16m0 0H3" /></svg>
              <h4 className="font-semibold text-lg mb-2">AI-Powered Itinerary Generation</h4>
              <p className="text-gray-600">Instantly generate personalized itineraries based on group preferences.</p>
            </div>
            {/* Feature 3 */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
              <svg className="w-10 h-10 text-green-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
              <h4 className="font-semibold text-lg mb-2">Dynamic Map Interface</h4>
              <p className="text-gray-600">Visualize destinations, hotels, and activities on an interactive map.</p>
            </div>
            {/* Feature 4 */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
              <svg className="w-10 h-10 text-yellow-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4" /><path d="M8 3v4" /></svg>
              <h4 className="font-semibold text-lg mb-2">Flight & Hotel Selection</h4>
              <p className="text-gray-600">Compare and select the best flights and hotels for your group.</p>
            </div>
            {/* Feature 5 */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
              <svg className="w-10 h-10 text-pink-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2" /><path d="M12 12v.01" /><path d="M12 16v.01" /></svg>
              <h4 className="font-semibold text-lg mb-2">Group Voting & Feedback</h4>
              <p className="text-gray-600">Collect feedback and votes from all group members for key decisions.</p>
            </div>
            {/* Feature 6 */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
              <svg className="w-10 h-10 text-indigo-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 0V4m0 16v-4" /></svg>
              <h4 className="font-semibold text-lg mb-2">Budget Optimization</h4>
              <p className="text-gray-600">Get suggestions that fit your group's budget.</p>
            </div>
            {/* Feature 7 */}
            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col items-center">
              <svg className="w-10 h-10 text-teal-500 mb-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 17v-2a4 4 0 014-4h6" /><path d="M9 7v2a4 4 0 004 4h6" /></svg>
              <h4 className="font-semibold text-lg mb-2">Easy Booking Integration</h4>
              <p className="text-gray-600">Seamlessly proceed to booking flights and hotels.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}