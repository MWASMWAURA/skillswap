import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, StarIcon, ClockIcon, MapPinIcon, ShareIcon, BookmarkIcon, FlagIcon, CheckIcon, CalendarIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Card } from '../components/ui/Card';
import { SkillVerification } from '../components/skills/SkillVerification';
import { apiClient } from '../lib/api';
interface SkillData {
  id: string;
  title: string;
  description: string;
  image?: string;
  teacher: {
    name: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    bio?: string;
  };
  level?: string;
  duration: string;
  location: string;
  isOnline: boolean;
  learningOutcomes?: string[];
  requirements?: string[];
  sessionFormat?: string[];
  verificationStatus?: string;
}
const reviews = [{
  id: '1',
  user: {
    name: 'Alex Johnson',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face'
  },
  rating: 5,
  date: '2 weeks ago',
  content: "Jane is an amazing teacher! She explains complex concepts in a way that's easy to understand. Highly recommend!"
}, {
  id: '2',
  user: {
    name: 'Maria Garcia',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'
  },
  rating: 5,
  date: '1 month ago',
  content: 'Great experience learning JavaScript. The hands-on projects really helped solidify my understanding.'
}, {
  id: '3',
  user: {
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face'
  },
  rating: 4,
  date: '1 month ago',
  content: 'Very patient and knowledgeable. Would definitely learn from Jane again.'
}];
export function SkillDetailPage() {
  const { id } = useParams();
  const [skillData, setSkillData] = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSkillData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getSkillWithVerification(id);
        if (response.data) {
          setSkillData({
            id: response.data.id.toString(),
            title: response.data.title,
            description: response.data.description,
            teacher: {
              name: response.data.user.name,
              avatar: response.data.user.profilePhoto,
              rating: response.data.user.reputation / 20, // Convert reputation to rating
              reviewCount: response.data.reviewCount,
              bio: 'Skill instructor'
            },
            level: response.data.difficulty || 'Intermediate',
            duration: `${response.data.duration} minutes`,
            location: response.data.mode === 'online' ? 'Online' : 'In-person',
            isOnline: response.data.mode === 'online',
            verificationStatus: response.data.verificationStatus
          });
        }
      } catch (error) {
        console.error('Failed to load skill data:', error);
        setError('Failed to load skill details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadSkillData();
    }
  }, [id]);
  const tabContent = [
    {
      id: 'overview',
      label: 'Overview',
      content: skillData ? (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Description
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {skillData.description}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              What You'll Learn
            </h3>
            <ul className="space-y-2">
              {(skillData.learningOutcomes || ['Skill development', 'Hands-on practice', 'Expert guidance']).map((outcome, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Requirements
            </h3>
            <ul className="space-y-2">
              {(skillData.requirements || ['Willingness to learn', 'Basic equipment']).map((req, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-gray-600">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Session Format
            </h3>
            <ul className="space-y-2">
              {(skillData.sessionFormat || ['1-on-1 instruction', 'Practical exercises']).map((format, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-gray-600">{format}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : <div>Loading...</div>
    },
    {
      id: 'verification',
      label: 'Verification',
      content: skillData ? (
        <SkillVerification
          skillId={skillData.id}
          skillTitle={skillData.title}
          currentStatus={skillData.verificationStatus || 'unverified'}
        />
      ) : <div>Loading...</div>
    },
    {
      id: 'reviews',
      label: `Reviews (${skillData?.teacher.reviewCount || 0})`,
      content: (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex items-start gap-4">
                <Avatar src={review.user.avatar} name={review.user.name} size="md" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {review.user.name}
                    </span>
                    <span className="text-sm text-gray-500">{review.date}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="text-gray-600">{review.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'availability',
      label: 'Availability',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            {skillData?.teacher.name} is typically available for sessions during the following times:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
              <div key={day} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{day}</span>
                <span className="text-gray-600">9:00 AM - 6:00 PM</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            * Actual availability may vary. Please send a request to check specific times.
          </p>
        </div>
      )
    }
  ];
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading skill details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !skillData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Skill not found'}</p>
          <Link to="/skills">
            <Button>Back to Skills</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/skills" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Skills
        </Link>
      </div>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Teacher Info */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="text-center lg:text-left">
                <Avatar src={skillData.teacher.avatar} name={skillData.teacher.name} size="xl" className="mx-auto lg:mx-0 mb-4" />
                <h3 className="font-semibold text-gray-900">
                  {skillData.teacher.name}
                </h3>
                <div className="flex items-center justify-center lg:justify-start gap-1 mt-1">
                  <StarIcon className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-medium">
                    {skillData.teacher.rating}
                  </span>
                  <span className="text-gray-500">
                    • {skillData.teacher.reviewCount} reviews
                  </span>
                </div>
                <div className="flex justify-center lg:justify-start gap-2 mt-4">
                  <Button variant="secondary" size="sm">
                    Message
                  </Button>
                  <Button variant="ghost" size="sm">
                    Follow
                  </Button>
                </div>
              </div>
            </div>

            {/* Skill Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {skillData.title}
              </h1>
              <p className="text-gray-600 mb-4">by {skillData.teacher.name}</p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                <Badge variant="blue">{skillData.level}</Badge>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {skillData.duration}
                </span>
                <span className="flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  {skillData.location}
                </span>
                {skillData.verificationStatus === 'verified' && (
                  <Badge variant="green" className="flex items-center gap-1">
                    <CheckIcon className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg">
                  <CalendarIcon className="w-5 h-5 mr-2" />
                  Request Exchange
                </Button>
                <Button variant="secondary" size="lg">
                  <BookmarkIcon className="w-5 h-5 mr-2" />
                  Save
                </Button>
                <Button variant="ghost" size="lg">
                  <ShareIcon className="w-5 h-5 mr-2" />
                  Share
                </Button>
                <Button variant="ghost" size="lg">
                  <FlagIcon className="w-5 h-5 mr-2" />
                  Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card padding="lg">
          <Tabs tabs={tabContent} />
        </Card>
      </div>
    </div>
  );
}