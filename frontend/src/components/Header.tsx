import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/Button';
import { ChefHat, BookOpen, Calendar, Settings, Sun, Moon } from 'lucide-react';

export function Header() {
  const location = useLocation();
  const [darkMode, setDarkMode] = React.useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block text-xl">
              Recipe Planner
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/recipes"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/recipes') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>Recipes</span>
              </div>
            </Link>
            <Link
              to="/planner"
              className={`transition-colors hover:text-foreground/80 ${
                isActive('/planner') ? 'text-foreground' : 'text-foreground/60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Meal Planner</span>
              </div>
            </Link>
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Mobile navigation */}
            <div className="flex md:hidden">
              <Link to="/" className="flex items-center space-x-2">
                <ChefHat className="h-6 w-6 text-primary" />
                <span className="font-bold">Recipe Planner</span>
              </Link>
            </div>
          </div>
          
          <nav className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            
            <Link to="/settings/profile">
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 ${
                  isActive('/settings') ? 'bg-accent' : ''
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="border-t md:hidden">
        <nav className="flex items-center justify-around p-2">
          <Link
            to="/recipes"
            className={`flex flex-col items-center space-y-1 p-2 text-xs ${
              isActive('/recipes') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Recipes</span>
          </Link>
          <Link
            to="/planner"
            className={`flex flex-col items-center space-y-1 p-2 text-xs ${
              isActive('/planner') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span>Planner</span>
          </Link>
          <Link
            to="/settings/profile"
            className={`flex flex-col items-center space-y-1 p-2 text-xs ${
              isActive('/settings') ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
