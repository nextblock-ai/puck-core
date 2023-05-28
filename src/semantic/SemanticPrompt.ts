/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Ohm from 'ohm-js';
import * as vscode from 'vscode';
import { GPTChatProvider } from '../providers/GPTChatProvider';

function _getProjectFolder(): string | undefined {
	const folders = vscode.workspace.workspaceFolders;
	if (folders) {
		return folders[0].uri.fsPath;
	}
	return undefined;
}

// a semantic prompt structure - consists of a prompt, a grammar file, and semantic action handler
export abstract class SemanticPrompt extends GPTChatProvider {

	protected prompt?: string; // the initial prompt. sent by the system user
	protected inputBuffer: any[];
	protected _executing: boolean;
	private _llmOptions: any;
	protected response?: string;

	protected responders: SemanticResponder[] = [];
	protected semanticActionHandler?: SemanticActionHandler;

	// prompt and grammar file are required
	constructor(llmOptions = {
		model: 'gpt-4',
		temperature: 0.9,
		max_tokens: 2048,
		top_p: 1,
		messages: []
	}) {
		super();
		this.inputBuffer = [];
		this._executing = false;
		this._llmOptions = llmOptions;
	}

	// add a message to the input buffer to send to the LLM
	addMessageToInputBuffer(message: any): void { this.inputBuffer.push(message); }
	clearInputBuffer(): void { this.inputBuffer = []; }
	interrupt(): void { this._executing = false; }

	// perform a single iteration of the SPS
	protected async iterate(semanticActionHandler: SemanticActionHandler): Promise<any> {
		this.semanticActionHandler = semanticActionHandler;

		if(this.inputBuffer.length === 0) {
			console.log('No input buffer');
			this.interrupt();
			return;
		}
		// get a count of the number of tokens in the input buffer
		const tokenCount = GPTChatProvider.countTokens(this.inputBuffer.map((message) => message.content).join(' '));
		let maxTokens = 8192 - tokenCount; // calculate max tokens we can send to the LLM
		if (maxTokens > 2048) { maxTokens = 2048; } // max tokens is 2048
		if (maxTokens < 10) { // less than 10 tokens left, throw an error
			throw new Error('Input buffer exceeds maximum token count');
		}

		// create a copy of the LLM options and set the max tokens
		// then set the messages to send to the LLM to the input buffer
		const options = JSON.parse(JSON.stringify(this._llmOptions));
		options.max_tokens = maxTokens;
		options.messages = [{
			role: 'system',
			content: this.prompt
		}, ...this.inputBuffer.map((message) => ({
			role: message.role,
			content: message.content
		}))];

		if(!this._ohmParser) {
			//const semanticActions = this.createSemanticActions(this.responders.filter(e => !e.exclude)); // Use the new createSemanticActions function
			this._semantics = this.grammar.createSemantics();
			this._ohmParser = this._semantics.addOperation(
				"toJSON",
				this.semanticActionHandler
			);
		}

		// perform the query
		let rresp, retries = 0;
		this.response = await this.sendQuery(options);

		// add the response to the input buffer
		this.response += '\n';
		try {
			if (!this.grammar) {
				throw new Error('No grammar loaded');
			}
			const match = this.grammar.match(this.response);
			if (!match.failed()) {
				return this._ohmParser(match).toJSON();
			} else {
				this.addMessageToInputBuffer({
					role: 'system',
					content: 'INVALID OUTPUT FORMAT. Please review the instructions and try again.'
				});
				console.log(`invalid output format: ${this.response}`);
				return await this.iterate(semanticActionHandler);
			}
		} catch (error: any) {
			// if there is an error, retry up to 3 times
			if (retries < 3) {
				retries++;
				return this.iterate(semanticActionHandler);
			} else {
				vscode.window.showErrorMessage('Error: ' + error.message);
				throw error;
			}
		}
	}

	// execute the SPS - iterates until explicitly disabled
	protected async execute(semanticActionHandler: SemanticActionHandler): Promise<any> {
		this._executing = true;
		const _run = async (): Promise<any> => {
			if (!this._executing) { return; }
			const result = await this.iterate(semanticActionHandler);
			if (result && result.stop) {
				this._executing = false;
				console.log('Execution stopped');
				return result;
			}
			if (this._executing) {
				return await _run();
			}
			return result;
		};
		return await _run();
	}

	// use the responders to build the semantic actions
	get grammar(): Ohm.Grammar { return this._getGrammar(); }

	_semantics: any
	_ohmParser: any
	_grammar: any;

