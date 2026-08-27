import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, Github, ArrowRight, ExternalLink, RefreshCw, Bookmark, Star, Users } from 'lucide-react';
import { StudentShowcaseData } from '../types';
import { getAllStudentsShowcase } from '../lib/showcaseStore';

interface ExploreViewProps {
  navigate: (route: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ navigate }) => {
  const [students, setStudents] = useState<StudentShowcaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');

  useEffect(() => {
    loadAllStudents();
  }, []);

  const loadAllStudents = async () => {
    setLoading(true);
    try {
      const data = await getAllStudentsShowcase();
      setStudents(data);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const programs = Array.from(
    new Set(students.map(s => s.profile.program).filter(Boolean))
  ) as string[];

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.profile.github_username.toLowerCase().includes(q) ||
      (s.profile.full_name && s.profile.full_name.toLowerCase().includes(q)) ||
      (s.profile.headline && s.profile.headline.toLowerCase().includes(q)) ||
      (s.profile.bio && s.profile.bio.toLowerCase().includes(q)) ||
      s.projects.some(p => 
        p.repo_full_name.toLowerCase().includes(q) ||
        (p.custom_title && p.custom_title.toLowerCase().includes(q))
      );

    const matchesProgram =
      filterProgram === 'all' || s.profile.program === filterProgram;

    return matchesQuery && matchesProgram;
  });

  return (
    <div className="space-y-6 pb-12 text-[#1A1815]">
      {/* Editorial Header */}
      <div className="border-b border-[#1A1815] pb-3">
        <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-stone-600 mb-1">
          <Users className="w-3.5 h-3.5" />
          <span>CAMPUS DIRECTORY &bull; ISU CAUAYAN</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#1A1815]">
          Student Project Directory
        </h1>
        <p className="text-xs sm:text-sm font-serif-body text-stone-700 mt-0.5">
          Explore student portfolios, capstone repositories, and course assignments from Isabela State University - Cauayan Campus.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 bg-[#F4F0E6] border border-[#1A1815] flex flex-col sm:flex-row gap-2.5 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="explore-search-input"
            type="text"
            placeholder="Search by name, @username, project title, or technology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-[#1A1815] bg-[#FAF8F2] text-xs font-mono text-[#1A1815] focus:outline-none placeholder:text-stone-500"
          />
        </div>

        {programs.length > 0 && (
          <select
            id="explore-program-filter"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 border border-[#1A1815] bg-[#FAF8F2] text-xs font-headline uppercase tracking-wider text-[#1A1815] focus:outline-none cursor-pointer"
          >
            <option value="all">ALL DEGREES &bull; ALL STUDENTS</option>
            {programs.map(prog => (
              <option key={prog} value={prog}>{prog.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div className="text-center py-16 border border-[#1A1815] bg-[#FAF8F2]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
          <p className="text-xs font-mono uppercase tracking-wider text-stone-700 mt-2">Loading campus roster...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed border-[#1A1815] bg-[#FAF8F2] space-y-2">
          <p className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">No student records found</p>
          <p className="text-xs font-serif-body text-stone-600">Try adjusting your query or selecting another degree program.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map(({ profile, projects }) => {
            return (
              <div
                key={profile.id}
                className="bg-[#FAF8F2] border border-[#1A1815] p-4 flex flex-col justify-between space-y-4 hover:border-black transition-all"
              >
                <div className="space-y-3">
                  {/* Student Avatar & Basic Info */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#D6D0C4]">
                    <div className="w-12 h-12 border border-[#1A1815] overflow-hidden bg-stone-300 flex-shrink-0">
                      <img
                        src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                        alt={profile.github_username}
                        className="w-full h-full object-cover news-photo"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815] truncate">
                        {profile.full_name || profile.github_username}
                      </h3>
                      <p className="text-xs text-stone-600 font-mono truncate">
                        @{profile.github_username}
                      </p>
                      {profile.headline && (
                        <p className="text-[11px] font-headline uppercase tracking-wider text-stone-700 truncate font-semibold">
                          {profile.headline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Program & Year Badge */}
                  <div className="flex items-center space-x-1.5 text-[10px] font-headline uppercase tracking-wider text-stone-800 flex-wrap gap-y-1">
                    <span className="bg-[#EBE7DC] border border-stone-400 px-1.5 py-0.5">
                      {profile.program || 'Student'}
                    </span>
                    {profile.year_level && (
                      <span className="bg-stone-200 border border-stone-400 px-1.5 py-0.5 font-mono">
                        {profile.year_level}
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-xs font-serif-body text-stone-700 line-clamp-2 leading-relaxed italic bg-[#F4F0E6] p-2 border border-stone-300">
                      "{profile.bio}"
                    </p>
                  )}

                  {/* Showcased Project Highlights */}
                  <div className="pt-2 space-y-2 border-t border-[#D6D0C4]">
                    <div className="flex items-center justify-between text-[10px] text-stone-600 font-mono uppercase tracking-wider">
                      <span>RECENT DISPATCHES</span>
                      <span>{projects.length} REPOS</span>
                    </div>

                    <div className="space-y-1.5">
                      {projects.slice(0, 2).map((proj) => (
                        <div
                          key={proj.id}
                          className="px-2 py-1 bg-[#F4F0E6] border border-stone-300 text-xs flex items-center justify-between font-serif-headline"
                        >
                          <span className="text-[#1A1815] truncate max-w-[170px] text-[11px] font-bold">
                            {proj.custom_title || proj.repo_full_name.split('/')[1]}
                          </span>
                          {proj.is_featured && (
                            <span className="text-[9px] font-mono uppercase text-stone-800 bg-stone-300 border border-stone-400 px-1 flex items-center">
                              <Star className="w-2 h-2 fill-stone-800 text-stone-800 mr-0.5" />
                              LEAD
                            </span>
                          )}
                        </div>
                      ))}
                      {projects.length > 2 && (
                        <p className="text-[10px] font-mono text-stone-600 text-right pr-1">
                          +{projects.length - 2} additional repos
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Showcase Button */}
                <button
                  onClick={() => navigate(`/u/${profile.github_username}`)}
                  className="w-full mt-2 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all cursor-pointer"
                >
                  <span>View Student Portfolio</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

