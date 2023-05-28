import * as vscode from 'vscode';

// Interface for status bar item properties
export interface IStatusBarItem {
    id: string;
    item?: vscode.StatusBarItem;
    alignment: vscode.StatusBarAlignment;
    position: number;
    icons?: string[]; // Array of icon names. First is the default icon
    text?: string;
    tooltip?: string;
    command?: string; // Command to run when clicked. This is the easy way to call VS code commands
}

// Class for managing footer content in the status bar
export class FooterContentManager {
    private static instance: FooterContentManager;
    protected statusBarItems: IStatusBarItem[] = [];

    // Private constructor for singleton pattern
    private constructor() {
        FooterContentManager.instance = this;
        this.initialize();
    }

    // Method for initializing the FooterContentManager instance
    private initialize() {
        // Update status bar items when workspace configuration changes
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            this.statusBarItems = this.statusBarItems.map((item:IStatusBarItem)=> {
                item = this._addItem(item);
                return item;
            });
        });
    }

    // Static method to get the instance of the singleton class
    public static getInstance(): FooterContentManager {
        if (!FooterContentManager.instance) {
            FooterContentManager.instance = new FooterContentManager();
        }
        return FooterContentManager.instance;
    }

    // Private method to add an item to the status bar
    private _addItem(item: IStatusBarItem) {
        // Create a new status bar item with the given alignment and position
        const statusBarItem = vscode.window.createStatusBarItem(
            item.alignment, 
            item.position
        );

        // Set the item's text, tooltip, and command properties
        statusBarItem.text = item.text || '';
        statusBarItem.tooltip = item.tooltip || '';
        statusBarItem.command = item.command;

        // Show the status bar item
        statusBarItem.show();

        item.item = statusBarItem;
        return item;
    }
    
    // Public method to add a status bar item
    public addStatusBarItem(item: IStatusBarItem) {
        // Check if the item already exists in the status bar
        const existingItem: any = this.statusBarItems.find(i => i.id === item.id);

        // If the item exists, remove it and dispose it
        if (existingItem) {
            this.removeStatusBarItem(existingItem);
            existingItem.item.dispose();
        }

        // Add the new item to the status bar
        item = this._addItem(item);

        // Save the new item in the statusBarItems array
        this.statusBarItems.push(item);
    }

    // Public method to remove a status bar item by its ID
    public removeStatusBarItem(id: IStatusBarItem) {
        // Find the item in the statusBarItems array
        const item = this.statusBarItems.find(i => i.id === id.id);

        // If the item exists, remove it from the array and dispose it
        if(item) {
            item.item && item.item.dispose();
            this.statusBarItems = this.statusBarItems.filter(i => i !== id);
        }
    }
}