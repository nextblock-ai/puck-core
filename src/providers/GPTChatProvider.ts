import axios from 'axios';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GPTChatConversation, GPTChatMessage } from '../types';
import ConversationManager from '../manager/ConversationManager';

const persomDelimiter = "👤";
const assistantDelimiter = "🤖";
const systemDelimiter = "🌐";

export class GPTChatProvider {
    private conversationManager: ConversationManager;
    private activeConversation: GPTChatConversation | null = null;

    constructor(private historyFileName: string = 'history.json') {
        this.conversationManager = ConversationManager.getInstance(this.getHistoryFilePath());
        vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceChange.bind(this));
    }

    private getHistoryFilePath() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        return path.join(workspaceFolder || '', this.historyFileName);
    }

    private onWorkspaceChange() {
        this.conversationManager = ConversationManager.getInstance(this.getHistoryFilePath());
        this.activeConversation = null;
    }

    private validateTokenCount(conversation: GPTChatConversation) {
        const totalTokens = conversation.messages.reduce((total, message) => {
            return total + GPTChatProvider.countTokens(message.content);
        }, 0);
        const responseSize = 8192 - totalTokens;
        conversation.max_tokens = responseSize > 2048 ? 2048 : responseSize;
        if (conversation.max_tokens < 1) { throw new Error('No tokens left'); }
        return conversation;
    }

    protected async sendQuery(query: GPTChatConversation): Promise<string> {

        // get the api key from settings
        const config = vscode.workspace.getConfiguration('puck-core');
        const apikey = config.get('apikey') as string;
        delete query.apikey;

        // validate the token count
        query = this.validateTokenCount(query);

        try {
            // send the query to the GPT API
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                JSON.stringify(query), {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apikey}`,
                },
            });
            // return the response
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            } else { throw new Error('No completion found'); }

        } catch (error: any) {
            vscode.window.showErrorMessage('Error: ' + error.message);
            throw error;
        }
    }

    async streamQuery(query: GPTChatConversation, onUpdate: (data: any) => void, onComplete: (data: any) => void): Promise<string> {
        // get the api key from settings
        const config = vscode.workspace.getConfiguration('puck-core');
        const apikey = config.get('apikey') as string;

        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                query, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apikey}`,
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
                onComplete(null);
            });
            response.data.on('error', (error: any) => {
                onComplete(error);
            });
            return output;
        } catch (error: any) {
            vscode.window.showErrorMessage('Error: ' + error.message);
            throw error;
        }
    }


    // start a new conversation
    public async startConversation(prompt: string): Promise<GPTChatConversation> {
        const conversation: GPTChatConversation = {
            model: "gpt-4",
            temperature: 0.9,
            max_tokens: 2048,
            messages: [
                {
                    role: 'system',
                    content: prompt,
                },
            ],
        };
        this.activeConversation = conversation;
        return conversation;
    }

    public saveConversationHistory(prompt: string, response: string, settings: any) {
        let conversationHistory: any = this.conversationManager.getConversationHistory();
        conversationHistory = [...conversationHistory, {
            prompt: prompt,
            response: response,
            settings: settings
        }];
        this.conversationManager.setConversationHistory(conversationHistory);

    }

    public async sendMessageToActiveConversation(inputText: string): Promise<GPTChatMessage[]> {
        if (!this.activeConversation) {
            throw new Error('No active conversation found. Please start a conversation first.');
        }

        const addToMessages = (role: any, content: string) =>
        this.activeConversation && this.activeConversation.messages.push({ role, content });
        // add the user message to the conversation object
        if (inputText) { addToMessages('user', inputText);  }
        // send the query to the GPT API
        const result = await this.sendQuery(this.activeConversation);
        
        // add the response to the conversation object
        addToMessages('assistant', result);

        // save the conversation to the history file
        this.saveConversationHistory(inputText, result, {
            key: 'gpt-4',
            temperature: this.activeConversation.temperature,
            maxTokens: this.activeConversation.max_tokens,
        });

        // return the conversation object
        return this.activeConversation.messages;
    }

    public async endConversation() {
        this.activeConversation = null;
    }

    public static countTokens(text: string) {
        // GPT-3 uses byte-pair encoding (BPE) with a vocabulary of 50,257 tokens
        // Splitting by whitespace is a simple approximation for counting tokens
        const tokens = text.split(/\s+/);
        return tokens.length;
    }

    public async streamConversation(inputText: string, onUpdate: (data: any) => void, onComplete: (data: any) => void) {
        if (!this.activeConversation) {
            throw new Error('No active conversation found. Please start a conversation first.');
        }
        // add the user message to the conversation object
        const addToMessages = (role: any, content: string) =>
            this.activeConversation && this.activeConversation.messages.push({ role, content });
        // add the user message to the conversation object
        if (inputText) { addToMessages('user', inputText); }
        // send the query to the GPT API
        const result = await this.streamQuery(this.activeConversation, onUpdate, onComplete);
        // add the response to the conversation object
        addToMessages('assistant', result);

        // save the conversation to the history file
        this.saveConversationHistory(inputText, result, {
            key: 'gpt-4',
            temperature: this.activeConversation.temperature,
            maxTokens: this.activeConversation.max_tokens,
        });

        // return the conversation object
        return this.activeConversation.messages;
    }

    public static activate(context: vscode.ExtensionContext) {
        const provider = new GPTChatProvider();
        context.subscriptions.push(
            // register the provider
            vscode.commands.registerCommand('puck-core.startConversation', async () => {
                const prompt = await vscode.window.showInputBox({
                    prompt: 'Enter a prompt to start the conversation',
                    placeHolder: 'Hello, how are you?',
                });
                if (prompt) {
                    const conversation = await provider.startConversation(prompt);
                }
            }),
            vscode.commands.registerCommand('puck-core.sendMessage', async () => {
                const inputText = await vscode.window.showInputBox({
                    prompt: 'Enter a message to send',
                    placeHolder: 'Hello, how are you?',
                });
                if (inputText) {
                    await provider.sendMessageToActiveConversation(inputText);
                }
            }),
            vscode.commands.registerCommand('puck-core.endConversation', async () => {
                await provider.endConversation();
            }),
            vscode.commands.registerCommand('puck-core.showHistory', async () => {
                const historyFilePath = provider.getHistoryFilePath();
                if (fs.existsSync(historyFilePath)) {
                    const history = JSON.parse(fs.readFileSync(historyFilePath, 'utf-8'));
                    const historyText = history.map((conversation: GPTChatConversation) => {
                        const messages = conversation.messages.map((message: GPTChatMessage) => {
                            const role = message.role === 'user' ? persomDelimiter : assistantDelimiter;
                            return `${role} ${message.content}`;
                        });
                        return messages.join('\n');
                    }).join('\n\n');
                    const historyDocument = await vscode.workspace.openTextDocument({
                        content: historyText,
                        language: 'plaintext',
                    });
                    await vscode.window.showTextDocument(historyDocument);
                } else {
                    vscode.window.showErrorMessage('No history found');
                }
            }),
        );
    }
}