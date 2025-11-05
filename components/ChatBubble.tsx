
import React from 'react';
import { Message } from '../types';
import { BotIcon } from './icons/BotIcon';

interface ChatBubbleProps {
    message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
    const isBot = message.sender === 'bot';

    if (isBot && message.text === '...') {
        return (
            <div className="flex justify-start items-end space-x-2 space-x-reverse">
                 <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <BotIcon className="w-5 h-5 text-white" />
                </div>
                <div className="p-3 rounded-lg bg-gray-700/50 text-white">
                    <div className="flex space-x-1.5 space-x-reverse">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={`flex items-end gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
            {isBot && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <BotIcon className="w-5 h-5 text-white" />
                </div>
            )}
            <div
                className={`max-w-[80%] p-3 rounded-lg text-white ${isBot ? 'bg-gray-700/50 rounded-br-lg' : 'bg-blue-600/70 rounded-bl-lg'}`}
            >
                <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
        </div>
    );
};
