import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, ClockIcon, MapPinIcon, BookmarkIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skill as ApiSkill } from '../../lib/api';

interface SkillCardProps {
  skill: ApiSkill;
}

export function SkillCard({ skill }: SkillCardProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop';
  
  // Transform backend data to frontend format
  const isOnline = skill.mode === 'online';
  const displayDuration = `${skill.duration} min`;
  const categoryMap: { [key: number]: string } = {
    1: 'Programming',
    2: 'Art', 
    3: 'Culinary',
    4: 'Music',
    5: 'Language',
    6: 'Business',
    7: 'Health',
    8: 'Sports',
    9: 'Academic',
    10: 'Life Skills'
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={defaultImage} 
          alt={skill.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
        />
        <Badge variant={isOnline ? 'green' : 'amber'} className="absolute top-3 right-3">
          {skill.mode === 'online' ? 'Online' : skill.mode === 'in-person' ? 'In-person' : 'Hybrid'}
        </Badge>
        <button className="absolute top-3 left-3 p-2 bg-white/90 rounded-full text-gray-600 hover:text-blue-500 hover:bg-white transition-colors" aria-label="Save skill">
          <BookmarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Teacher Info */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={skill.user.profilePhoto || ''} name={skill.user.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {skill.user.name}
            </p>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <StarIcon className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{skill.user.reputation}</span>
              <span>Level {skill.user.level}</span>
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <Link to={`/skills/${skill.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
            {skill.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {skill.description}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <Badge variant="gray">{categoryMap[skill.categoryId] || 'Other'}</Badge>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              {displayDuration}
            </span>
            {!isOnline && skill.user.location && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="w-4 h-4" />
                {skill.user.location}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span>{skill._count?.exchanges || 0} exchanges</span>
          <span>{skill.viewCount || 0} views</span>
        </div>

        {/* CTA */}
        <Button fullWidth>Request Exchange</Button>
      </div>
    </div>
  );
}