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
    <div className="space-y-6 pb-10 text-[#212121]">
      {/* Editorial Header */}
      <div className="border-b-2 border-dashed border-[#212121] pb-3">
        <div className="flex items-center space-x-2 text-[11px] font-sketch uppercase tracking-widest text-stone-700 mb-1 font-bold">
          <Users className="w-4 h-4" />
          <span>CAMPUS DIRECTORY &bull; ISU CAUAYAN</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-[900] uppercase font-newspaper-title text-[#212121]">
          Student Project Directory
        </h1>
        <p className="text-xs sm:text-sm font-serif-body text-stone-700 mt-0.5">
          Explore student portfolios, capstone repositories, and course assignments from Isabela State University - Cauayan Campus.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3.5 bg-[#FAF6EC] paper-card flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="explore-search-input"
            type="text"
            placeholder="Search by name, @username, project title, or technology..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 paper-input text-xs font-mono text-[#212121] placeholder:text-stone-500"
          />
        </div>

        {programs.length > 0 && (
          <select
            id="explore-program-filter"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 paper-input text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold"
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
        <div className="text-center py-16 paper-card bg-[#FEFCF6]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
          <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 mt-2 font-bold">Loading campus roster...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 px-4 paper-card bg-[#FEFCF6] space-y-2 border-dashed">
          <p className="text-base font-[900] uppercase font-newspaper-title text-[#212121]">No student records found</p>
          <p className="text-xs sm:text-sm font-serif-body text-stone-600">Try adjusting your query or selecting another degree program.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map(({ profile, projects }) => {
            return (
              <div
                key={profile.id}
                className="paper-card bg-[#FEFCF6] p-4 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Student Avatar & Basic Info */}
                  <div className="flex items-center space-x-3 pb-3 border-b-2 border-dashed border-[#212121]">
                    <div className="w-12 h-12 border-2 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs shadow-[2px_2px_0px_#212121]">
                      <img
                        src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                        alt={profile.github_username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#212121] truncate">
                        {profile.full_name || profile.github_username}
                      </h3>
                      <p className="text-xs text-stone-700 font-mono truncate">
                        @{profile.github_username}
                      </p>
                      {profile.headline && (
                        <p className="text-[11px] font-sketch uppercase tracking-wider text-stone-800 truncate font-bold">
                          {profile.headline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Program & Year Badge */}
                  <div className="flex items-center space-x-1.5 text-[10px] font-headline uppercase tracking-wider text-stone-800 flex-wrap gap-y-1">
                    <span className="paper-badge font-bold">
                      {profile.program || 'Student'}
                    </span>
                    {profile.year_level && (
                      <span className="paper-badge bg-stone-200 font-mono font-bold">
                        {profile.year_level}
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-xs sm:text-sm font-serif-body text-stone-700 line-clamp-2 leading-relaxed italic bg-[#FAF6EC] p-2 border border-[#212121] rounded-xs">
                      "{profile.bio}"
                    </p>
                  )}

                  {/* Showcased Project Highlights */}
                  <div className="pt-2 space-y-2 border-t-2 border-dashed border-[#212121]">
                    <div className="flex items-center justify-between text-[10px] text-stone-700 font-sketch uppercase tracking-wider font-bold">
                      <span>RECENT DISPATCHES</span>
                      <span>{projects.length} REPOS</span>
                    </div>

                    <div className="space-y-1.5">
                      {projects.slice(0, 2).map((proj) => (
                        <div
                          key={proj.id}
                          className="px-2 py-1 bg-[#FAF6EC] border border-[#212121] text-xs flex items-center justify-between font-serif-body"
                        >
                          <span className="text-[#212121] truncate max-w-[170px] text-xs font-bold">
                            {proj.custom_title || proj.repo_full_name.split('/')[1]}
                          </span>
                          {proj.is_featured && (
                            <span className="paper-badge text-[9px] font-mono py-0 px-1 bg-amber-200 text-amber-900 border-amber-800 flex items-center">
                              <Star className="w-2.5 h-2.5 fill-amber-900 text-amber-900 mr-0.5" />
                              LEAD
                            </span>
                          )}
                        </div>
                      ))}
                      {projects.length > 2 && (
                        <p className="text-[10px] font-sketch text-stone-600 text-right pr-1 font-bold">
                          +{projects.length - 2} additional repos
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Showcase Button */}
                <button
                  onClick={() => navigate(`/u/${profile.github_username}`)}
                  className="w-full mt-2 paper-button paper-button-dark text-xs py-1.5 font-bold"
                >
                  <span>View Student Portfolio</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

