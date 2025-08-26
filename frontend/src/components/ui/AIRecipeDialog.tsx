import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Loader2, Sparkles, Shuffle, MessageSquare, X } from 'lucide-react';

interface AIRecipeDialogProps {
  open: boolean;
  onClose: () => void;
  onRecipeGenerated: (recipeData: any) => void;
  loading: boolean;
}

export function AIRecipeDialog({ open, onClose, onRecipeGenerated, loading }: AIRecipeDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'prompt' | 'random'>('prompt');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'prompt' && prompt.trim()) {
      onRecipeGenerated({ type: 'prompt', prompt: prompt.trim() });
    } else if (mode === 'random') {
      onRecipeGenerated({ type: 'random' });
    }
  };

  const handleModeChange = (newMode: 'prompt' | 'random') => {
    setMode(newMode);
    if (newMode === 'random') {
      setPrompt('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onClose}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <CardTitle className="text-2xl">Generate Recipe with AI</CardTitle>
            </div>
            <CardDescription>
              Let AI create a personalized recipe for you
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Mode Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Choose generation mode:</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'prompt' ? 'default' : 'outline'}
                  onClick={() => handleModeChange('prompt')}
                  disabled={loading}
                  className="flex-1"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Describe Recipe
                </Button>
                <Button
                  type="button"
                  variant={mode === 'random' ? 'default' : 'outline'}
                  onClick={() => handleModeChange('random')}
                  disabled={loading}
                  className="flex-1"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Random Recipe
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'prompt' && (
                <div className="space-y-2">
                  <label htmlFor="recipe-prompt" className="text-sm font-medium">
                    Describe what you'd like to cook:
                  </label>
                  <Textarea
                    id="recipe-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'A spicy pasta dish with chicken and vegetables' or 'A healthy breakfast smoothie bowl'"
                    rows={4}
                    disabled={loading}
                    className="resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    Be as specific or general as you like. The AI will create a complete recipe based on your description.
                  </p>
                </div>
              )}

              {mode === 'random' && (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Shuffle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    AI will surprise you with a completely random recipe! Perfect for trying something new.
                  </p>
                </div>
              )}

              {/* Example prompts for inspiration */}
              {mode === 'prompt' && !loading && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Need inspiration? Try these:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Mediterranean chicken bowl",
                      "Cozy winter soup",
                      "Quick 30-minute dinner",
                      "Healthy vegetarian lunch",
                      "Comfort food classic"
                    ].map((example) => (
                      <Badge
                        key={example}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => !loading && setPrompt(example)}
                      >
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || (mode === 'prompt' && !prompt.trim())}
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Recipe
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
