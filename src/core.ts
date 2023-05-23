/* eslint-disable @typescript-eslint/naming-convention */
import axios from "axios";
import { Conversation, LLM, LLMCoreInterface, LLMHistoryEntry, LLMSession, LLMSettings, Message } from "./types";
import * as vscode from 'vscode';
import { log } from "./logger";

export interface GPTChatMessage {
    role: string;
    content: string;
}

export interface GPT4Conversation {
    model: string;
    messages: GPTChatMessage[];
    max_tokens?: number;
    top_p?: number;
    temperature?: number;
    stream?: boolean;
    apikey?: string;
}

class GPT4Core implements LLMCoreInterface, LLM {
    name = "gpt4";
    settings = {
        key: '',
        temperature: 0.7,
        max_tokens: 2048,
        topP: 1
    };
    history: LLMHistoryEntry[] = [];
    async sendRequest(request: Conversation): Promise<LLMSession> {
        // get the openAI key from settings
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
                log(`Chat completion: ${response.data.choices[0].message.content}`);
                res = response.data.choices[0].message.content;
                this.registerHistory({
                    prompt: request.messages[request.messages.length - 1],
                    response: res,
                    settings: request.settings,
                });
            } else {
                // we show an error notification if the response is empt
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
    async streamRequest(request: Conversation, onUpdate: (response: Message) => void, onComplete: () => void) {
        try {
            const query = this._getConversationObject(request);
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
    private _getOpenAIKey(): string {
        const config = vscode.workspace.getConfiguration('puck.core');
        return config.get('apikey') || '';
    }
    private _getConversationObject = (request: Conversation): GPT4Conversation => {
        return {
            model: "gpt-4",
            temperature: request.settings.temperature,
            max_tokens: request.settings.maxTokens,
            messages: request.messages.map(m => ({
                role: m.role,
                content: m.content
            })) as any,
            top_p: request.settings.topP,
        };
    };
    configure = (settings: object): void => {
        this.settings = {
            ...this.settings,
            ...settings,
        };
    };
    registerHistory = (historyEntry: object): void => {
        this.history.push(historyEntry as LLMHistoryEntry);
        const config = vscode.workspace.getConfiguration('puck.core');
        const history: any = config.get('history') || {
            entries: [],
        };
        if(!history.entries) { history.entries = []; }
        history.entries.push(historyEntry);
        config.update('history', history, true);
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