/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Command } from "./Command";
import constants from "../constants";
import PuckSidebarHistoryProvider from "../providers/PuckSidebarHistoryProvider";
import PuckSidebarLogsProvider from "../providers/PuckSidebarLogsProvider";

export default class PuckSidebarCommand extends Command {

    private historyProvider: PuckSidebarHistoryProvider;
    private logsProvider: PuckSidebarLogsProvider;
    
    // sidebar constructor. registers the sidebar and the hide sidebar command
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(commandId, title, context);

        // register a command to hide the puck sidebar
        this.commands.registerCommand(
            constants['puck.core.hideSidebar'].command
        , this.hidePuckSidebar, this);

        // register the history sidebar - we show LLM conversation history in here
        this.historyProvider = new PuckSidebarHistoryProvider();
        vscode.window.registerTreeDataProvider('puck-history-sidebar', this.historyProvider);
    
        // Allow other extensions to add items to custom sidebar
        let commandDisposable = vscode.commands.registerCommand('puck.core.addSidebarHistoryItem', (item: vscode.TreeItem) => {
            this.historyProvider.addItem(item);
        });
        context.subscriptions.push(commandDisposable);

        // create the logs sidebar - we show logs in here
        this.logsProvider = new PuckSidebarLogsProvider();
        vscode.window.registerTreeDataProvider('puck-logs-sidebar', this.logsProvider);

        // Allow other extensions to add items to log sidebar
        commandDisposable = vscode.commands.registerCommand('puck.core.addSidebarLogsItem', (item: vscode.TreeItem) => {
            this.logsProvider.addItem(item);
        });
        context.subscriptions.push(commandDisposable);
    }

    // show the puck sidebar
    async execute() {
        // show the puck sidebar
        vscode.commands.executeCommand('workbench.view.extension.puck-sidebar');
    }

    // hide the puck sidebar
    async hidePuckSidebar() {
        // hide the puck sidebar
        vscode.commands.executeCommand('workbench.action.closeSidebar');
    }
}