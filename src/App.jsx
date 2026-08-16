import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import AddRecipe from './components/AddRecipe';
import Recommendations from './components/Recommendations';
import { useRecipes } from './hooks/useRecipes';

const PANTRY_KEY = 'recipe-box-pantry';

export default function App() {
  const { recipes, loading, error, addRecipe, updateRecipe, deleteRecipe, uploadPhoto } = useRecipes();
  const [tab, setTab] = useState('list');
  const [selectedId, setSelectedId] = useState(null);

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
    <div className="app-shell">
      {error && (
        <div style={{ background: '#fdeceb', color: 'var(--rust)', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          Couldn't connect to your recipe storage: {error}. Check the Firebase config in src/firebase.js.
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <div className="display">Opening the box…</div>
        </div>
      ) : (
        <>
          {tab === 'list' && <RecipeList recipes={recipes} onSelect={handleSelect} />}

          {tab === 'detail' && selected && (
            <RecipeDetail
              recipe={selected}
              onBack={handleBack}
              onUpdate={updateRecipe}
              onDelete={deleteRecipe}
              pantryItems={pantryItems}
            />
          )}

          {tab === 'add' && (
            <AddRecipe
              onSave={async (recipe) => {
                await addRecipe(recipe);
                setTab('list');
              }}
              uploadPhoto={uploadPhoto}
            />
          )}

          {tab === 'recommend' && (
            <Recommendations recipes={recipes} onSelect={handleSelect} />
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
  );
}
