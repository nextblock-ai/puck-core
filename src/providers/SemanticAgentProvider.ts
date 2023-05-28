import { ExtensionContext } from 'vscode';
import { SemanticAgent } from '../semantic/SemanticAgent';

export default class SemanticAgentProvider {

    private context: ExtensionContext;
    public semanticAgents: any[];
    private static instance: SemanticAgentProvider;

    private constructor(context: ExtensionContext) {
        this.semanticAgents = [];
        this.context = context;
    }

    public createSemanticAgent(writeEmitter: any): SemanticAgent {
        const semanticAgent = new SemanticAgent(this.context, writeEmitter);
        this.semanticAgents.push(semanticAgent);
        return semanticAgent;
    }

    public static activate(context: ExtensionContext): SemanticAgentProvider {
        if (!SemanticAgentProvider.instance) {
            SemanticAgentProvider.instance = new SemanticAgentProvider(context);
        }
        return SemanticAgentProvider.instance;
    }

    public static getInstance(): SemanticAgentProvider {
        return SemanticAgentProvider.instance;
    }

    public deactivate() {
        this.semanticAgents.forEach((semanticAgent) => {
            semanticAgent.deactivate();
        });
    }
}
