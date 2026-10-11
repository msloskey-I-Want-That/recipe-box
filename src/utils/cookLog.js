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
import { db } from '../firebase';

const COOKLOGS_COL = 'cookLogs';

export function useCookLogs() {
  const [cookLogs, setCookLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, COOKLOGS_COL), orderBy('date', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCookLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const addCookLog = useCallback(async (cookLog) => {
    const docRef = await addDoc(collection(db, COOKLOGS_COL), {
      ...cookLog,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }, []);

  const updateCookLog = useCallback(async (id, changes) => {
    await updateDoc(doc(db, COOKLOGS_COL, id), { ...changes, updatedAt: serverTimestamp() });
  }, []);

  const deleteCookLog = useCallback(async (id) => {
    await deleteDoc(doc(db, COOKLOGS_COL, id));
  }, []);

  return { cookLogs, loading, error, addCookLog, updateCookLog, deleteCookLog };
}

// ── Duration / weight helpers ──

export function cookDurationMinutes(cookLog) {
  if (!cookLog.startTime || !cookLog.pullTime) return null;
  const start = new Date(cookLog.startTime);
  const pull = new Date(cookLog.pullTime);
  const mins = Math.round((pull - start) / 60000);
  return mins > 0 ? mins : null;
}

export function minutesPerPound(cookLog) {
  const mins = cookDurationMinutes(cookLog);
  const weight = parseFloat(cookLog.weightIn);
  if (!mins || !weight) return null;
  return mins / weight;
}

export function moistureLossPct(cookLog) {
  const wIn = parseFloat(cookLog.weightIn);
  const wOut = parseFloat(cookLog.weightOut);
  if (!wIn || !wOut) return null;
  return Math.round(((wIn - wOut) / wIn) * 1000) / 10;
}

// ── Personal records, per protein ──
// Fastest (lowest min/lb), biggest single cook (highest weightIn), highest-
// rated (avg of family + own ratings), highest max smoker temp reached.
export function computePRs(cookLogs) {
  const byProtein = {};
  cookLogs.forEach((c) => {
    const protein = (c.protein || 'other').trim();
    if (!byProtein[protein]) byProtein[protein] = [];
    byProtein[protein].push(c);
  });

  const prs = {};
  Object.entries(byProtein).forEach(([protein, logs]) => {
    const withRate = logs.filter((c) => minutesPerPound(c) != null);
    const withWeight = logs.filter((c) => parseFloat(c.weightIn) > 0);
    const withMaxTemp = logs.filter((c) => parseFloat(c.maxSmokerTemp) > 0);

    prs[protein] = {
      fastest: withRate.length
        ? withRate.reduce((a, b) => (minutesPerPound(a) < minutesPerPound(b) ? a : b))
        : null,
      biggest: withWeight.length
        ? withWeight.reduce((a, b) => (parseFloat(a.weightIn) > parseFloat(b.weightIn) ? a : b))
        : null,
      hottest: withMaxTemp.length
        ? withMaxTemp.reduce((a, b) => (parseFloat(a.maxSmokerTemp) > parseFloat(b.maxSmokerTemp) ? a : b))
        : null,
      count: logs.length
    };
  });
  return prs;
}

// Rough starting-point rates (min/lb) for a protein with no cook history yet.
// Once real cooks exist for that protein, the historical average takes over.
const DEFAULT_RATES = {
  brisket: 90,
  'pork shoulder': 100,
  'pork butt': 100,
  ribs: 60,
  chicken: 35,
  turkey: 40
};

// Reverse-planner: given a target "done by" time, a protein, and a target
// weight, estimates when to start -- using this protein's own historical
// average min/lb if there's cook history, falling back to a rough industry
// default otherwise. Always a starting estimate, not a guarantee -- stalls
// and weather vary.
export function estimateStartTime(cookLogs, protein, weightLbs, doneByISOString) {
  const key = (protein || '').trim().toLowerCase();
  const matching = cookLogs.filter(
    (c) => (c.protein || '').trim().toLowerCase() === key && minutesPerPound(c) != null
  );

  let rate;
  let source;
  if (matching.length > 0) {
    rate = matching.reduce((sum, c) => sum + minutesPerPound(c), 0) / matching.length;
    source = `your own average across ${matching.length} past ${key} cook${matching.length === 1 ? '' : 's'}`;
  } else {
    rate = DEFAULT_RATES[key] || 75;
    source = 'a rough industry-standard starting point (no cook history yet for this protein)';
  }

  const totalMinutes = rate * (parseFloat(weightLbs) || 0);
  // Build in a buffer for rest time (~45 min) since "done" usually means
  // rested and ready to eat, not just off the heat.
  const restBufferMinutes = 45;
  const doneBy = new Date(doneByISOString);
  const startTime = new Date(doneBy.getTime() - (totalMinutes + restBufferMinutes) * 60000);

  return {
    startTime,
    estimatedCookMinutes: Math.round(totalMinutes),
    rateUsed: Math.round(rate * 10) / 10,
    source
  };
}
