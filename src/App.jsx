import React, { useEffect, useState } from 'react';
import BottomNav from './components/BottomNav';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import AddRecipe from './components/AddRecipe';
import Recommendations from './components/Recommendations';
import MealPlanner from './components/MealPlanner';
import CookLog from './components/CookLog';
import Settings from './components/Settings';
import { useRecipes } from './hooks/useRecipes';
import { fetchHealthInsights, fetchDailyBudget, getSyncId } from './utils/healthTrackerSync';

const PANTRY_KEY = 'recipe-box-pantry';

export default function App() {
  const { recipes, loading, error, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const [tab, setTab] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [healthInsights, setHealthInsights] = useState(null);
  const [budget, setBudget] = useState(null);
  const [cookLogPrefill, setCookLogPrefill] = useState(null);

  const refreshHealthData = () => {
    if (!getSyncId()) {
      setHealthInsights(null);
      setBudget(null);
      return;
    }
    fetchHealthInsights().then(setHealthInsights).catch(() => setHealthInsights(null));
    fetchDailyBudget().then(setBudget).catch(() => setBudget(null));
  };

  useEffect(() => {
    refreshHealthData();
  }, []);

  let pantryItems = [];
  try {
    pantryItems = JSON.parse(localStorage.getItem(PANTRY_KEY) || '[]');
  } catch {
    pantryItems = [];
  }

  const selected = recipes.find((r) => r.id === selectedId);

  const handleSelect = (id) => {
    setSelectedId(id);
    setTab('detail');
  };

  const handleBack = () => {
    setSelectedId(null);
    setTab('list');
  };

  return (
    <div className="app-bg">
      <div className="app-shell">
        {error && (
          <div className="error-banner">
            Couldn't connect to your recipe storage: {error}. Check the Firebase config in src/firebase.js.
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <div className="display">Opening the box…</div>
          </div>
        ) : (
          <>
            {tab === 'list' && (
              <RecipeList
                recipes={recipes}
                onSelect={handleSelect}
                onAdd={() => setTab('add')}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            )}

            {tab === 'detail' && selected && (
              <RecipeDetail
                recipe={selected}
                onBack={handleBack}
                onUpdate={updateRecipe}
                onDelete={deleteRecipe}
                pantryItems={pantryItems}
                healthInsights={healthInsights}
                onLogCook={(recipe) => {
                  setCookLogPrefill({ linkedRecipeIds: [recipe.id] });
                  setSelectedId(null);
                  setTab('cooklog');
                }}
              />
            )}

            {tab === 'add' && (
              <AddRecipe
                onSave={async (recipe) => {
                  await addRecipe(recipe);
                  setTab('list');
                }}
              />
            )}

            {tab === 'recommend' && (
              <Recommendations
                recipes={recipes}
                onSelect={handleSelect}
                healthInsights={healthInsights}
                budget={budget}
              />
            )}

            {tab === 'plan' && (
              <MealPlanner recipes={recipes} onSelect={handleSelect} />
            )}

            {tab === 'cooklog' && (
              <CookLog
                recipes={recipes}
                prefill={cookLogPrefill}
                onConsumedPrefill={() => setCookLogPrefill(null)}
              />
            )}
          </>
        )}

        <BottomNav
          active={tab === 'detail' ? 'list' : tab}
          onChange={(t) => {
            setSelectedId(null);
            setTab(t);
          }}
        />
      </div>

      {settingsOpen && (
        <Settings
          onClose={() => {
            setSettingsOpen(false);
            refreshHealthData();
          }}
          recipes={recipes}
          addRecipe={addRecipe}
        />
      )}
    </div>
  );
}
