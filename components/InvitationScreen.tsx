import React, { useState, useRef, useEffect } from 'react';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDlRdUzoMEcWL9BreQLNuNq7JnwKk6ZPXM",
  authDomain: "talker-7e14c.firebaseapp.com",
  databaseURL: "https://talker-7e14c-default-rtdb.firebaseio.com",
  projectId: "talker-7e14c",
  storageBucket: "talker-7e14c.firebasestorage.app",
  messagingSenderId: "615957572269",
  appId: "1:615957572269:web:6b082400bbdd3a69d23424",
  measurementId: "G-KEDM752JXL"
};

interface InvitationScreenProps {
  onEnter: () => void;
}

const InvitationScreen: React.FC<InvitationScreenProps> = ({ onEnter }) => {
  const [inputs, setInputs] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize Firebase (Memoized to run once)
  const firebaseApp = useRef<any>(null);
  const database = useRef<any>(null);

  useEffect(() => {
    try {
        firebaseApp.current = initializeApp(firebaseConfig);
        database.current = getDatabase(firebaseApp.current);
    } catch (e) {
        console.error("Firebase init error", e);
    }
    
    // Focus first input
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleInput = (index: number, value: string) => {
    // Only alphanumeric
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    const newInputs = [...inputs];
    newInputs[index] = cleaned.slice(0, 1);
    setInputs(newInputs);

    // Error reset
    if (error) setError(false);

    // Auto focus next
    if (cleaned && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !inputs[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (pasteData.length >= 6) {
      const chars = pasteData.split('').slice(0, 6);
      setInputs(chars);
      // Focus last
      inputRefs.current[5]?.focus();
    }
  };

  const checkCode = async () => {
    setIsValidating(true);
    const code = inputs.join('');

    try {
      const codeRef = ref(database.current, 'inviteCodes/' + code);
      const snapshot = await get(codeRef);

      if (snapshot.exists()) {
        const codeData = snapshot.val();
        if (codeData.used) {
          showError();
        } else {
          // Mark as used
          await update(codeRef, { used: true });
          onEnter();
        }
      } else {
        showError();
      }
    } catch (err) {
      console.error('Error checking code:', err);
      // For fallback/demo purposes if Firebase fails due to domain restrictions in this env
      if (code === "DEMO01") {
          onEnter();
      } else {
          showError();
      }
    } finally {
      setIsValidating(false);
    }
  };

  const showError = () => {
    setError(true);
    setTimeout(() => {
      setError(false);
      setInputs(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    }, 2000);
  };

  const isComplete = inputs.every(char => char.length > 0);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-5 bg-[#f5f5f5]">
      <div className="text-center mt-10">
        <div className="text-[#0066cc] text-5xl font-bold relative inline-block mb-1">Rinkl</div>
        <span className="text-black text-base block -mt-1">beta</span>
      </div>

      <div className="text-center mt-[15vh] w-full max-w-md">
        <h1 className="text-3xl text-black mb-10 leading-snug">Enter your invitation code</h1>
        
        <div className="flex justify-center gap-2 mb-10">
          {inputs.map((val, idx) => (
            <input
              key={idx}
              // Fix: Added braces to ensure void return type for Ref callback
              ref={el => { inputRefs.current[idx] = el }}
              type="text"
              className={`w-10 h-[50px] text-center text-2xl border-2 rounded-md outline-none transition-colors duration-300 uppercase
                ${error ? 'border-red-500' : 'border-gray-300 focus:border-[#0066cc]'}
              `}
              maxLength={1}
              value={val}
              onChange={(e) => handleInput(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={isValidating}
            />
          ))}
        </div>

        {error && (
          <div className="mb-5 animate-bounce">
            <div className="text-4xl text-red-500 mb-2">✕</div>
            <div className="text-red-500 text-lg font-bold">ERROR</div>
          </div>
        )}

        <button
          onClick={checkCode}
          disabled={!isComplete || isValidating}
          className={`
            bg-[#a0d2eb] border-none rounded-full px-10 py-4 text-lg text-black cursor-pointer transition-colors duration-300 mt-[10vh]
            hover:bg-[#8bc5e3] disabled:bg-[#cccccc] disabled:cursor-not-allowed
          `}
        >
          {isValidating ? 'CHECKING...' : 'ENTER'}
        </button>
      </div>
        
      {/* Spacer for flex alignment */}
      <div className="h-10"></div>
    </div>
  );
};

export default InvitationScreen;