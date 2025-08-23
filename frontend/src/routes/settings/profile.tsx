import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Save, Plus, X, User } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { UserProfile, UserProfileUpdate } from '../../lib/types';

export function ProfileSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [newLike, setNewLike] = useState('');
  const [newDislike, setNewDislike] = useState('');
  const [stapleGroceries, setStapleGroceries] = useState('');
  const [defaultDinnersPerWeek, setDefaultDinnersPerWeek] = useState(5);
  const [startWeekOn, setStartWeekOn] = useState<'monday' | 'sunday'>('monday');
  const [timezone, setTimezone] = useState('');
  const [tagCatalog, setTagCatalog] = useState<string[]>([]);
  const [allRecipeTags, setAllRecipeTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    loadProfile();
    loadRecipeTags();
  }, []);

  const loadRecipeTags = async () => {
    try {
      setLoadingTags(true);
      const tags = await apiClient.getTags();
      setAllRecipeTags(tags);
    } catch (error) {
      console.error('Failed to load recipe tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const loadProfile = async () => {
    try {
      const userProfile = await apiClient.getProfile();
      setProfile(userProfile);
      
      // Set form state
      setLikes(userProfile.likes);
      setDislikes(userProfile.dislikes);
      setStapleGroceries(userProfile.stapleGroceries?.join('\n') || '');
      setDefaultDinnersPerWeek(userProfile.defaultDinnersPerWeek);
      setStartWeekOn(userProfile.startWeekOn);
      setTimezone(userProfile.timezone);
      setTagCatalog(userProfile.tagCatalog || []);
    } catch (error) {
      console.error('Failed to load profile:', error);
      // If profile doesn't exist, we'll create one when saving
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: UserProfileUpdate = {
      likes,
      dislikes,
      stapleGroceries: stapleGroceries.split('\n').map(item => item.trim()).filter(item => item.length > 0),
      defaultDinnersPerWeek,
      startWeekOn,
      timezone: timezone.trim() || 'UTC',
      tagCatalog,
    };

    try {
      setSaving(true);
      if (profile) {
        await apiClient.updateProfile(updateData);
      } else {
        // For creating new profile, we need to use updateProfile which will create if it doesn't exist
        await apiClient.updateProfile({
          ...updateData,
          tagCatalog: [],
          exportPrefs: {},
        });
      }
      
      // Reload profile to get updated data
      await loadProfile();
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addLike = () => {
    if (newLike.trim() && !likes.includes(newLike.trim())) {
      setLikes([...likes, newLike.trim()]);
      setNewLike('');
    }
  };

  const removeLike = (like: string) => {
    setLikes(likes.filter(item => item !== like));
  };

  const addDislike = () => {
    if (newDislike.trim() && !dislikes.includes(newDislike.trim())) {
      setDislikes([...dislikes, newDislike.trim()]);
      setNewDislike('');
    }
  };

  const removeDislike = (dislike: string) => {
    setDislikes(dislikes.filter(item => item !== dislike));
  };

  const addTag = async () => {
    if (newTag.trim() && !allRecipeTags.includes(newTag.trim())) {
      try {
        await apiClient.addTagToCatalog(newTag.trim());
        // Reload tags to get updated list
        await loadRecipeTags();
        setNewTag('');
      } catch (error) {
        console.error('Failed to add tag:', error);
        alert('Failed to add tag');
      }
    }
  };

  const removeTag = async (tag: string) => {
    if (confirm(`Are you sure you want to remove the tag "${tag}"? This will also remove it from all recipes that use it.`)) {
      try {
        setDeletingTag(tag);
        await apiClient.removeTagFromCatalog(tag);
        // Reload tags to get updated list
        await loadRecipeTags();
      } catch (error) {
        console.error('Failed to remove tag:', error);
        alert('Failed to remove tag');
      } finally {
        setDeletingTag(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center space-x-3">
          <User className="h-8 w-8" />
          <span>Profile Settings</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your preferences for meal planning and recipes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meal Planning Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Meal Planning Preferences</CardTitle>
            <CardDescription>
              Configure default settings for generating meal plans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Default Dinners Per Week</label>
                <Input
                  type="number"
                  value={defaultDinnersPerWeek}
                  onChange={(e) => setDefaultDinnersPerWeek(Number(e.target.value))}
                  min="1"
                  max="7"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How many dinners to plan by default (1-7)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Week Starts On</label>
                <select
                  value={startWeekOn}
                  onChange={(e) => setStartWeekOn(e.target.value as 'monday' | 'sunday')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="monday">Monday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Timezone</label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g., America/New_York"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your timezone for meal planning (optional)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Food Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Food Preferences</CardTitle>
            <CardDescription>
              Let us know what you love and what you'd prefer to avoid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Likes */}
            <div>
              <label className="text-sm font-medium">Things I Like</label>
              <div className="mt-2 space-y-3">
                <div className="flex space-x-2">
                  <Input
                    value={newLike}
                    onChange={(e) => setNewLike(e.target.value)}
                    placeholder="Add something you like"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLike())}
                  />
                  <Button type="button" onClick={addLike}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {likes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {likes.map((like) => (
                      <Badge key={like} variant="secondary" className="flex items-center space-x-1">
                        <span>{like}</span>
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeLike(like)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dislikes */}
            <div>
              <label className="text-sm font-medium">Things I Dislike</label>
              <div className="mt-2 space-y-3">
                <div className="flex space-x-2">
                  <Input
                    value={newDislike}
                    onChange={(e) => setNewDislike(e.target.value)}
                    placeholder="Add something you dislike"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDislike())}
                  />
                  <Button type="button" onClick={addDislike}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {dislikes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {dislikes.map((dislike) => (
                      <Badge key={dislike} variant="destructive" className="flex items-center space-x-1">
                        <span>{dislike}</span>
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeDislike(dislike)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staple Groceries */}
        <Card>
          <CardHeader>
            <CardTitle>Family Staple Groceries</CardTitle>
            <CardDescription>
              Items you regularly buy that can be added to your shopping lists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium">Staple Items</label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Enter each item on a new line. These will be available to add to your meal plan shopping lists.
              </p>
              <textarea
                value={stapleGroceries}
                onChange={(e) => setStapleGroceries(e.target.value)}
                placeholder={`Milk\nBread\nEggs\nButter\nOnions\nGarlic\nOlive oil\nSalt\nPepper`}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tag Management */}
        <Card>
          <CardHeader>
            <CardTitle>Recipe Tag Management</CardTitle>
            <CardDescription>
              Manage the tags available for your recipes. Removing a tag will also remove it from all recipes that use it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add new tag */}
              <div>
                <label className="text-sm font-medium">Add New Tag</label>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Add a new tag that can be used when creating or editing recipes.
                </p>
                <div className="flex space-x-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter tag name"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} disabled={!newTag.trim() || allRecipeTags.includes(newTag.trim())}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {newTag.trim() && allRecipeTags.includes(newTag.trim()) && (
                  <p className="text-xs text-amber-600 mt-1">
                    This tag already exists in your recipes.
                  </p>
                )}
              </div>

              {/* Current tags */}
              <div>
                <label className="text-sm font-medium">
                  Current Recipe Tags ({allRecipeTags.length})
                </label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  These are all the tags currently used in your recipes. Click the X to remove a tag from all recipes.
                </p>
                {loadingTags ? (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Loading tags...</span>
                  </div>
                ) : allRecipeTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allRecipeTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="flex items-center space-x-1">
                        <span>{tag}</span>
                        <X
                          className={`h-3 w-3 cursor-pointer hover:text-red-500 ${
                            deletingTag === tag ? 'animate-pulse' : ''
                          }`}
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No tags found in your recipes. Create some recipes with tags to see them here.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Read-only information about your profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profile Created:</span>
                  <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span>{new Date(profile.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-xs">{profile.userId}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