	_getGrammar(): Ohm.Grammar {
		if(this._grammar) { return this._grammar; }
		// get a list of repsonders - filter out the responderrs with no delimiter
		const responders = this.responders.filter(responder => responder.delimiter && (responder.delimiter.length > 0 && responder.delimiter.length <= 3));
		const responderNames = responders.map(responder => responder.name + '="' + responder.delimiter + '"').join('\n');
		const delimiters = responders.map(responder => responder.name).join('|')
		const grammarFile = `CodeEnhancerAgent {
CodeEnhancerMessage=(Delimiters Title)+
Title=(~(Delimiters) any)*
Delimiters=(${delimiters})
${responderNames}
}`
		this._grammar = Ohm.grammar(grammarFile);
		return this._grammar;
	}


	createSemanticActions(responders: SemanticResponder[]) {
		const semanticActions: any = this._createSemanticActions(responders.filter(e => e.delimiter));
		responders.forEach(responder => {
			if(responder.delimiter) {
				semanticActions[responder.name] = (value: any) => {
					responder.process(this, 'init', value.sourceString);
					return {
						name: responder.name,
						delimiter: responder.delimiter && responder.delimiter,
						value: value.sourceString
					};
				};
			}
			else semanticActions[responder.name] =this.semanticActionHandler && this.semanticActionHandler[responder.name];
		});
		return semanticActions;
	}

	abstract _createSemanticActions(responders: SemanticResponder[]): any;

}


// an action handler for a semantic action
export type SemanticActionHandler = Ohm.ActionDict<unknown>;

export interface Variable {
	name: string;
	value?: string | number | boolean | object;
	type?: string;
	scope: 'execution' | 'iteration';
}

export interface Array {
	name: string;
	delimiter?: string;
	value?: (string | number | boolean | object)[];
	type?: string;
	scope: 'execution' | 'iteration';
}

export type onProcess = (context: any, scope: 'init' | 'loop' | 'post', obj: any) => Promise<boolean | void>;

interface ScopeBehavior {
	onInit?: (parent: SemanticProcessor) => void;
	onLoop?: (parent: SemanticProcessor) => void;
	onPost?: (parent: SemanticProcessor) => void;
}

export interface SemanticResponder extends ScopeBehavior {
	name: string;
	inputPrompt?: string;
	outputPrompt?: string;
	delimiter?: string;
	exclude?: boolean;
	scopes: ('init' | 'loop' | 'post')[];
	process: onProcess;
	filter?: (input: any) => any; // Add this line
}

export interface SemanticProcessor {
	variables: Variable[];
	arrays: Array[];
	responders: SemanticResponder[];
}


export abstract class ModularSemanticPrompt extends SemanticPrompt implements SemanticProcessor {

	variables: Variable[] = [];
	arrays: Array[] = [];
	responders: SemanticResponder[] = [];

	triggered = false;
	taskListHeight = 0;
	projectFolder: string | undefined;
	openTasks: string[] = [];
	commandHistory: string[] = [];
	_grammar: Ohm.Grammar | undefined;

	initialRequest: string | undefined;

	public semanticActions?: SemanticActionHandler;

	constructor(
		public context: vscode.ExtensionContext,
		public writeEmitter?: vscode.EventEmitter<string>,
		llmOptions?: any) {
		super(llmOptions);
		this.projectFolder = _getProjectFolder();
	}

	async handleUserRequest(userRequest: string) {
		if (!this.projectFolder) { throw new Error('No project folder found'); }
		// get the project folder
		process.chdir(this.projectFolder);
		this.initialRequest = userRequest;
		// add the user request to the input
		this.addMessageToInputBuffer({
			role: 'user',
			content: `${userRequest}`
		});
		// execute the user request
		return await this.execute(this.semanticActionHandlers);
	}

	addResponder(responder: SemanticResponder): void {
		this.responders.push(responder);
	}

	private _parseCommands(text: string, legalEmojis: string[]) {
		const lines = text.split('\n');
		const cmds: any = [];
		let emojiFound: string | undefined = '';
		lines.forEach(line => {
			const eFound = legalEmojis.find(emoji => line.startsWith(emoji));
			if (eFound) {
				emojiFound = eFound;
				const value = line.replace(eFound, '').trim();
				cmds.push({ command: emojiFound, message: [value] });
			} else {
				const latestCmd = cmds[cmds.length - 1];
				latestCmd.message.push(line);
			}
		});
		return cmds;
	}

	// execute the SPS - iterates until explicitly disabled
	public async execute(semanticActionHandlers: any): Promise<any> {
		this._executing = true;
		const _run = async (): Promise<any> => {
			if (!this._executing) { return; }
			const result = await this.iterate(semanticActionHandlers);
			if (result && result.stop) {
				this._executing = false;
				console.log('Execution stopped');
				return result;
			}
			if (this._executing) {
				return await _run();
			}
			return result;
		};
		return await _run();
	}

    _createSemanticActions(responders: SemanticResponder[]): any {
		const semanticActions: any = this.semanticActionHandlers
		return semanticActions;
	}

