import { useState } from 'react';
import { X, Link, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface UrlImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<void>;
  loading?: boolean;
}

export function UrlImportDialog({ open, onClose, onImport, loading = false }: UrlImportDialogProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    try {
      await onImport(url.trim());
      setUrl('');
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import recipe');
    }
  };

  const handleClose = () => {
    if (!loading) {
      setUrl('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Link className="w-5 h-5" />
            Import Recipe from URL
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 mb-2">
              Recipe URL
            </label>
            <Input
              id="recipe-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipe"
              disabled={loading}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-1">
              Paste a link to a recipe from popular cooking websites
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Recipe'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
