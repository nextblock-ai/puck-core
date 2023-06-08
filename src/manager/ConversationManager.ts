// acts to log conversation data to a conversations json file. 
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { log } from '../logger'
import * as crypto from 'crypto';
import { LLMHistoryEntry, LLMHistoryManager } from '../types';

/**
 * a manager for conversations
 */
export default class ConversationManager implements LLMHistoryManager {

    conversationsFile: string;
    _history: any[] = [];

    static _instance: ConversationManager;

    /**
     * create a new manager for conversations
     * @param conversationsFile 
     */
    private constructor(conversationsFile: string) {
        this.conversationsFile = conversationsFile;
        this._loadConversations();
    }

    /**
     * gett the singleton instance of the ConversationManager
     * @param conversationsFile 
     * @returns 
     */
    static getInstance(conversationsFile: string) {
        this._instance = new this(conversationsFile)
        return this._instance;
    }

    /**
     * get the conversations
     */
    get conversations() {
        if(!this.conversations) { this._loadConversations(); }
        return this._history;
    }

    /**
     * get the md5 hash of a string
     * @param str 
     * @returns 
     */
    private _md5hash(str: string) { return crypto.createHash('md5').update(str).digest('hex'); }
    
    /**
     * save the conversations to the conversations file
     */
    private _saveConversations() { fs.writeFileSync(this.conversationsFile, JSON.stringify(this._history, null, 4)); }
    
    /**
     * load the conversations from the conversations file
     */
    private _loadConversations() {
        try {
            this._history = JSON.parse(fs.readFileSync(this.conversationsFile).toString());
            log(`Loaded ${this.conversations.length} conversations from ${this.conversationsFile}`);
        } catch (e) {
            this._history = [];
        }
    }

    // save the conversation to the conversations file
    public setConversationHistory(conversation: LLMHistoryEntry[]) {
        const hash = this._md5hash(JSON.stringify(conversation) + JSON.stringify(conversation[0].settings));
        const existing = this._history.find(c => c.hash === hash);
        if(existing) { existing.count++; } else {
            this._history.push({ hash, conversation, count: 1 });
        }
        this._saveConversations();
    }

    public getConversationHistory(): LLMHistoryEntry[] {
        return this._history.map(c => c.conversation);
    }
}

export function activate(context: vscode.ExtensionContext) {
    if(!vscode.workspace.workspaceFolders) { return; }
    const projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const conversationsFile = path.join(projectPath, 'history.json');
    const instance = ConversationManager.getInstance(conversationsFile);
    // update conversatiohn manager when workspace is changed
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
        if(!vscode.workspace.workspaceFolders)  { return; }
        const projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const conversationsFile = path.join(projectPath, 'history.json');
        ConversationManager.getInstance(conversationsFile);
    });
    log('ConversationManager activated');
    return instance;
}

// Called when the extension is deactivated
export function deactivate() {
    // nothing to do
}