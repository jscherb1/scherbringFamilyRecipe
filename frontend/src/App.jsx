import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { RecipeList } from './routes/recipes/list';
import { RecipeEdit } from './routes/recipes/edit';
import { RecipeDetail } from './routes/recipes/detail';
import { PlannerIndex } from './routes/planner/index';
import { PlannerHistory } from './routes/planner/history';
import { PlannerDetail } from './routes/planner/detail';
import { ProfileSettings } from './routes/settings/profile';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/recipes" replace />} />
            <Route path="/recipes" element={<RecipeList />} />
            <Route path="/recipes/new" element={<RecipeEdit />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
            <Route path="/planner" element={<PlannerIndex />} />
            <Route path="/planner/history" element={<PlannerHistory />} />
            <Route path="/planner/:id" element={<PlannerDetail />} />
            <Route path="/settings/profile" element={<ProfileSettings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
