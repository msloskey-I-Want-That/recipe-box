import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

const RECIPES_COL = 'recipes';

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, RECIPES_COL), orderBy('dateAdded', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRecipes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addRecipe = useCallback(async (recipe) => {
    await addDoc(collection(db, RECIPES_COL), {
      ...recipe,
      dateAdded: serverTimestamp()
    });
  }, []);

  const updateRecipe = useCallback(async (id, changes) => {
    await updateDoc(doc(db, RECIPES_COL, id), changes);
  }, []);

  const deleteRecipe = useCallback(async (id) => {
    await deleteDoc(doc(db, RECIPES_COL, id));
  }, []);

  const uploadPhoto = useCallback(async (file) => {
    const path = `recipe-photos/${Date.now()}-${file.name}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }, []);

  return { recipes, loading, error, addRecipe, updateRecipe, deleteRecipe, uploadPhoto };
}
