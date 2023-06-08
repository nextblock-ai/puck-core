import { ExtensionContext } from 'vscode';
import SemanticAgent from '../semantic/SemanticAgent';

// This class is a singleton
export default class SemanticAgentProvider {

    private core: any;
    private context: any;
    public semanticAgents: any[];
    private static instance: SemanticAgentProvider;

    /**
     * Constructor
     * @param core 
     * @param context 
     */
    private constructor(core: any, context: any) {
        this.semanticAgents = [];
        this.context = context;
        this.core = core;
    }

    /**
     * Create a new semantic agent
     * @param writeEmitter 
     * @returns 
     */
    public createSemanticAgent(projectRoot: string, writeEmitter: any): SemanticAgent {
        const semanticAgent = new SemanticAgent(this.core, projectRoot, writeEmitter);
        this.semanticAgents.push(semanticAgent);
        return semanticAgent;
    }

    /**
     * Activate the semantic agent provider
     * @param core 
     * @param context 
     * @returns 
     */
    public static activate(core: any, context: ExtensionContext): SemanticAgentProvider {
        if (!SemanticAgentProvider.instance) {
            SemanticAgentProvider.instance = new SemanticAgentProvider(core, context);
        }
        return SemanticAgentProvider.instance;
    }

    /**
     *  Get the instance of the semantic agent provider
     * @returns 
     */
    public static getInstance(): SemanticAgentProvider {
        return SemanticAgentProvider.instance;
    }

    /**
     * Deactivate the semantic agent provider
     */
    public deactivate() {
        this.semanticAgents.forEach((semanticAgent) => {
            semanticAgent.deactivate();
        });
    }
}