	inputPromptProcessor(prompt: string, message: string): string {
		return message;
	}
	outputPromptProcessor(prompt: string, obj: any): any {
		return obj;
	}

	_println(message: string): void {
		if (this.writeEmitter) this.writeEmitter.fire(message);
		else console.log(message);
	}

	get semanticActionHandlers(): Ohm.ActionDict<unknown> {
		const semanticActions: any = {
			CodeEnhancerMessage: (delimiters: any, titles: any) => {
				const message = {
					role: delimiters.toJSON(), content: titles.sourceString.trim(),
				};
				return message
			},
			Title: (title: any) => { return title.sourceString; },
			Delimiters: (delimiters: any) => { return delimiters.sourceString; },
			_iter: async (...children: any) => {
				const recs = children.map(function (child: any) { return child.toJSON(); });
				const delimiters = this.responders.map(responder => responder.delimiter).filter(delimiter => delimiter);
				const messageSource = children[0].source.sourceString;
				const messageCommands = this._parseCommands(messageSource, delimiters as any).map((cmd: any) => {
					const arrayItem = this.arrays.find(item => item.delimiter === cmd.command);
					if (arrayItem && !arrayItem.type) {
						arrayItem.type = typeof cmd.content;
					}
					return cmd;
				});
				for (const arrayItem of this.arrays) {
					if (arrayItem.scope === 'iteration') {
						arrayItem.value = messageCommands.filter((cmd: any) => cmd.command === arrayItem.delimiter);
					} else {
						if(!arrayItem.value) arrayItem.value = [];
						arrayItem.value.push(...messageCommands.filter((cmd: any) => cmd.command === arrayItem.delimiter));
					}
				}
				const initReponders = this.responders.filter(responder => responder.scopes.includes('init'));
				const loopReponders = this.responders.filter(responder => responder.scopes.includes('loop'));
				const postReponders = this.responders.filter(responder => responder.scopes.includes('post'));

				const contextObject = {
					writeEmitter: this.writeEmitter,
					variables: this.variables,
					arrays: this.arrays,
					responders: this.responders,
					triggered: this.triggered,
					taskListHeight: this.taskListHeight,
					projectFolder: this.projectFolder,
					openTasks: this.openTasks,
					commandHistory: this.commandHistory,
					inputBuffer: this.inputBuffer,
					addMessageToInputBuffer: this.addMessageToInputBuffer.bind(this),
					clearInputBuffer: this.clearInputBuffer.bind(this),
					interrupt: this.interrupt.bind(this),
					messageCommands: messageCommands,
				};

				for (const responder of initReponders) {
					responder.process(contextObject, 'init', messageCommands);
				}
				for (const messageCommand of messageCommands) {
					// set the variable value if it is an iteration variable
					for (const variable of this.variables) {
						if (variable.scope === 'iteration' && variable.name === messageCommand.command) {
							variable.value = messageCommand.message;
						}
					}
					for (const responder of loopReponders) {
						if (messageCommand.command === responder.delimiter) {

							let inputMessage = messageCommand.message;

							if (responder.filter) {
								inputMessage = responder.filter(inputMessage);
							}
							if (responder.inputPrompt) {
								// Custom input processing using responder's inputPrompt
								inputMessage = this.inputPromptProcessor(responder.inputPrompt, messageCommand.message);
							}
							const output = await responder.  process(contextObject, 'loop', messageCommand);
							// if (responder.outputPrompt) {
							// 	// Custom output processing using responder's outputPrompt
							// 	const processedOutput = this.outputPromptProcessor(responder.outputPrompt, output);
							// 	// Update the inputBuffer with the processedOutput
							// 	this.addMessageToInputBuffer({
							// 		role: 'assistant',
							// 		content: `${processedOutput}`
							// 	});
							// } else {
							// 	// Update the inputBuffer with the output
							// 	this.addMessageToInputBuffer({
							// 		role: 'assistant',
							// 		content: `${output}`
							// 	});
							// }
						}
					}
				}
				for (const responder of postReponders) {
					responder.process(contextObject, 'post', messageCommands);
				}
				 return recs;
			}
		};
		const responders = this.responders.filter(responder => responder.delimiter && (responder.delimiter.length > 0 && responder.delimiter.length <= 3));
		responders.forEach(responder => {
			if(responder.delimiter) semanticActions[responder.name] = (delimiter: any) => { return delimiter.sourceString; };
		});
		return semanticActions;
	}

	output(msg: string) { 
		if(this.writeEmitter) this.writeEmitter?.fire(msg); 
		else console.log(msg);
	}
	
	outputln(msg: string) { this.output(msg+'\r\n'); }

	addCommandHistory(command: string) {
		this.commandHistory.push(command);
	}
	
}

