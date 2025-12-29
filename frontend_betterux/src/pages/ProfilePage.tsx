import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon, CalendarIcon, EditIcon, SettingsIcon, MessageSquareIcon, UserPlusIcon, TrophyIcon, TargetIcon, StarIcon } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Card } from '../components/ui/Card';
import { ImageUpload } from '../components/upload/ImageUpload';
import { SkillVerification } from '../components/skills/SkillVerification';
import { useAuth } from '../lib/authContext';
import { useNotificationStore } from '../store';
import { useFileUpload } from '../services/upload';
interface ProfileData {
  name: string;
  avatar: string;
  level: number;
  xp: number;
  location: string;
  memberSince: string;
  bio: string;
  interests: string[];
  learningGoals: string[];
  achievements: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  skills: Array<{
    id: string;
    name: string;
    level: string;
    students: number;
    verificationStatus: 'verified' | 'pending' | 'rejected' | 'unverified';
  }>;
  exchanges: Array<{
    skill: string;
    partner: string;
    status: string;
    role: string;
  }>;
  reviews: Array<{
    from: string;
    avatar: string;
    rating: number;
    content: string;
    date: string;
  }>;
}

// Helper function to get first name from full name
const getFirstName = (fullName: string): string => {
  return fullName.split(' ')[0] || fullName;
};

