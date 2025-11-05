import React, { useState, useEffect } from 'react';
import { AssistantWidget } from './components/AssistantWidget';
import { BotIcon } from './components/icons/BotIcon';
import { InstallIcon } from './components/icons/InstallIcon';
import { generateTTS } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import { usePWAInstall } from './hooks/usePWAInstall';

const App: React.FC = () => {
    const [isWidgetOpen, setIsWidgetOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [welcomeAudio, setWelcomeAudio] = useState<AudioBuffer | null>(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(true);
    const { canInstall, install } = usePWAInstall();

    const playAudioBuffer = (audioBuffer: AudioBuffer | null) => {
        if (!audioBuffer) return;
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputAudioContext.destination);
        source.start();
    };
    
    useEffect(() => {
        const prepareWelcomeAudio = async () => {
            try {
                const welcomeText = "أهلاً يا سالم، جاهز نبدأ الشغل النهارده؟";
                const audioData = await generateTTS(welcomeText);
                if (audioData) {
                    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                    const decodedData = decode(audioData);
                    const buffer = await decodeAudioData(decodedData, outputAudioContext, 24000, 1);
                    setWelcomeAudio(buffer);
                }
            } catch (error) {
                console.error("Failed to generate welcome audio:", error);
            } finally {
                setIsLoadingAudio(false);
            }
        };

        prepareWelcomeAudio();
    }, []);

    const handleInitialize = () => {
        setIsInitialized(true);
        playAudioBuffer(welcomeAudio);
        setIsWidgetOpen(true);
    };

    if (!isInitialized) {
        return (
            <div className="bg-gray-900 text-white w-screen h-screen flex items-center justify-center bg-cover bg-center" style={{backgroundImage: "url('https://picsum.photos/1920/1080')"}}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
                <div className="relative text-center z-10 p-8 bg-black/30 rounded-2xl shadow-lg">
                    <h1 className="text-4xl font-bold mb-4">مساعد الذكاء الاصطناعي سالووه</h1>
                    <p className="text-lg text-gray-300 mb-8">مساعدك الشخصي لإدارة وتطوير موقعك.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handleInitialize}
                            disabled={isLoadingAudio}
                            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-full shadow-lg hover:scale-105 transform transition-transform duration-300 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isLoadingAudio ? "...جاري التحميل" : "ابدأ مع سالووه"}
                        </button>
                        {canInstall && (
                            <button
                                onClick={install}
                                className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold rounded-full shadow-lg hover:scale-105 transform transition-transform duration-300"
                                aria-label="Install App"
                            >
                                <InstallIcon className="w-5 h-5" />
                                <span>تثبيت التطبيق</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-100 dark:bg-gray-900 w-screen h-screen" style={{backgroundImage: "url('https://picsum.photos/1920/1080?grayscale')", backgroundSize: 'cover'}}>
             <div className="absolute inset-0 bg-black/30"></div>
            {isWidgetOpen ? (
                <AssistantWidget closeWidget={() => setIsWidgetOpen(false)} />
            ) : (
                <button
                    onClick={() => setIsWidgetOpen(true)}
                    className="fixed bottom-8 left-8 bg-gradient-to-br from-blue-500 to-indigo-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform duration-300 animate-pulse"
                    aria-label="Open Salou Assistant"
                >
                    <BotIcon className="w-8 h-8" />
                </button>
            )}
        </div>
    );
};

export default App;