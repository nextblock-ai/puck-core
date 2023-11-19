/* eslint-disable @typescript-eslint/naming-convention */
import axios from "axios";
import { Conversation, LLM, LLMCoreInterface, LLMHistoryEntry, LLMSession, LLMSettings, Message } from "./types";
import * as vscode from 'vscode';
import { log } from "./logger";
import { GPTChatConversation } from "./types";
import ConversationManager  from "./manager/ConversationManager";

// GPT-4 Core class that implemnets LLMCoreInterface
class GPT4Core implements LLMCoreInterface, LLM {
    name = "gpt4";
    manager: ConversationManager;
    settings = {
        key: '',
        temperature: 1,
        max_tokens: 2048,
        top_p: 1
    };
    history: LLMHistoryEntry[] = [];

    constructor(convwersationManager: ConversationManager) {
        this.manager = convwersationManager;
    }

    getApiKey(): string {
        return this._getOpenAIKey();
    }

    // Send request to GPT-4 and receive a response
    async sendRequest(request: Conversation): Promise<LLMSession> {
        const query = this._getConversationObject(request);
        let res;
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                JSON.stringify(query), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._getOpenAIKey()}`,
                },
            }
            );
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                log(`${response.data.choices[0].message.content}`);
                res = response.data.choices[0].message.content;
                this.registerHistory({
                    prompt: request.messages[request.messages.length - 1],
                    response: res,
                    settings: request.settings,
                });
            } else {
                throw new Error('No completion found');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage('Error: ' + error.message);
            throw error;
        }
        return {
            llm: this,
            settings: request.settings,
            messages: [
                ...request.messages,
                {
                    role: "assistant",
                    content: res
                },
            ],
        };
    };

    // Send streaming request to GPT-4, with onUpdate and onComplete callbacks handling the response
    async streamRequest(request: Conversation, onUpdate: (response: Message) => void, onComplete: () => void) {
        try {
            const query = this._getConversationObject(request);
            const latestMessage = request.messages[request.messages.length - 1];
            log(`Sent stream request: ${latestMessage.content || ''}`); // <-- Add this line to log the stream request being sent

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                query, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this._getOpenAIKey()}`,
                },
                responseType: 'stream',
            }
            );

            let output = '';
            response.data.on('data', (chunk: any) => {
                const parsedData = JSON.parse(chunk.toString());
                onUpdate(parsedData);
                if (parsedData.choices && parsedData.choices.length > 0) {
                    output += parsedData.choices[0].message.content;
                }
            });
            response.data.on('end', () => {
                onComplete();
            });
            response.data.on('error', (error: any) => {
                onComplete();
            });
        } catch (error: any) {
            vscode.window.showErrorMessage('Error: ' + error.message);
            throw error;
        }
    }

    // Get the OpenAI API key from the extension settings
    private _getOpenAIKey(): string {
        const config = vscode.workspace.getConfiguration('puck-core');
        return config.get('apikey') || '';
    }

    // Convert a Conversation object into a GPT4Conversation object
    private _getConversationObject = (request: Conversation): GPTChatConversation => {
        return {
            model: "gpt-4",
            temperature: (request.settings && request.settings.temperature) || 1,
            max_tokens: (request.settings && request.settings.maxTokens ) || 2048,
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content
            })) as any,
            top_p: (request.settings && request.settings.topP) || 1,
        };
    };

    // Update the settings for GPT-4
    configure = (settings: object): void => {
        this.settings = {
            ...this.settings,
            ...settings,
        };
    };

    // Register a history entry in the extension settings
    registerHistory = (historyEntry: object): void => {
        this.history.push(historyEntry as LLMHistoryEntry);
        let history: any = this.manager.getConversationHistory();
        if (!history) { history = []; }
        history.push(historyEntry);
        this.manager.setConversationHistory(history);
    };
}

class LLMCoreManager {
    private _cores: { [key: string]: LLMCoreInterface } = {};
    registerCore(core: LLMCoreInterface): void {
        this._cores[core.name] = core;
    }
    getCore(name: string): LLMCoreInterface | undefined {
        return this._cores[name];
    }
}

const LLMManagerInstance = new LLMCoreManager();

export { LLMCoreInterface, GPT4Core, LLMManagerInstance };