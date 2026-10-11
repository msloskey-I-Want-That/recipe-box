import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// A small mic button that appends dictated text to whatever the caller is
// editing. Renders nothing if this browser doesn't support speech
// recognition at all (notably unreliable on iOS Safari) so it never shows
// as a broken control.
export default function DictateButton({ onResult, className = '' }) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(!SpeechRecognitionAPI);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1];
      if (latest.isFinal) {
        onResult(latest[0].transcript.trim());
      }
    };
    recognition.onerror = () => {
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => recognition.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (unsupported) return null;

  const toggle = () => {
    if (!recognitionRef.current) {
      setUnsupported(true);
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        setUnsupported(true);
      }
    }
  };

  return (
    <button
      type="button"
      className={`dictate-btn${listening ? ' listening' : ''} ${className}`}
      onClick={toggle}
      title={listening ? 'Stop dictation' : 'Speak to add'}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} />}
      {listening ? 'Listening…' : 'Speak'}
    </button>
  );
}
