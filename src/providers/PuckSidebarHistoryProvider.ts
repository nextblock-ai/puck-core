import * as vscode from 'vscode';

/**
 * PuckSidebarHistoryProvider
 * 
 * A class to provide items for the Puck Sidebar History.
 * It extends the TreeDataProvider interface, so it can be used with a vscode.TreeView.
 * To add a new TreeItem to the History, simply call the addItem() method.
 */
export default class PuckSidebarHistoryProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _items: vscode.TreeItem[] = [];

    /**
     * getTreeItem
     * 
     * This method is called for each item to be shown in the TreeView,
     * and it is responsible for providing a TreeItem to display the data.
     * 
     * @param item - The data item for which a TreeItem must be provided
     * @return The TreeItem to display the data
     */
    getTreeItem(item: vscode.TreeItem): vscode.TreeItem {
        return item;
    }

    /**
     * getChildren
     * 
     * This method is called to request the children of an element in the TreeView.
     * If the parameter is not provided, it means the children at the root of the tree are being requested.
     * 
     * @param element - The element for which children are being requested,
     *                  or undefined if it's the root level children of the TreeView
     * @return A Promise of an array of children elements, which could be an empty array if there are no more children
     */
    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return Promise.resolve(this._items);
        }
        return Promise.resolve([]);
    }

    /**
     * addItem
     * 
     * Adds a new TreeItem to the History
     * 
     * @param item - The TreeItem to be added to the History
     */
    addItem(item: vscode.TreeItem): void {
        this._items.push(item);
    }
}