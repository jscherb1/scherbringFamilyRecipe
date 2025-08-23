import React, { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { Badge } from './Badge';
import { Button } from './Button';
import { X, Plus, Check, ChevronDown } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags: string[];
  onNewTagCreated?: (newTag: string) => void;
  placeholder?: string;
  className?: string;
  showSelectedTags?: boolean;
}

export function TagInput({ 
  tags, 
  onTagsChange, 
  availableTags, 
  onNewTagCreated,
  placeholder = "Search or add tags...",
  className = "",
  showSelectedTags = true
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [showCreateOption, setShowCreateOption] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter available tags based on input and exclude already selected tags
  useEffect(() => {
    if (inputValue.trim() === '') {
      // When input is empty, don't show filtered results - only show "Available tags" section
      setFilteredTags([]);
    } else {
      // When input has value, filter based on search
      const filtered = availableTags.filter(tag => 
        !tags.includes(tag) && 
        tag.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredTags(filtered);
    }
    
    // Show "create new tag" option if input is not empty and doesn't exactly match any existing tag
    const exactMatch = availableTags.some(tag => 
      tag.toLowerCase() === inputValue.toLowerCase()
    );
    setShowCreateOption(inputValue.trim() !== '' && !exactMatch && !tags.includes(inputValue.trim()));
  }, [inputValue, availableTags, tags]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleInputBlur = () => {
    // Close dropdown when input loses focus, but with a small delay
    // to allow clicking on dropdown items
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsDropdownOpen(false);
      }
    }, 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsDropdownOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0) {
        // Select first filtered tag
        addTag(filteredTags[0]);
      } else if (showCreateOption) {
        // Create new tag
        createNewTag();
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    } else if (e.key === 'ArrowDown' && isDropdownOpen) {
      e.preventDefault();
      // Could implement keyboard navigation here in the future
    }
  };

  const addTag = (tag: string) => {
    if (!tags.includes(tag)) {
      onTagsChange([...tags, tag]);
      setInputValue('');
      setIsDropdownOpen(false);
    }
  };

  const createNewTag = () => {
    const newTag = inputValue.trim();
    if (newTag && !tags.includes(newTag)) {
      onTagsChange([...tags, newTag]);
      // Notify parent component about the new tag
      if (onNewTagCreated) {
        onNewTagCreated(newTag);
      }
      setInputValue('');
      setIsDropdownOpen(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input with dropdown */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-8"
          />
          <ChevronDown 
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
        
        {/* Dropdown */}
        {isDropdownOpen && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {/* Existing tags */}
            {filteredTags.length > 0 && (
              <div className="py-2">
                {filteredTags.map((tag, index) => (
                  <button
                    key={tag}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                    onClick={() => addTag(tag)}
                  >
                    <span className="text-sm">{tag}</span>
                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  </button>
                ))}
              </div>
            )}
            
            {/* Separator if both existing and create option are shown */}
            {filteredTags.length > 0 && showCreateOption && (
              <div className="border-t border-gray-100" />
            )}
            
            {/* Create new tag option */}
            {showCreateOption && (
              <button
                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between group border-t border-gray-100"
                onClick={createNewTag}
              >
                <span className="text-sm text-blue-600 font-medium">
                  Create "{inputValue}"
                </span>
                <div className="flex items-center space-x-1">
                  <Plus className="h-4 w-4 text-blue-500" />
                </div>
              </button>
            )}
            
            {/* No results */}
            {filteredTags.length === 0 && !showCreateOption && inputValue.trim() !== '' && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No matching tags found
              </div>
            )}
            
            {/* Show some available tags when input is empty */}
            {inputValue.trim() === '' && (
              <div className="py-2">
                <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50">
                  {availableTags.filter(tag => !tags.includes(tag)).length > 0 
                    ? "Click to add existing tags" 
                    : "No available tags"}
                </div>
                {availableTags.filter(tag => !tags.includes(tag)).slice(0, 10).map((tag) => (
                  <button
                    key={tag}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between group"
                    onClick={() => addTag(tag)}
                  >
                    <span className="text-sm">{tag}</span>
                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Selected tags */}
      {showSelectedTags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
              <span>{tag}</span>
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
