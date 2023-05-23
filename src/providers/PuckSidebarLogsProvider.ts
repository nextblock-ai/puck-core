import * as vscode from 'vscode';

export default class PuckSidebarLogsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _items: vscode.TreeItem[] = [];

    getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
        return item;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return Promise.resolve(this._items);
        }
        return Promise.resolve([]);
    }

    addItem(item: vscode.TreeItem): void {
        this._items.push(item);
    }
}