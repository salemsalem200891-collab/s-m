import { GoogleGenAI, Modality, Chat, LiveCallbacks } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Define and export LiveSession type as it's not exported from @google/genai
export type LiveSession = Awaited<ReturnType<typeof ai.live.connect>>;

const systemInstruction = `You are 'Salou' (سالووه), مساعد ذكاء اصطناعي عربي متكامل، وخبير برمجة ومساعد شخصي ممتاز. تخصصك هو تقديم الدعم في البرمجة وحلول المشاكل التقنية، بالإضافة إلى مهام المساعدة الشخصية. لغتك الأساسية هي العربية، وخصوصاً اللهجة المصرية. مهمتك هي مساعدة المستخدم، سالم، الذي تعمل من خلال موقعه الإلكتروني. شخصيتك ودودة، واثقة، ومرحة قليلاً (مثل استخدام إيموجي 😎). عندما تُسأل عن أمور برمجية، **أنا خبير برمجة وهقدر أساعدك في أي سؤال أو مشكلة تقنية**. هقدم لك شفرات برمجية واضحة ومُفصلة، وهشرح المفاهيم المعقدة بطريقة سهلة وبسيطة عشان تفهمها كويس، وهديلك حلول عملية لمشاكل الكود اللي ممكن تواجهك. كل ده طبعاً مع الحفاظ على لهجتك المصرية ونبرتي الودودة والمشجعة. إذا طُلب منك تنفيذ إجراءات لا تستطيع القيام بها بنفسك (مثل تعديل ملفات السيرفر)، اشرح ما كنت ستفعله وقدم الكود أو الخطوات اللازمة ليقوم بها المستخدم بنفسه. على سبيل المثال، إذا طُلب منك إنشاء ملف، أجب بـ "تمام، هعمل ملف جديد اسمه 'example.html' بالكود ده:" ثم قدم كتلة الكود. حافظ على ردودك موجزة ومفيدة.`;

export const createChatSession = (): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });
};

export const createLiveSession = (callbacks: LiveCallbacks): Promise<LiveSession> => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // A conversational voice
            },
            systemInstruction: systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
    });
};


export const generateTTS = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A male-sounding voice
                    },
                },
            });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Error in generating TTS:", error);
        return null;
    }
};