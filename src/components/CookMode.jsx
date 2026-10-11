import React, { useEffect, useRef, useState } from 'react';
import {
  X, ChevronLeft, ChevronRight, Volume2, VolumeX, ChefHat, Timer, Pause, Play,
  RotateCcw, ListChecks, Check, Slice
} from 'lucide-react';
import { parseStepDuration, formatDuration } from '../utils/parseStepDuration';

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

const PREP_WORDS = /\b(chopped|diced|minced|sliced|cubed|julienned|grated|zested|crushed|peeled|trimmed|quartered|halved|shredded)\b/i;

function needsPrep(text) {
  return PREP_WORDS.test(text || '');
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
  } catch {
    // Web Audio unavailable -- vibration (if supported) is still a signal
  }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}

// Remounted (via key={stepIndex} from the parent) every time the step
// changes, so its countdown always starts fresh rather than carrying over.
function StepTimer({ seconds }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  useEffect(() => {
    if (running && remaining === 0 && !done) {
      setDone(true);
      setRunning(false);
      beep();
    }
  }, [remaining, running, done]);

  return (
    <div className="cook-timer">
      <div className="cook-timer-display">
        <Timer size={16} />
        <span className="mono">{formatDuration(Math.max(0, remaining))}</span>
        {done && <span className="cook-timer-done">Time's up</span>}
      </div>
      <div className="cook-timer-actions">
        <button className="icon-btn" onClick={() => setRunning((r) => !r)} disabled={remaining === 0}>
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          className="icon-btn"
          onClick={() => {
            setRemaining(seconds);
            setRunning(false);
            setDone(false);
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}

function PrepScreen({ ingredients, checked, onToggle, onStartCooking, onClose }) {
  const prepCount = ingredients.filter((i) => needsPrep(typeof i === 'string' ? i : i.raw)).length;
  const allChecked = ingredients.length > 0 && checked.size === ingredients.length;

  return (
    <div className="cook-mode">
      <div className="cook-mode-header">
        <div className="cook-mode-title"><ChefHat size={18} /> Get ready</div>
        <button className="icon-btn" onClick={onClose} title="Exit cook mode">
          <X size={18} />
        </button>
      </div>

      <div className="cook-mode-body" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
        <div className="cook-step-count">Mise en place</div>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center', marginTop: 0 }}>
          Gather everything and knock out any chopping/dicing before you start cooking.
          {prepCount > 0 && ` ${prepCount} item${prepCount === 1 ? '' : 's'} below need${prepCount === 1 ? 's' : ''} prep work.`}
        </p>

        {ingredients.map((ing, idx) => {
          const text = typeof ing === 'string' ? ing : ing.raw;
          const prep = needsPrep(text);
          const isChecked = checked.has(idx);
          return (
            <div
              key={idx}
              className={`prep-item${isChecked ? ' prep-item-checked' : ''}`}
              onClick={() => onToggle(idx)}
            >
              <div className={`prep-checkbox${isChecked ? ' on' : ''}`}>{isChecked && <Check size={14} />}</div>
              <span style={{ flex: 1 }}>{text}</span>
              {prep && <Slice size={15} className="prep-knife" />}
            </div>
          );
        })}
      </div>

      <div className="cook-mode-nav">
        <button className="btn btn-primary cook-nav-btn" onClick={onStartCooking}>
          {allChecked ? "Let's cook" : 'Start cooking anyway'} <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

export default function CookMode({ recipe, ingredients, onClose }) {
  const steps = recipe.steps || [];
  const shownIngredients = ingredients || recipe.ingredients || [];
  const [phase, setPhase] = useState(shownIngredients.length > 0 ? 'prep' : 'cooking');
  const [checkedPrep, setCheckedPrep] = useState(() => new Set());
  const [index, setIndex] = useState(0);
  const [readAloud, setReadAloud] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const wakeLockRef = useRef(null);

  const togglePrepItem = (idx) => {
    setCheckedPrep((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Keep the screen awake while cooking, on devices that support it
  // (iOS 16.4+ Safari, most modern Android browsers). Silently does
  // nothing if unsupported -- no error shown, it just won't hold the screen on.
  useEffect(() => {
    if (!wakeLockSupported) return;

    const requestLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // ignore -- e.g. low battery mode can refuse this
      }
    };
    requestLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (phase === 'cooking' && readAloud && speechSupported && steps[index]) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(steps[index]);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, readAloud, phase]);

  const handleClose = () => {
    if (speechSupported) window.speechSynthesis.cancel();
    onClose();
  };

  if (steps.length === 0) return null;

  if (phase === 'prep') {
    return (
      <PrepScreen
        ingredients={shownIngredients}
        checked={checkedPrep}
        onToggle={togglePrepItem}
        onStartCooking={() => setPhase('cooking')}
        onClose={handleClose}
      />
    );
  }

  const isLast = index === steps.length - 1;
  const duration = parseStepDuration(steps[index]);

  return (
    <div className="cook-mode">
      <div className="cook-mode-header">
        <div className="cook-mode-title"><ChefHat size={18} /> {recipe.title}</div>
        <div className="cook-mode-actions">
          <button
            className={`icon-btn${showIngredients ? ' icon-btn-on' : ''}`}
            onClick={() => setShowIngredients((s) => !s)}
            title="Show ingredients"
          >
            <ListChecks size={18} />
          </button>
          {speechSupported && (
            <button className="icon-btn" onClick={() => setReadAloud((r) => !r)} title="Read steps aloud">
              {readAloud ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          <button className="icon-btn" onClick={handleClose} title="Exit cook mode">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="cook-mode-dots">
        {steps.map((_, i) => (
          <span key={i} className={`cook-dot${i === index ? ' active' : ''}${i < index ? ' done' : ''}`} />
        ))}
      </div>

      <div className="cook-mode-body">
        <div className="cook-step-count">Step {index + 1} of {steps.length}</div>
        <div className="cook-step-text">{steps[index]}</div>
        {duration != null && <StepTimer key={index} seconds={duration} />}
      </div>

      <div className="cook-mode-nav">
        <button
          className="btn btn-ghost cook-nav-btn"
          onClick={() => (index === 0 ? setPhase('prep') : setIndex((i) => Math.max(0, i - 1)))}
        >
          <ChevronLeft size={20} /> Back
        </button>
        {isLast ? (
          <button className="btn btn-primary cook-nav-btn" onClick={handleClose}>
            Done cooking 🎉
          </button>
        ) : (
          <button className="btn btn-primary cook-nav-btn" onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}>
            Next <ChevronRight size={20} />
          </button>
        )}
      </div>

      {showIngredients && (
        <div className="sheet-overlay" onClick={() => setShowIngredients(false)} style={{ zIndex: 210 }}>
          <div className="sheet glass-strong" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h2><ListChecks size={20} /> Ingredients</h2>
              <button className="icon-btn" onClick={() => setShowIngredients(false)}><X size={20} /></button>
            </div>
            {shownIngredients.map((ing, i) => (
              <div key={i} className="ingredient-line">{typeof ing === 'string' ? ing : ing.raw}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
