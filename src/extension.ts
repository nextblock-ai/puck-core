'use strict';

import * as vscode from 'vscode';
import * as outputLog from './utils/outputLog';
import * as commands from './commands';
import constants from './constants';

import AppFooterContent from './utils/AppFooterContent';

import { GPT4Core } from './core';

export function activate(context: vscode.ExtensionContext) {

	outputLog.activate(context);
	commands.activate(context);
	AppFooterContent.activate();

	const core = new GPT4Core();

	// register the core send request command
	let commandDisposable = vscode.commands.registerCommand(
		constants['puck.core.sendRequest'].command,
		core.sendRequest
	);
	context.subscriptions.push(commandDisposable);

	// register the core stream request command
	commandDisposable = vscode.commands.registerCommand(
		constants['puck.core.streamRequest'].command,
		core.streamRequest
	);
	context.subscriptions.push(commandDisposable);
	
}

