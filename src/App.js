// src/App.js - Enhanced version with new features
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import './App.css';

function App() {
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalMovie, setModalMovie] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [theme, setTheme] = useState('dark');
  const [currentPage, setCurrentPage] = useState(1);
  const [suggestions, setSuggestions] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  
  // New state variables for enhanced features
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [watchlist, setWatchlist] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    yearFrom: 1900,
    yearTo: new Date().getFullYear(),
    ratingFrom: 0,
    genres: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'year', 'rating'

  const moviesPerPage = 6;
  const filterRef = useRef(null);

  // Load saved data from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme');
    const savedWatchlist = localStorage.getItem('watchlist');
    const savedFavorites = localStorage.getItem('favorites');
    const savedRecentSearches = localStorage.getItem('recent-searches');
    const savedViewMode = localStorage.getItem('view-mode');

    if (savedTheme) setTheme(savedTheme);
    if (savedWatchlist) setWatchlist(JSON.parse(savedWatchlist));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecentSearches) setRecentSearches(JSON.parse(savedRecentSearches));
    if (savedViewMode) setViewMode(savedViewMode);
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('recent-searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    localStorage.setItem('view-mode', viewMode);
  }, [viewMode]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchMovieDetails = async (imdbID) => {
    try {
      const response = await axios.get(`https://www.omdbapi.com/?i=${imdbID}&apikey=4debe82e&plot=full`);
      return response.data && response.data.Response === 'True' ? response.data : null;
    } catch (error) {
      console.error('Error fetching movie details:', error);
      return null;
    }
  };

  const fetchMovies = async (searchTerm, page = 1, append = false) => {
    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm.length < 2) {
      setMovies([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(`https://www.omdbapi.com/?s=${trimmedSearchTerm}&page=${page}&apikey=4debe82e`);
      if (response.data.Search) {
        const detailedMovies = await Promise.all(
          response.data.Search.map(async (movie) => {
            const details = await fetchMovieDetails(movie.imdbID);
            const fallback = {
              Genre: 'Unknown',
              imdbRating: 'N/A',
              Plot: 'No plot available.',
              Director: 'Unknown',
              Actors: 'Unknown',
              Runtime: 'N/A',
              Language: 'Unknown',
              Released: 'Unknown',
            };
            return {
              ...movie,
              ...(details ? {
                Genre: details.Genre || fallback.Genre,
                imdbRating: details.imdbRating || fallback.imdbRating,
                Plot: details.Plot || fallback.Plot,
                Director: details.Director || fallback.Director,
                Actors: details.Actors || fallback.Actors,
                Runtime: details.Runtime || fallback.Runtime,
                Language: details.Language || fallback.Language,
                Released: details.Released || fallback.Released,
              } : fallback)
            };
          })
        );

        // Deduplication
        setMovies(prev => {
          const newMovies = append ? [...prev, ...detailedMovies] : detailedMovies;
          const uniqueMoviesMap = new Map();
          newMovies.forEach(movie => {
            uniqueMoviesMap.set(movie.imdbID, movie);
          });
          return Array.from(uniqueMoviesMap.values());
        });

        if (!append) {
          setSelectedGenre('All');
          setCurrentPage(1);
        }
        setHasMore(response.data.Search.length >= 10);
        
        // Add to recent searches
        if (!append && !recentSearches.includes(trimmedSearchTerm)) {
          setRecentSearches(prev => {
            const updated = [trimmedSearchTerm, ...prev.slice(0, 4)];
            return updated;
          });
        }
      } else {
        if (!append) setMovies([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
      if (!append) setMovies([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = async (input) => {
    const trimmedInput = input.trim();
    if (trimmedInput.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(`https://www.omdbapi.com/?s=${trimmedInput}&apikey=4debe82e`);
      if (response.data.Search) {
        const titles = response.data.Search.map(movie => movie.Title);
        const uniqueTitles = [...new Set(titles)];
        setSuggestions(uniqueTitles.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    fetchSuggestions(value);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    fetchMovies(suggestion);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSuggestions([]);
    fetchMovies(query);
  };

  const handleClearSearch = () => {
    setQuery('');
    setMovies([]);
    setSuggestions([]);
    setSelectedGenre('All');
    setHasMore(true);
  };

  const getUniqueGenres = () => {
    const allGenres = movies.flatMap(movie =>
      movie.Genre ? movie.Genre.split(',').map(g => g.trim()) : []
    );
    const uniqueGenres = [...new Set(allGenres)];
    return uniqueGenres.filter(genre => genre && genre.toLowerCase() !== 'unknown');
  };

  // Enhanced filter function
  const applyFilters = (movie) => {
    // Genre filter
    if (selectedGenre !== 'All' && 
      !(movie.Genre && movie.Genre.split(',').map(g => g.trim()).includes(selectedGenre))) {
      return false;
    }
    
    // Year filter
    const year = parseInt(movie.Year);
    if (isNaN(year) || year < filterOptions.yearFrom || year > filterOptions.yearTo) {
      return false;
    }

    // Rating filter
    const rating = parseFloat(movie.imdbRating);
    if (isNaN(rating) || rating < filterOptions.ratingFrom) {
      return false;
    }

    return true;
  };

  const filteredMovies = movies.filter(applyFilters);

  // Sort movies based on selected criteria
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    if (sortBy === 'year') {
      return parseInt(b.Year) - parseInt(a.Year);
    } else if (sortBy === 'rating') {
      const ratingA = parseFloat(a.imdbRating) || 0;
      const ratingB = parseFloat(b.imdbRating) || 0;
      return ratingB - ratingA;
    }
    // Default: relevance (as returned by API)
    return 0;
  });

  const currentMovies = sortedMovies;

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && query) {
      const nextPage = currentPage + 1;
      fetchMovies(query, nextPage, true);
      setCurrentPage(nextPage);
    }
  }, [isLoading, hasMore, query, currentPage]);

  useEffect(() => {
    const handleScroll = () => {
      const bottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 100;
      if (bottom) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  // Handle watchlist and favorites
  const toggleWatchlist = (movieId) => {
    setWatchlist(prev => {
      if (prev.includes(movieId)) {
        return prev.filter(id => id !== movieId);
      } else {
        return [...prev, movieId];
      }
    });
  };

  const toggleFavorite = (movieId) => {
    setFavorites(prev => {
      if (prev.includes(movieId)) {
        return prev.filter(id => id !== movieId);
      } else {
        return [...prev, movieId];
      }
    });
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Theme-related variables
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#121212' : '#f5f5f5';
  const textColor = isDark ? '#ffffff' : '#121212';
  const cardBg = isDark ? '#1e1e1e' : '#ffffff';
  const borderColor = isDark ? '#4FC3F7' : '#1976D2';
  const highlightColor = isDark ? '#4FC3F7' : '#1976D2';
  const secondaryColor = isDark ? '#8c8c8c' : '#757575';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: bgColor, 
      color: textColor, 
      padding: '20px',
      transition: 'background-color 0.3s, color 0.3s' 
    }}>
      <header style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          color: highlightColor, 
          margin: '0 auto',
          fontSize: '32px',
          fontWeight: 'bold'
        }}>
          Movie Recommendation System
        </h1>
        
        <div style={{ 
          position: 'absolute', 
          right: '0', 
          display: 'flex',
          gap: '10px' 
        }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '10px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: highlightColor,
              color: '#fff',
              cursor: 'pointer',
              width: '45px',
              height: '45px',
              fontSize: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          
          <button
            onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}
            style={{
              padding: '10px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: highlightColor,
              color: '#fff',
              cursor: 'pointer',
              width: '45px',
              height: '45px',
              fontSize: '16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            title={`Switch to ${viewMode === 'grid' ? 'List' : 'Grid'} View`}
          >
            {viewMode === 'grid' ? '≡' : '▦'}
          </button>
        </div>
      </header>

      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <form onSubmit={handleSearch} style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '10px', 
          marginBottom: '15px', 
          flexWrap: 'wrap', 
          maxWidth: '800px',
          width: '100%'
        }}>
          <div style={{ 
            position: 'relative', 
            flex: '1',
            minWidth: '280px' 
          }}>
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search movies..."
              style={{
                padding: '14px',
                borderRadius: '20px',
                border: `1px solid ${borderColor}`,
                width: '100%',
                fontSize: '16px',
                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                color: textColor,
                transition: 'background-color 0.3s, color 0.3s'
              }}
            />
            {suggestions.length > 0 && (
              <ul style={{
                position: 'absolute',
                top: '50px',
                left: 0,
                right: 0,
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '10px',
                listStyle: 'none',
                margin: 0,
                padding: '5px 0',
                zIndex: 999,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                {suggestions.map((s, idx) => (
                  <li key={idx} onClick={() => handleSuggestionClick(s)} style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderBottom: idx < suggestions.length - 1 ? `1px solid ${isDark ? '#333' : '#eee'}` : 'none',
                    color: textColor,
                    transition: 'background-color 0.2s',
                    ':hover': {
                      backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0'
                    }
                  }}>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" style={{
            padding: '12px 20px',
            borderRadius: '20px',
            backgroundColor: highlightColor,
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#fff',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: isDark ? '#5DCCFF' : '#1565C0'
            }
          }}>
            Search
          </button>

          <button type="button" onClick={handleClearSearch} style={{
            padding: '12px 20px',
            borderRadius: '20px',
            backgroundColor: '#FF5252',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#fff',
            transition: 'background-color 0.2s',
            ':hover': {
              backgroundColor: '#FF1744'
            }
          }}>
            Clear
          </button>
        </form>

        {/* Advanced filters and Sort options */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px',
          flexWrap: 'wrap',
          width: '100%',
          maxWidth: '800px',
          marginBottom: '15px'
        }}>
          <div ref={filterRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '10px 15px',
                borderRadius: '20px',
                border: `1px solid ${borderColor}`,
                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                color: textColor,
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>Filters</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>
            
            {showFilters && (
              <div style={{
                position: 'absolute',
                top: '45px',
                left: '0',
                zIndex: 1000,
                backgroundColor: cardBg,
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                padding: '15px',
                width: '260px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: highlightColor }}>Advanced Filters</h4>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    Year Range
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="number" 
                      name="yearFrom"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={filterOptions.yearFrom}
                      onChange={handleFilterChange}
                      style={{
                        padding: '8px',
                        borderRadius: '5px',
                        border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                        backgroundColor: isDark ? '#2a2a2a' : '#fff',
                        color: textColor,
                        width: '100%'
                      }}
                    />
                    <span style={{ alignSelf: 'center' }}>to</span>
                    <input 
                      type="number" 
                      name="yearTo"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={filterOptions.yearTo}
                      onChange={handleFilterChange}
                      style={{
                        padding: '8px',
                        borderRadius: '5px',
                        border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                        backgroundColor: isDark ? '#2a2a2a' : '#fff',
                        color: textColor,
                        width: '100%'
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    Minimum Rating
                  </label>
                  <input 
                    type="range" 
                    name="ratingFrom"
                    min="0"
                    max="10"
                    step="0.1"
                    value={filterOptions.ratingFrom}
                    onChange={handleFilterChange}
                    style={{
                      width: '100%',
                      accentColor: highlightColor
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px' }}>0</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{filterOptions.ratingFrom}</span>
                    <span style={{ fontSize: '12px' }}>10</span>
                  </div>
                </div>
                
                {movies.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      Genre
                    </label>
                    <select 
                      value={selectedGenre} 
                      onChange={(e) => setSelectedGenre(e.target.value)}
                      style={{
                        padding: '8px',
                        borderRadius: '5px',
                        border: `1px solid ${isDark ? '#444' : '#ddd'}`,
                        backgroundColor: isDark ? '#2a2a2a' : '#fff',
                        color: textColor,
                        width: '100%'
                      }}
                    >
                      <option value="All">All Genres</option>
                      {getUniqueGenres().map((genre, idx) => (
                        <option key={idx} value={genre}>{genre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {movies.length > 0 && (
            <div>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '10px 15px',
                  borderRadius: '20px',
                  border: `1px solid ${borderColor}`,
                  backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                  color: textColor,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <option value="relevance">Sort by: Relevance</option>
                <option value="year">Sort by: Newest</option>
                <option value="rating">Sort by: Rating</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '15px'
          }}>
            <span style={{ fontSize: '14px', color: secondaryColor }}>Recent searches:</span>
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(term);
                  fetchMovies(term);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '15px',
                  backgroundColor: isDark ? '#2a2a2a' : '#e0e0e0',
                  border: 'none',
                  fontSize: '14px',
                  color: textColor,
                  cursor: 'pointer'
                }}
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: `4px solid ${isDark ? '#333' : '#f3f3f3'}`,
            borderTop: `4px solid ${highlightColor}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}></div>
          <style>
            {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            `}
          </style>
        </div>
      )}

      {/* Movie List View */}
      {currentMovies.length > 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
            width: '100%',
            maxWidth: '1200px'
          }}>
            {viewMode === 'grid' ? (
              // Grid View
              currentMovies.map((movie, index) => (
                <div 
                  key={index} 
                  onClick={() => setModalMovie(movie)} 
                  style={{
                    width: '220px',
                    cursor: 'pointer',
                    backgroundColor: cardBg,
                    borderRadius: '15px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                    position: 'relative',
                    ':hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
                    }
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <LazyLoadImage
                      src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/220x330?text=No+Image'}
                      alt={movie.Title}
                      effect="blur"
                      width="100%"
                      height="330px"
                      style={{ objectFit: 'cover' }}
                    />
                    
                    {/* Action buttons positioned on the movie poster */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(movie.imdbID);
                        }}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: watchlist.includes(movie.imdbID) ? '#FFD700' : '#fff',
                          fontSize: '18px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        title={watchlist.includes(movie.imdbID) ? "Remove from Watchlist" : "Add to Watchlist"}
                      >
                        📋
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(movie.imdbID);
                        }}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: favorites.includes(movie.imdbID) ? '#FF5252' : '#fff',
                          fontSize: '18px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                        title={favorites.includes(movie.imdbID) ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        {favorites.includes(movie.imdbID) ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ padding: '12px', textAlign: 'center' }}>
                    <p style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '8px',
                      fontSize: '16px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {movie.Title}
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      color: isDark ? '#ccc' : '#555', 
                      margin: '5px 0' 
                    }}>
                      {movie.Year}
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      color: isDark ? '#ccc' : '#555', 
                      margin: '5px 0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {movie.Genre.split(',')[0]}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      margin: '5px 0'
                    }}>
                      <span style={{ color: '#FFD700', marginRight: '5px' }}>★</span>
                      <span>{movie.imdbRating !== 'N/A' ? movie.imdbRating : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // List View
              currentMovies.map((movie, index) => (
                <div 
                  key={index} 
                  onClick={() => setModalMovie(movie)} 
                  style={{
                    display: 'flex',
                    width: '100%',
                    maxWidth: '800px',
                    backgroundColor: cardBg,
                    borderRadius: '15px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    margin: '5px 0',
                    cursor: 'pointer',
                    ':hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 15px rgba(0,0,0,0.2)',
                    }
                  }}
                >
                  <div style={{ flexShrink: 0, width: '120px', height: '180px' }}>
                    <LazyLoadImage
                      src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/120x180?text=No+Image'}
                      alt={movie.Title}
                      effect="blur"
                      height="100%"
                      width="100%"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  
                  <div style={{ 
                    flex: '1', 
                    padding: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'  
                  }}>
                    <div>
                      <h3 style={{ 
                        margin: '0 0 10px 0', 
                        color: highlightColor,
                        fontSize: '18px'
                      }}>
                        {movie.Title}
                      </h3>
                      
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '15px', 
                        marginBottom: '10px',
                        fontSize: '14px'
                      }}>
                        <span>{movie.Year}</span>
                        <span>•</span>
                        <span>{movie.Runtime}</span>
                        <span>•</span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ color: '#FFD700', marginRight: '5px' }}>★</span>
                          <span>{movie.imdbRating !== 'N/A' ? movie.imdbRating : 'N/A'}</span>
                        </div>
                      </div>
                      
                      <p style={{ 
                        fontSize: '14px', 
                        color: secondaryColor,
                        margin: '0 0 10px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {movie.Plot}
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '5px',
                        marginBottom: '10px'
                      }}>
                        {movie.Genre.split(',').map((genre, idx) => (
                          <span key={idx} style={{
                            backgroundColor: isDark ? '#333' : '#e0e0e0',
                            color: textColor,
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '12px'
                          }}>
                            {genre.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px',
                      marginTop: 'auto'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(movie.imdbID);
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '15px',
                          backgroundColor: watchlist.includes(movie.imdbID) 
                            ? 'rgba(255, 215, 0, 0.2)' 
                            : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          border: `1px solid ${watchlist.includes(movie.imdbID) ? '#FFD700' : isDark ? '#444' : '#ddd'}`,
                          color: watchlist.includes(movie.imdbID) ? '#FFD700' : textColor,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>📋</span>
                        <span>{watchlist.includes(movie.imdbID) ? 'In Watchlist' : 'Watchlist'}</span>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(movie.imdbID);
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '15px',
                          backgroundColor: favorites.includes(movie.imdbID) 
                            ? 'rgba(255, 82, 82, 0.2)' 
                            : isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          border: `1px solid ${favorites.includes(movie.imdbID) ? '#FF5252' : isDark ? '#444' : '#ddd'}`,
                          color: favorites.includes(movie.imdbID) ? '#FF5252' : textColor,
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>{favorites.includes(movie.imdbID) ? '❤️' : '🤍'}</span>
                        <span>{favorites.includes(movie.imdbID) ? 'Favorited' : 'Favorite'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Load More Button */}
          {hasMore && currentMovies.length > 0 && !isLoading && (
            <button
              onClick={loadMore}
              style={{
                margin: '30px auto',
                padding: '12px 24px',
                borderRadius: '20px',
                backgroundColor: isDark ? '#333' : '#e0e0e0',
                color: textColor,
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Load More</span>
              <span>↓</span>
            </button>
          )}
        </div>
      ) : (
        !isLoading && query && (
          <div style={{ 
            textAlign: 'center',
            padding: '30px'
          }}>
            <p style={{ marginBottom: '20px' }}>No movies found for "{query}"</p>
            <p style={{ color: secondaryColor }}>Try searching for something else</p>
          </div>
        )
      )}
      
      {/* Welcome message when no search has been performed */}
      {!query && !isLoading && currentMovies.length === 0 && (
        <div style={{ 
          textAlign: 'center',
          maxWidth: '600px',
          margin: '50px auto',
          padding: '20px',
          backgroundColor: cardBg,
          borderRadius: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <h2 style={{ color: highlightColor, marginBottom: '15px' }}>Welcome to Movie Explorer!</h2>
          <p style={{ marginBottom: '20px' }}>Search for any movie to get started.</p>
          
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            marginTop: '20px',
            padding: '0 20px'
          }}>
            <div style={{ 
              textAlign: 'left',
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '24px' }}>🔍</span>
              <p style={{ margin: 0 }}>Enter a movie title in the search box</p>
            </div>
            
            <div style={{ 
              textAlign: 'left',
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '24px' }}>📋</span>
              <p style={{ margin: 0 }}>Add movies to your watchlist</p>
            </div>
            
            <div style={{ 
              textAlign: 'left',
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '24px' }}>❤️</span>
              <p style={{ margin: 0 }}>Save your favorite movies</p>
            </div>
            
            <div style={{ 
              textAlign: 'left',
              display: 'flex',
              gap: '15px',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '24px' }}>🎬</span>
              <p style={{ margin: 0 }}>Click on any movie to see more details</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Modal with more details */}
      {modalMovie && (
        <div onClick={() => setModalMovie(null)} style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: cardBg,
            borderRadius: '15px',
            maxWidth: '800px',
            width: '90%',
            color: textColor,
            overflowY: 'auto',
            maxHeight: '90vh',
            padding: '0',
            boxShadow: '0 5px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              borderTopLeftRadius: '15px',
              borderTopRightRadius: '15px',
              overflow: 'hidden'
            }}>
              {/* Header section with blurred background */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
                overflow: 'hidden'
              }}>
                {/* Blurred background poster */}
                {modalMovie.Poster !== 'N/A' && (
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: `url(${modalMovie.Poster})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(30px)',
                    opacity: 0.4,
                    transform: 'scale(1.1)'
                  }} />
                )}
                
                {/* Content overlay */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  padding: '30px',
                  height: '100%',
                  zIndex: 1
                }}>
                  {/* Poster */}
                  <div style={{
                    flexShrink: 0,
                    width: '130px',
                    height: '180px',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    marginRight: '25px'
                  }}>
                    <LazyLoadImage
                      src={modalMovie.Poster !== 'N/A' ? modalMovie.Poster : 'https://via.placeholder.com/130x180?text=No+Image'}
                      alt={modalMovie.Title}
                      effect="blur"
                      width="100%"
                      height="100%"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  
                  {/* Movie title and basic info */}
                  <div style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <h2 style={{ 
                      color: '#fff', 
                      marginBottom: '10px',
                      fontWeight: 'bold',
                      fontSize: '24px',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                      {modalMovie.Title}
                    </h2>
                    
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '15px', 
                      marginBottom: '15px',
                      color: '#fff',
                      fontSize: '14px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      <span>{modalMovie.Year}</span>
                      <span>•</span>
                      <span>{modalMovie.Runtime}</span>
                      <span>•</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ color: '#FFD700', marginRight: '5px' }}>★</span>
                        <span>{modalMovie.imdbRating}</span>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '5px'
                    }}>
                      {modalMovie.Genre.split(',').map((genre, idx) => (
                        <span key={idx} style={{
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {genre.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Action buttons at top right */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  display: 'flex',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => toggleWatchlist(modalMovie.imdbID)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: watchlist.includes(modalMovie.imdbID) ? '#FFD700' : '#fff',
                      fontSize: '20px'
                    }}
                    title={watchlist.includes(modalMovie.imdbID) ? "Remove from Watchlist" : "Add to Watchlist"}
                  >
                    📋
                  </button>
                  
                  <button
                    onClick={() => toggleFavorite(modalMovie.imdbID)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: favorites.includes(modalMovie.imdbID) ? '#FF5252' : '#fff',
                      fontSize: '20px'
                    }}
                    title={favorites.includes(modalMovie.imdbID) ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    {favorites.includes(modalMovie.imdbID) ? '❤️' : '🤍'}
                  </button>
                  
                  <button
                    onClick={() => setModalMovie(null)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: '#fff',
                      fontSize: '20px'
                    }}
                    title="Close"
                  >
                    ✖
                  </button>
                </div>
              </div>
            </div>
            
            {/* Detailed content section */}
            <div style={{ padding: '30px' }}>
              {/* Plot */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ 
                  color: highlightColor, 
                  marginBottom: '10px',
                  fontSize: '18px'
                }}>
                  Plot
                </h3>
                <p style={{ lineHeight: '1.6' }}>{modalMovie.Plot}</p>
              </div>
              
              {/* Additional details */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '25px'
              }}>
                <div>
                  <h3 style={{ 
                    color: highlightColor, 
                    marginBottom: '10px',
                    fontSize: '18px'
                  }}>
                    Cast
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>{modalMovie.Actors}</p>
                </div>
                
                <div>
                  <h3 style={{ 
                    color: highlightColor, 
                    marginBottom: '10px',
                    fontSize: '18px'
                  }}>
                    Director
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>{modalMovie.Director}</p>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '25px'
              }}>
                <div>
                  <h3 style={{ 
                    color: highlightColor, 
                    marginBottom: '10px',
                    fontSize: '16px'
                  }}>
                    Released
                  </h3>
                  <p>{modalMovie.Released}</p>
                </div>
                
                <div>
                  <h3 style={{ 
                    color: highlightColor, 
                    marginBottom: '10px',
                    fontSize: '16px'
                  }}>
                    Runtime
                  </h3>
                  <p>{modalMovie.Runtime}</p>
                </div>
                
                <div>
                  <h3 style={{ 
                    color: highlightColor, 
                    marginBottom: '10px',
                    fontSize: '16px'
                  }}>
                    Language
                  </h3>
                  <p>{modalMovie.Language}</p>
                </div>
              </div>
              
              {/* External links */}
              <div style={{ 
                display: 'flex',
                gap: '15px',
                marginTop: '20px',
                justifyContent: 'center'
              }}>
                <a
                  href={`https://www.imdb.com/title/${modalMovie.imdbID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    backgroundColor: '#f3ce13',
                    color: '#000',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>IMDb</span>
                </a>
                
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(modalMovie.Title + ' ' + modalMovie.Year + ' trailer')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    backgroundColor: '#FF0000',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Trailer</span>
                </a>
              </div>
              
              {/* Recommendation section - static for demo */}
              <div style={{ 
                marginTop: '30px',
                padding: '20px',
                backgroundColor: isDark ? '#242424' : '#f0f0f0',
                borderRadius: '12px'
              }}>
                <h3 style={{ 
                  color: highlightColor, 
                  marginBottom: '15px',
                  fontSize: '18px',
                  textAlign: 'center'
                }}>
                  You might also like
                </h3>
                
                <p style={{ 
                  color: secondaryColor,
                  textAlign: 'center',
                  fontSize: '14px'
                }}>
                  Similar movies based on your viewing history would appear here
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;