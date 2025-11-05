import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '../types';
import { ChatBubble } from './ChatBubble';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';
import { BotIcon } from './icons/BotIcon';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
// Fix: Import LiveSession type from geminiService
import { createChatSession, generateTTS, createLiveSession, type LiveSession } from '../services/geminiService';
import { decode, decodeAudioData, blobToBase64, encode } from '../utils/audioUtils';
// Fix: Removed LiveSession from this import as it's not exported from the module.
import type { Chat } from '@google/genai';
import { StopIcon } from './icons/StopIcon';
import { VideoIcon } from './icons/VideoIcon';
import { EndCallIcon } from './icons/EndCallIcon';
import type { LiveServerMessage } from '@google/genai';
import { SalouAvatar } from './icons/SalouAvatar';

interface AssistantWidgetProps {
    closeWidget: () => void;
}

// Live Session Constants
const FRAME_RATE = 2; // Send 2 frames per second
const JPEG_QUALITY = 0.7;

// Local Storage Key
const LOCAL_STORAGE_KEY = 'salou_chat_history';


export const AssistantWidget: React.FC<AssistantWidgetProps> = ({ closeWidget }) => {
    // Initialize messages from local storage
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
            return savedMessages ? JSON.parse(savedMessages) : [];
        } catch (error) {
            console.error("Error loading chat history from local storage:", error);
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    // Live Session State
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [isBotSpeaking, setIsBotSpeaking] = useState(false);
    const [inputTranscript, setInputTranscript] = useState('');
    const [outputTranscript, setOutputTranscript] = useState('');
    const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const liveSessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const liveAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextAudioStartTimeRef = useRef<number>(0);

    const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();

    useEffect(() => {
        chatSessionRef.current = createChatSession();
    }, []);

    // Effect to save messages to local storage
    useEffect(() => {
        if (!isLiveMode && messages.length > 0) {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
            } catch (error) {
                console.error("Error saving chat history to local storage:", error);
            }
        }
    }, [messages, isLiveMode]);

    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const playNextInQueue = useCallback(() => {
        if (audioQueueRef.current.length > 0 && !currentAudioSourceRef.current) {
            setIsPlayingAudio(true);
            const audioBuffer = audioQueueRef.current.shift();

            if (!audioBuffer) {
                setIsPlayingAudio(false);
                return;
            }

            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const source = outputAudioContext.createBufferSource();
            currentAudioSourceRef.current = source;
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            source.onended = () => {
                currentAudioSourceRef.current = null;
                playNextInQueue();
            };
            source.start();
        } else if (audioQueueRef.current.length === 0 && !currentAudioSourceRef.current) {
             setIsPlayingAudio(false);
        }
    }, []);

    const handleStopAudio = () => {
        if (currentAudioSourceRef.current) {
            currentAudioSourceRef.current.onended = null;
            currentAudioSourceRef.current.stop();
            currentAudioSourceRef.current = null;
        }
        audioQueueRef.current = [];
        setIsPlayingAudio(false);
    };

    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;
        stopListening();
        const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const botMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: botMessageId, sender: 'bot', text: '...' }]);

        try {
            if (!chatSessionRef.current) throw new Error("Chat session not initialized");
            
            const stream = await chatSessionRef.current.sendMessageStream({ message: messageText });

            let fullBotResponseText = '';
            let sentenceBuffer = '';
            const sentenceEndings = /[.?!؟\n]/;

            const processAndPlaySentence = async (sentence: string) => {
                if (!sentence.trim()) return;
                try {
                    const audioData = await generateTTS(sentence);
                    if (audioData) {
                        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                        const decodedData = decode(audioData);
                        const buffer = await decodeAudioData(decodedData, outputAudioContext, 24000, 1);
                        audioQueueRef.current.push(buffer);
                        if (!currentAudioSourceRef.current) {
                            playNextInQueue();
                        }
                    }
                } catch (e) {
                    console.error("Error processing sentence for TTS:", e);
                }
            };
            
            for await (const chunk of stream) {
                const textChunk = chunk.text;
                fullBotResponseText += textChunk;
                sentenceBuffer += textChunk;

                setMessages(prev => prev.map(msg => 
                    msg.id === botMessageId ? { ...msg, text: fullBotResponseText } : msg
                ));
                
                let match;
                while ((match = sentenceBuffer.match(sentenceEndings))) {
                    const sentenceEndIndex = match.index! + 1;
                    const sentence = sentenceBuffer.substring(0, sentenceEndIndex);
                    sentenceBuffer = sentenceBuffer.substring(sentenceEndIndex);
                    processAndPlaySentence(sentence);
                }
            }

            if (sentenceBuffer.trim()) {
                await processAndPlaySentence(sentenceBuffer);
            }
            
            if (fullBotResponseText.trim() === '') {
                setMessages(prev => prev.filter(msg => msg.id !== botMessageId));
            }

        } catch (error) {
            console.error("Error sending message:", error);
            setMessages(prev => prev.map(msg => 
                msg.id === botMessageId ? { ...msg, text: "عذراً، حدث خطأ ما. حاول مرة أخرى." } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleMicClick = () => {
        if (isListening) {
            stopListening();
             if (input.trim()) {
                handleSendMessage(input);
            }
        } else {
            startListening();
        }
    };

    // Live Session Logic
    const startLiveConversation = async () => {
        setLiveStatus('connecting');
        setInputTranscript('');
        setOutputTranscript('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const liveCallbacks = {
                onopen: () => {
                    setLiveStatus('connected');
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0); // Float32Array
                        
                        // Convert Float32Array to Int16Array and then to base64
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            // Clamp the values to the Int16 range
                            int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768.0));
                        }
                        const base64Data = encode(new Uint8Array(int16.buffer));

                        liveSessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' } });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);

                    if (videoRef.current && canvasRef.current) {
                         frameIntervalRef.current = window.setInterval(() => {
                            const videoEl = videoRef.current!;
                            const canvasEl = canvasRef.current!;
                            const ctx = canvasEl.getContext('2d');
                            if (!ctx) return;
                            
                            canvasEl.width = videoEl.videoWidth;
                            canvasEl.height = videoEl.videoHeight;
                            ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                            
                            canvasEl.toBlob(async (blob) => {
                                if (blob) {
                                    const base64Data = await blobToBase64(blob);
                                    liveSessionPromiseRef.current?.then((session) => {
                                        session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                                    });
                                }
                            }, 'image/jpeg', JPEG_QUALITY);
                        }, 1000 / FRAME_RATE);
                    }
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        setOutputTranscript(prev => prev + message.serverContent!.outputTranscription!.text);
                    }
                    if (message.serverContent?.inputTranscription) {
                        setInputTranscript(prev => prev + message.serverContent!.inputTranscription!.text);
                    }
                    if (message.serverContent?.turnComplete) {
                        setInputTranscript('');
                        setOutputTranscript('');
                    }

                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (audioData && outputAudioContextRef.current) {
                        setIsBotSpeaking(true);
                        nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, outputAudioContextRef.current.currentTime);
                        const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputAudioContextRef.current.destination);
                        source.addEventListener('ended', () => {
                            liveAudioSourcesRef.current.delete(source);
                            if (liveAudioSourcesRef.current.size === 0) {
                                setIsBotSpeaking(false);
                            }
                        });
                        source.start(nextAudioStartTimeRef.current);
                        nextAudioStartTimeRef.current += audioBuffer.duration;
                        liveAudioSourcesRef.current.add(source);
                    }

                    if (message.serverContent?.interrupted) {
                        liveAudioSourcesRef.current.forEach(source => source.stop());
                        liveAudioSourcesRef.current.clear();
                        nextAudioStartTimeRef.current = 0;
                        setIsBotSpeaking(false);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setLiveStatus('error');
                    stopLiveConversation();
                },
                onclose: () => {
                   stopLiveConversation();
                },
            };

            liveSessionPromiseRef.current = createLiveSession(liveCallbacks);
            setIsLiveMode(true);
        } catch (error) {
            console.error('Failed to start live session:', error);
            setLiveStatus('error');
        }
    };

    const stopLiveConversation = () => {
        liveSessionPromiseRef.current?.then(session => session.close());
        liveSessionPromiseRef.current = null;

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        liveAudioSourcesRef.current.clear();
        nextAudioStartTimeRef.current = 0;
        setIsBotSpeaking(false);
        
        setIsLiveMode(false);
        setLiveStatus('idle');
    };
    
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (isLiveMode) {
                stopLiveConversation();
            }
        };
    }, [isLiveMode]);


    return (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-8 sm:left-8 sm:w-[400px] sm:h-[600px] sm:max-h-[90vh] flex flex-col z-50">
            <div className="flex-grow flex flex-col bg-white/30 backdrop-blur-2xl border border-white/20 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b border-white/20 bg-black/10">
                    <div className="flex items-center space-x-3 space-x-reverse">
                        <BotIcon className="w-8 h-8 text-white" />
                        <h2 className="text-xl font-bold text-white">سالووه (Salou)</h2>
                    </div>
                    <button onClick={isLiveMode ? stopLiveConversation : closeWidget} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
                </header>
                
                <div className={`flex-1 overflow-y-auto space-y-4 relative ${!isLiveMode ? 'p-4' : ''}`}>
                    {!isLiveMode && messages.map((msg) => (
                        <ChatBubble key={msg.id} message={msg} />
                    ))}
                    <div ref={messagesEndRef} />

                    {isLiveMode && (
                         <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900 flex flex-col items-center justify-center p-4">
                            <div className="flex-grow flex items-center justify-center">
                                <SalouAvatar isTalking={isBotSpeaking} />
                            </div>

                            <video ref={videoRef} autoPlay playsInline muted className="absolute bottom-28 sm:bottom-24 right-4 w-32 h-24 md:w-40 md:h-30 object-cover rounded-lg border-2 border-white/50 transform scaleX-[-1] shadow-lg"></video>
                            <canvas ref={canvasRef} className="hidden"></canvas>
                            
                            <div className="absolute bottom-16 left-0 right-0 h-12 text-white text-center bg-gradient-to-t from-black/50 to-transparent flex items-end justify-center pb-2">
                                {liveStatus === 'connected' && (
                                    <div className="w-full px-4">
                                    <p className="font-bold text-md truncate" style={{textShadow: '1px 1px 3px #000'}}>{outputTranscript || "..."}</p>
                                    <p className="text-gray-300 text-sm truncate" style={{textShadow: '1px 1px 3px #000'}}>{inputTranscript}</p>
                                    </div>
                                )}
                            </div>
                            {liveStatus === 'connecting' && <p className="absolute bottom-20 text-white">...جاري الاتصال</p>}
                            {liveStatus === 'error' && <p className="absolute bottom-20 text-white">حدث خطأ في الاتصال</p>}
                        </div>
                    )}
                </div>
                
                {isLiveMode ? (
                     <footer className="p-4 bg-transparent absolute bottom-0 left-0 right-0 z-10">
                        <div className="flex justify-center">
                            <button onClick={stopLiveConversation} className="p-4 bg-red-600 rounded-full text-white shadow-lg hover:bg-red-700 transition-colors">
                                <EndCallIcon className="w-8 h-8"/>
                            </button>
                        </div>
                     </footer>
                ): (
                    <footer className="p-4 bg-black/10">
                        <div className="flex items-center bg-white/20 rounded-full p-2">
                            <button
                                onClick={handleMicClick}
                                className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-500 text-white'}`}
                            >
                                <MicIcon className="w-6 h-6" />
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(input)}
                                placeholder="اكتب رسالتك أو استخدم المايك..."
                                className="flex-1 bg-transparent border-none text-white placeholder-white/70 px-4 focus:outline-none"
                                dir="rtl"
                            />
                            <button onClick={startLiveConversation} className="p-2 rounded-full bg-green-500 text-white mr-2">
                                <VideoIcon className="w-6 h-6" />
                            </button>
                            {isPlayingAudio ? (
                                <button
                                    onClick={handleStopAudio}
                                    className="p-2 rounded-full bg-red-600 text-white"
                                    aria-label="Stop audio"
                                >
                                    <StopIcon className="w-6 h-6" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSendMessage(input)}
                                    disabled={isLoading}
                                    className="p-2 rounded-full bg-blue-500 text-white disabled:bg-gray-400"
                                    aria-label="Send message"
                                >
                                    <SendIcon className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
};