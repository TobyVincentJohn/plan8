'use client';

import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-5xl px-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl nav-shadow px-8 py-5">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <img src="/logo_blue.png" alt="a2b.ai logo" className="h-12 w-auto" />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg">
              About Us
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg">
              Pricing
            </a>
            <a href="#help" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-lg">
              Help
            </a>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            <Link href="/auth">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-semibold transition-all duration-200 hover:scale-105 text-lg">
                Start Planning
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}