'use strict';

import * as vscode from 'vscode';
import * as outputLog from './manager/OutputLogManager';
import * as commands from './commands';

import AppFooterContent from './utils/AppFooterContent';
import SemanticAgentProvider from './providers/SemanticAgentProvider';

import { GPT4Core } from './core';
import { GPTChatProvider } from './providers/GPTChatProvider';

import * as ConversationManager from './manager/ConversationManager';
import { Conversation } from './types';

export async function activate(context: vscode.ExtensionContext) {

	outputLog.activate(context, 'puck.log');
	commands.activate(context);
	GPTChatProvider.activate(context);
	SemanticAgentProvider.activate(context);
	ConversationManager.activate(context);
	AppFooterContent.activate();

	const core = new GPT4Core();

	const convo: Conversation = {
		messages: [{
			role: 'system',
			content: 'Hello, how are you?',
		}],
		settings: {
			temperature: 0.9,
			maxTokens: 150,
			key: 'gpt-4',
		}
	};

	const response = await core.sendRequest(convo);
	console.log(response);

	return {
		core: core,
		SemanticAgentProvider: SemanticAgentProvider,
	}
	
}