// Create initial profile data based on logged-in user
const createInitialProfileData = (user: any): ProfileData => ({
  name: user?.name || 'User',
  avatar: user?.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3b82f6&color=fff&size=200`,
  level: user?.level || 1,
  xp: 1250, // Mock XP for now
  location: user?.location || 'Not specified',
  memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently',
  bio: user?.bio || 'Passionate learner and aspiring full-stack developer. I love exploring new technologies and sharing knowledge with others.',
  interests: ['JavaScript', 'React', 'TypeScript', 'UI/UX Design', 'Photography', 'Guitar'],
  learningGoals: ['Master React development', 'Improve public speaking skills', 'Learn guitar basics', 'Understand machine learning fundamentals'],
  achievements: [{
    icon: '🏆',
    title: 'First Exchange Complete',
    description: 'Completed your first skill exchange'
  }, {
    icon: '🎯',
    title: '5-Day Learning Streak',
    description: 'Learned for 5 consecutive days'
  }, {
    icon: '⭐',
    title: 'Community Helper',
    description: 'Helped 10+ community members'
  }, {
    icon: '📚',
    title: 'Quick Learner',
    description: 'Completed 3 skills in one month'
  }],
  skills: [{
    id: '1',
    name: 'JavaScript',
    level: 'Advanced',
    students: 12,
    verificationStatus: 'verified'
  }, {
    id: '2',
    name: 'React',
    level: 'Intermediate',
    students: 8,
    verificationStatus: 'pending'
  }, {
    id: '3',
    name: 'UI Design',
    level: 'Intermediate',
    students: 5,
    verificationStatus: 'unverified'
  }],
  exchanges: [{
    skill: 'JavaScript Fundamentals',
    partner: 'Jane Smith',
    status: 'Active',
    role: 'Learner'
  }, {
    skill: 'Guitar Lessons',
    partner: 'Mike Chen',
    status: 'Scheduled',
    role: 'Learner'
  }, {
    skill: 'React Basics',
    partner: 'Alex Johnson',
    status: 'Completed',
    role: 'Teacher'
  }],
  reviews: [{
    from: 'Alex Johnson',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    content: `${getFirstName(user?.name || 'User')} is a fantastic teacher! Very patient and explains concepts clearly.`,
    date: '2 weeks ago'
  }, {
    from: 'Maria Garcia',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    content: 'Great learning experience. Really knows their stuff!',
    date: '1 month ago'
  }]
});
export function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>(() => 
    createInitialProfileData(user)
  );
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedSkillForVerification, setSelectedSkillForVerification] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const { addNotification } = useNotificationStore();
  const { uploadProfilePhoto, uploadMultipleFiles } = useFileUpload();

  // Update profile data when user changes
  React.useEffect(() => {
    if (user) {
      setProfileData(createInitialProfileData(user));
    }
  }, [user]);

  // Handle profile photo upload
  const handlePhotoUpload = useCallback(async (imageUrl: string) => {
    if (imageUrl === '') {
      // Handle image clearing
      setProfileData(prev => ({ ...prev, avatar:'https://ui-avatars.com/api/?name=' + encodeURIComponent(prev.name)  })); // Default placeholder
      addNotification({
        type: 'system',
        title: 'Photo Removed',
        message: 'Your profile photo has been removed'
      });
    } else {
      // Handle image upload
      setProfileData(prev => ({ ...prev, avatar: imageUrl }));
      addNotification({
        type: 'system',
        title: 'Photo Updated',
        message: 'Your profile photo has been updated successfully'
      });
    }
    setShowImageUpload(false);
  }, [addNotification]);

  const handlePhotoUploadError = useCallback((error: string) => {
    addNotification({
      type: 'system',
      title: 'Upload Failed',
      message: error
    });
  }, [addNotification]);

  // Handle skill verification
  const handleSkillVerification = useCallback(async (files: File[], type: string) => {
    if (!selectedSkillForVerification) return;

    try {
      const result = await uploadMultipleFiles(files);
      if (result.success) {
        // Update skill verification status
        setProfileData(prev => ({
          ...prev,
          skills: prev.skills.map(skill => 
            skill.id === selectedSkillForVerification 
              ? { ...skill, verificationStatus: 'pending' }
              : skill
          )
        }));
        
        addNotification({
          type: 'system',
          title: 'Documents Submitted',
          message: 'Your verification documents have been submitted for review'
        });
      }
    } catch (error) {
      addNotification({
        type: 'system',
        title: 'Upload Failed',
        message: 'Failed to upload verification documents'
      });
    }
    
    setSelectedSkillForVerification(null);
  }, [selectedSkillForVerification, uploadMultipleFiles, addNotification]);

  const tabContent = [{
    id: 'about',
    label: 'About',
    content: <div className="space-y-8">
          {/* Bio */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              About Me
            </h3>
            <p className="text-gray-600 leading-relaxed">{profileData.bio}</p>
          </div>

          {/* Interests */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {profileData.interests.map(interest => <Badge key={interest} variant="blue">
                  {interest}
                </Badge>)}
            </div>
          </div>

          {/* Learning Goals */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Learning Goals
            </h3>
            <ul className="space-y-2">
              {profileData.learningGoals.map((goal, index) => <li key={index} className="flex items-center gap-3">
                  <TargetIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-600">{goal}</span>
                </li>)}
            </ul>
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Achievements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileData.achievements.map((achievement, index) => <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <span className="text-3xl">{achievement.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">
                      {achievement.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {achievement.description}
                    </p>
                  </div>
                </div>)}
            </div>
          </div>
        </div>
  }, {
    id: 'skills',
    label: 'Skills',
    content: <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Skills I Teach
            </h3>
            <Button size="sm">Add New Skill</Button>
          </div>
          
          {profileData.skills.map((skill) => <div key={skill.id} className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{skill.name}</h4>
                      <Badge 
                        variant={skill.verificationStatus === 'verified' ? 'green' : 
                               skill.verificationStatus === 'pending' ? 'blue' : 
                               skill.verificationStatus === 'rejected' ? 'red' : 'gray'}
                      >
                        {skill.verificationStatus === 'verified' ? '✓ Verified' :
                         skill.verificationStatus === 'pending' ? '⏳ Pending' :
                         skill.verificationStatus === 'rejected' ? '✗ Rejected' : 'Unverified'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {skill.level} • {skill.students} students taught
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => setSelectedSkillForVerification(skill.id)}
                    disabled={skill.verificationStatus === 'verified'}
                  >
                    {skill.verificationStatus === 'verified' ? 'Verified' : 'Verify Skill'}
                  </Button>
                </div>
              </Card>
              
              {selectedSkillForVerification === skill.id && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <SkillVerification
                    skillId={skill.id}
                    skillTitle={skill.name}
                    currentStatus={skill.verificationStatus}
                    documents={[]}
                    onSubmitVerification={handleSkillVerification}
                    onStatusChange={(status) => {
                      setProfileData(prev => ({
                        ...prev,
                        skills: prev.skills.map(s => 
                          s.id === skill.id ? { ...s, verificationStatus: status as any } : s
                        )
                      }));
                    }}
                  />
                </Card>
              )}
            </div>)}
        </div>
  }, {
    id: 'exchanges',
    label: 'Exchanges',
    content: <div className="space-y-4">
          {profileData.exchanges.map((exchange, index) => <Card key={index} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{exchange.skill}</h4>
                <p className="text-sm text-gray-500">
                  with {exchange.partner} • {exchange.role}
                </p>
              </div>
              <Badge variant={exchange.status === 'Active' ? 'green' : exchange.status === 'Scheduled' ? 'blue' : 'gray'}>
                {exchange.status}
              </Badge>
            </Card>)}
        </div>
  }, {
    id: 'reviews',
    label: 'Reviews',
    content: <div className="space-y-6">
          {profileData.reviews.map((review, index) => <div key={index} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex items-start gap-4">
                <Avatar src={review.avatar} name={review.from} size="md" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {review.from}
                    </span>
                    <span className="text-sm text-gray-500">{review.date}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />)}
                  </div>
                  <p className="text-gray-600">{review.content}</p>
                </div>
              </div>
            </div>)}
        </div>
  }, {
    id: 'calendar',
    label: 'Calendar',
    content: <div className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Calendar view coming soon</p>
          <Link to="/calendar">
            <Button variant="secondary" className="mt-4">
              View Full Calendar
            </Button>
          </Link>
        </div>
  }];
  return <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="relative group cursor-pointer" onClick={() => setShowImageUpload(true)}>
              <Avatar 
                src={profileData.avatar} 
                name={profileData.name} 
                size="xl" 
                className="w-32 h-32 transition-transform duration-200 group-hover:scale-105" 
              />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="text-white text-center">
                  <EditIcon className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-sm font-medium">Edit Photo</span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left w-full">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {getFirstName(profileData.name)}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                  >
                    <EditIcon className="w-4 h-4 mr-1" />
                    Edit Profile
                  </Button>
                  <Button variant="ghost" size="sm">
                    <SettingsIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <TrophyIcon className="w-5 h-5 text-amber-500" />
                <span className="font-medium">
                  Level {profileData.level} Learner
                </span>
                <span className="text-gray-500">• {profileData.xp} XP</span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  {profileData.location}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-4 h-4" />
                  Member since {profileData.memberSince}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 mt-4">
                <Button className="w-full sm:w-auto">
                  <MessageSquareIcon className="w-4 h-4 mr-2" />
                  Message
                </Button>
                <Button variant="secondary" className="w-full sm:w-auto">
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  Request Exchange
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Card padding="lg">
          <Tabs tabs={tabContent} />
        </Card>
      </div>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Update Profile Photo</h2>
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
            
              {/* Upload Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Choose Upload Method</h3>
                
                <ImageUpload
                  onImageUpload={handlePhotoUpload}
                  onError={handlePhotoUploadError}
                  currentImage={profileData.avatar}
                  title=""
                  description=""
                  showCamera={true}
                  showFileUpload={true}
                  aspectRatio="square"
                  maxSize={5 * 1024 * 1024} // 5MB
                  allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
                  className="border border-gray-200 rounded-lg p-4"
                />
              </div>
              
              
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      addNotification({
                        type: 'system',
                        title: 'Profile Updated',
                        message: 'Your profile has been updated successfully'
                      });
                      setShowEditModal(false);
                    }}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>;
}