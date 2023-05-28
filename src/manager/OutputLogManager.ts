/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/*
 * This class (OutputLogManager) is responsible for creating and managing log files.
 * It maintains a singleton instance, which can be accessed using getInstance method.
 */
export default class OutputLogManager {
    private static _instance: OutputLogManager; // holds the singleton instance
    private _outputChannel: vscode.OutputChannel; // a channel for displaying log messages within the editor
    private _logs: string[] = []; // list of log messages

    // private constructor, since the class maintains a singleton instance
    private constructor(public logFile: string) {
        // create an output channel for the extension
        this._outputChannel = vscode.window.createOutputChannel('Puck Core');
        
        // check if the log file exists, create a new one if it doesn't
        const fileExists = fs.existsSync(logFile);
        if(!fileExists) { fs.writeFileSync(logFile, ''); }
        
        // read the existing log file and store the messages in this._logs
        const f = fs.readFileSync(logFile, 'utf8');
        this._logs = f.split('\n');
    }

    // Save the logs to the log file
    private _saveLogs() {
        fs.writeFileSync(this.logFile, this._logs.join('\n'));
    }

    // Get the singleton instance of the OutputLogManager
    public static getInstance(logFile: string) {
        // create the instance if it doesn't exist yet, and return it
        const instance = this._instance || (this._instance = new this(logFile));
        return instance;
    }

    // Append a log message to the logs list and output channel
    public log(message: string, showChannel = false) {
        this._outputChannel.appendLine(message); // append message to output channel
        this._logs.push(message); // add message to the list of logs
        this._saveLogs(); // save the logs to the log file
        // show the output channel if specified
        if(showChannel) { this._outputChannel.show(); }
    }
}

// Called when the extension is activated
export function activate(_context: vscode.ExtensionContext, logFile: string) {
    // return if there's no workspace folder opened
    if(!vscode.workspace.workspaceFolders) { return; }

    // get the project path and build the log file path
    const projectPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const logFilePath = path.join(projectPath, logFile);
    
    // create the OutputLogManager instance and log the activation message
    const instance = OutputLogManager.getInstance(logFilePath);
    const log = instance.log.bind(instance);
    log('Puck Terminal REPL extension activated.');
}

// Called when the extension is deactivated
export function deactivate() {
    // nothing to do
}