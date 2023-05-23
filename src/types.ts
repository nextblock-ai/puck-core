export interface Message {
    role: string;
    content: string;
}

export interface Conversation {
    messages: Message[];
    settings: LLMSettings;
}

export interface LLMSettings {
    key: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
}

export interface LLMSettingsMapping {
    [key: string]: LLMSettings;
}

export interface LLMHistoryEntry {
    prompt: Message;
    response: Message;
    settings: LLMSettings;
}

export interface LLMSession extends Conversation {
    llm: LLM;
}

export interface LLM {
    settings: LLMSettings;
    history: LLMHistoryEntry[];
}

export interface LLMCoreInterface {
    name: string;
    sendRequest(request: Conversation): Promise<Conversation>;
    streamRequest(request: Conversation, onUpdate: (response: Message) => void, onEnd: () => void): void;
    configure(settings: object): void;
    registerHistory(historyEntry: object): void;
}
