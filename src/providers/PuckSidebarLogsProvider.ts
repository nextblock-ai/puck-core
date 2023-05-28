/**
 * This class implements a custom TreeDataProvider for displaying logs in a
 * Visual Studio Code sidebar through a custom tree view. Each item in the tree
 * can represent a logged message or event. The tree can be populated and
 * manipulated through the provided methods.
 *
 * @example
 * const logsProvider = new PuckSidebarLogsProvider();
 * vscode.window.registerTreeDataProvider('puckSidebarLogsView', logsProvider);
 * const newLogEntry = vscode.TreeItem('New log entry');
 * logsProvider.addItem(newLogEntry);
 */
import * as vscode from 'vscode';

export default class PuckSidebarLogsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _items: vscode.TreeItem[] = [];

    /**
     * Retrieve the tree item for a given item, used by the
     * TreeDataProvider interface.
     *
     * @param item - The item to get the tree item for.
     * @returns The tree item representation of the item.
     */
    getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
        return item;
    }

    /**
     * Retrieve the children of a given element.
     *
     * @param element - The tree item element.
     * @returns A promise that resolves to the children of the given element.
     */
    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return Promise.resolve(this._items);
        }
        return Promise.resolve([]);
    }

    /**
     * Add a new item to the tree.
     *
     * @param item - The tree item to add to the tree.
     */
    addItem(item: vscode.TreeItem): void {
        this._items.push(item);
    }

    /**
     * Add a log entry to the tree.
     *
     * @param logItem - The string to use for the new log entry.
     * @returns The created TreeItem containing the log information.
     */
    addLog(logItem: string): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(logItem);
        return treeItem;
    }
}