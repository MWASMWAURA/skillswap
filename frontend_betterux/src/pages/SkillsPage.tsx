import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SearchIcon, FilterIcon, MapIcon, GridIcon, ListIcon, XIcon, CheckCircleIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { SkillCard } from '../components/skills/SkillCard';
import { useSkills } from '../lib/hooks';
import { Skill as ApiSkill } from '../lib/api';

const categories = ['All Categories', 'Technology', 'Creative Arts', 'Languages', 'Business & Finance', 'Health & Fitness', 'Cooking & Food', 'Music', 'Sports & Recreation', 'Academic', 'Life Skills'];
const levels = ['Any Level', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'];
export function SkillsPage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedLevel, setSelectedLevel] = useState('Any Level');
  const [activeFilters, setActiveFilters] = useState<string[]>(['Online', 'Beginner Friendly']);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('Relevance');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Prepare filters for API call
  const apiFilters = useMemo(() => {
    const filters: any = {};
    
    if (selectedCategory !== 'All Categories') {
      // Map category names to category IDs
      const categoryMap: { [key: string]: string } = {
        'Technology': '1',
        'Creative Arts': '2',
        'Languages': '3',
        'Business & Finance': '4',
        'Health & Fitness': '5',
        'Cooking & Food': '6',
        'Music': '7',
        'Sports & Recreation': '8',
        'Academic': '9',
        'Life Skills': '10'
      };
      filters.category = categoryMap[selectedCategory] || '1';
    }
    if (selectedLevel !== 'Any Level') {
      filters.level = selectedLevel;
    }
    if (activeFilters.includes('Online')) {
      filters.mode = 'online';
    }
    if (searchQuery) {
      filters.search = searchQuery;
    }
    
    return filters;
  }, [selectedCategory, selectedLevel, activeFilters, searchQuery]);

  const { data: skills, loading, error, refetch } = useSkills(apiFilters);
  
  // Check if user just created a skill
  useEffect(() => {
    if (location.state?.skillCreated) {
      setShowSuccess(true);
      // Refresh skills list
      refetch();
      // Hide success message after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, refetch]);

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filter));
  };
  const clearAllFilters = () => {
    setActiveFilters([]);
    setSelectedCategory('All Categories');
    setSelectedLevel('Any Level');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading skills: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }
  return <div className="min-h-screen bg-gray-50">
      {/* Success Notification */}
      {showSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Skill published successfully! It's now visible to the community.
              </span>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="text-green-600 hover:text-green-800"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Skills</h1>
            <p className="text-gray-600">
              Discover skills you want to learn from our community
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm">
              <FilterIcon className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="secondary" size="sm">
              <MapIcon className="w-4 h-4 mr-2" />
              Map View
            </Button>
          </div>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search skills, teachers, or keywords..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          {/* Category Filter */}
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {categories.map(cat => <option key={cat} value={cat}>
                {cat}
              </option>)}
          </select>

          {/* Level Filter */}
          <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {levels.map(level => <option key={level} value={level}>
                {level}
              </option>)}
          </select>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-gray-500">Active Filters:</span>
            {activeFilters.map(filter => <Badge key={filter} variant="blue" className="flex items-center gap-1">
                {filter}
                <button onClick={() => removeFilter(filter)} className="ml-1 hover:text-blue-900">
                  <XIcon className="w-3 h-3" />
                </button>
              </Badge>)}
            <button onClick={clearAllFilters} className="text-sm text-gray-500 hover:text-gray-700 ml-2">
              Clear All
            </button>
          </div>}
      </div>

      {/* Results Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <strong>{skills?.length || 0}</strong> skills available
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-sm border-none bg-transparent font-medium text-gray-700 focus:outline-none cursor-pointer">
              <option>Relevance</option>
              <option>Rating</option>
              <option>Newest</option>
              <option>Most Popular</option>
            </select>
          </div>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <GridIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="px-6 pb-8">
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {(skills || []).map((skill: ApiSkill) => <SkillCard key={skill.id} skill={skill} />)}
        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <Button variant="secondary" size="lg">
            Load More Skills
          </Button>
        </div>
      </div>
    </div>;
}