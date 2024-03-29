'use strict';

import * as vscode from 'vscode';
import * as outputLog from './manager/OutputLogManager';
import * as commands from './commands';

import AppFooterContent from './utils/AppFooterContent';
import SemanticAgentProvider from './providers/SemanticAgentProvider';

import { GPT4Core } from './core';
import { GPTChatProvider } from './providers/GPTChatProvider';

import * as ConversationManager from './manager/ConversationManager';
import { runAIAssistant } from './worker';

export async function activate(context: vscode.ExtensionContext) {

	const manager = ConversationManager.activate(context);
	const gpt4Core = new GPT4Core(manager as any);
	outputLog.activate(context, 'puck.log');
	commands.activate(context);
	GPTChatProvider.activate(context);
	SemanticAgentProvider.activate(gpt4Core, context);
	AppFooterContent.activate();
	return {
		core: gpt4Core,
		appFooter: AppFooterContent.getInstance(),
		SemanticAgentProvider: SemanticAgentProvider,
		runAIAssistant: runAIAssistant
	}
	
}

