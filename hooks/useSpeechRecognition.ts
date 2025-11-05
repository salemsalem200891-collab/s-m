
import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionHook {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = (): SpeechRecognitionHook => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (!SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ar-EG'; 

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                 setTranscript(finalTranscript);
            }
        };
        
        recognition.onend = () => {
            if (isListening) {
                recognition.start(); // Restart if it stops automatically and we still want to listen
            }
        };
        
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };


        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
        };
    }, [isListening]);

    const startListening = () => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    return { isListening, transcript, startListening, stopListening };
};
