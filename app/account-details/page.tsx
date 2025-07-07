'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plane, ArrowLeft, User, Mail, Phone, MapPin, Calendar, Save, Edit3, Upload } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface UserProfile {
  user_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  profile_picture?: string;
  date_of_birth: string;
  mobile_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  country: string;
  post_code: string;
  email: string;
}

export default function AccountDetailsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth';
          return;
        }

        // Load profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
          setError('Failed to load profile data');
          return;
        }

        setProfile({
          ...profileData,
          email: user.email || ''
        });
      } catch (err) {
        console.error('Error:', err);
        setError('An error occurred while loading your profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile data (excluding email and date_of_birth)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          middle_name: profile.middle_name,
          last_name: profile.last_name,
          profile_picture: profile.profile_picture,
          mobile_number: profile.mobile_number,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          post_code: profile.post_code
        })
        .eq('user_id', user.id);

      if (profileError) {
        throw new Error('Failed to update profile: ' + profileError.message);
      }

      // Update email if changed
      if (profile.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email
        });

        if (emailError) {
          throw new Error('Failed to update email: ' + emailError.message);
        }
      }

      setSuccess('Profile updated successfully!');
      setEditingField(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Make it square by using the smaller dimension
          const size = Math.min(img.width, img.height);
          canvas.width = 300;
          canvas.height = 300;
          
          // Calculate crop position to center the image
          const cropX = (img.width - size) / 2;
          const cropY = (img.height - size) / 2;
          
          ctx?.drawImage(img, cropX, cropY, size, size, 0, 0, 300, 300);
          
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          if (profile) {
            setProfile({ ...profile, profile_picture: croppedDataUrl });
          }
          setUploadingImage(false);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process image');
      setUploadingImage(false);
    }
  };

  const handleFieldChange = (field: keyof UserProfile, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load profile data</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Navigation */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl px-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl nav-shadow px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">a2b.ai</span>
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Details</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Profile Picture and Basic Info */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            
            <div className="flex items-center space-x-6 mb-8">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center group">
                {profile.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_1280.png"
                    alt="Default Profile"
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Upload overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <label className="cursor-pointer">
                    <Upload className="w-6 h-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {profile.first_name} {profile.middle_name} {profile.last_name}
                </h3>
                <p className="text-gray-600">{profile.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.first_name}
                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                    disabled={editingField !== 'first_name'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'first_name' ? null : 'first_name')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.last_name}
                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    disabled={editingField !== 'last_name'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'last_name' ? null : 'last_name')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    disabled={editingField !== 'email'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'email' ? null : 'email')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="tel"
                    value={profile.mobile_number}
                    onChange={(e) => handleFieldChange('mobile_number', e.target.value)}
                    disabled={editingField !== 'mobile_number'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'mobile_number' ? null : 'mobile_number')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Date of Birth (Read-only) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <Input
                  value={formatDate(profile.date_of_birth)}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Date of birth cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Address Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address Line 1 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.address_line1}
                    onChange={(e) => handleFieldChange('address_line1', e.target.value)}
                    disabled={editingField !== 'address_line1'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'address_line1' ? null : 'address_line1')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2 (Optional)</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.address_line2 || ''}
                    onChange={(e) => handleFieldChange('address_line2', e.target.value)}
                    disabled={editingField !== 'address_line2'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'address_line2' ? null : 'address_line2')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    disabled={editingField !== 'city'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'city' ? null : 'city')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    disabled={editingField !== 'state'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'state' ? null : 'state')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.country}
                    onChange={(e) => handleFieldChange('country', e.target.value)}
                    disabled={editingField !== 'country'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'country' ? null : 'country')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal/ZIP Code</label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={profile.post_code}
                    onChange={(e) => handleFieldChange('post_code', e.target.value)}
                    disabled={editingField !== 'post_code'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingField(editingField === 'post_code' ? null : 'post_code')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving || !editingField}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold"
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}