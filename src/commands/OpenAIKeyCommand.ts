/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Command } from "./Command";
import constants from "../constants";

// set the OpenAI key
export default class SetOpenAIKeyCommand extends Command {
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(commandId, title, context);
        const commandDisposable = this.commands.registerCommand(
            constants['puck-core.getOpenAIKey'].command,
            this._getOpenAIKey, 
            this
        );
        context.subscriptions.push(commandDisposable);
    }

    // gather the user's open ai key from them and save it
    async execute() {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API key',
            ignoreFocusOut: true,
            password: true,
        });
        if (apiKey) {
            this.setOpenAIKey(apiKey);
            vscode.window.showInformationMessage('OpenAI API key saved successfully');
        } else {
            vscode.window.showErrorMessage('Invalid API key. Please try again');
        }
    }

    private _getOpenAIKey(): string {
        const config = vscode.workspace.getConfiguration('puck-core');
        return config.get('apikey') || '';
    }
    
    // set the OpenAI key
    async setOpenAIKey(openAIKey: string): Promise<void> {
        try {
            await vscode.workspace.getConfiguration('puck-core').update('apikey', openAIKey, vscode.ConfigurationTarget.Global);
            const config = vscode.workspace.getConfiguration('puck-core');
            if (config.has('apikey')) {
                vscode.window.showInformationMessage('OpenAI API key saved successfully');
            } else {
                vscode.window.showErrorMessage('Failed to save OpenAI API key');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error updating configuration: ${error.message}`);
        }
    }
}
