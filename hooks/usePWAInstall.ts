import { useState, useEffect } from 'react';

// This interface is needed because the default Event type doesn't include
// the properties specific to the BeforeInstallPromptEvent.
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export const usePWAInstall = () => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPrompt) {
            return;
        }

        // Show the install prompt
        installPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        // We can only use the prompt once, so we clear it.
        setInstallPrompt(null);
    };

    return { canInstall: !!installPrompt, install: handleInstallClick };
};
