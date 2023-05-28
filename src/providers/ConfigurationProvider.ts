/**
 * A utility class for managing and listening to configuration changes in
 * the Visual Studio Code workspace.
 *
 * This class serves as a wrapper around the workspace configuration,
 * providing additional functionality and easier access to configuration
 * changes, values, and updates.
 *
 * Usage:
 *
 * 1. Create an instance of ConfigurationProvider.
 * 2. Use the getValue() method to retrieve a configuration value.
 * 3. (Optional) Add an event listener for the onDidChangeConfiguration
 *    event to handle changes to the configuration.
 * 4. (Optional) Update configuration values with the updateValue() method.
 */
import * as vscode from 'vscode';

export class ConfigurationProvider {
    protected config = vscode.workspace.getConfiguration();

    private readonly onConfigChanged: vscode.EventEmitter<vscode.ConfigurationChangeEvent> = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>();
    public readonly onConfigurationChanged: vscode.Event<vscode.ConfigurationChangeEvent> = this.onConfigChanged.event;

    /**
     * Initializes the configuration provider and sets up event listeners.
     */
    constructor() { this.initialize(); }

    /**
     * Sets up the internal event listeners for configuration changes.
     */
    private initialize() {
        vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            this.config = vscode.workspace.getConfiguration();
            this.onConfigChanged.fire(event);
        });
    }
    /**
     * Retrieves the value for a specific configuration key or
     * undefined if not found.
     * 
     * @param {string} section The configuration key to look up.
     * @returns {T | undefined} The value for the configuration key, or undefined if not found.
     */
    getValue<T>(section: string): T | undefined { return this.config.get<T>(section); }
    /**
     * Updates the value for a specific configuration key.
     *
     * @param {string} section The configuration key to update.
     * @param {T} value The new value for the configuration key.
     * @param {vscode.ConfigurationTarget} target The configuration target (global or workspace).
     */
    updateValue<T>(section: string, value: T, target: vscode.ConfigurationTarget) {
        this.config.update(section, value, target);
    }
    /**
     * Checks if a specific configuration key is present in the configuration.
     *
     * @param {string} section The configuration key to check.
     * @returns {boolean} True if the configuration key exists, False otherwise.
     */
    has(section: string): boolean { return this.config.has(section); }
    /**
     * Retrieves the WorkspaceConfiguration object for the specified section.
     *
     * @param {string} section The configuration section/key to obtain.
     * @returns {vscode.WorkspaceConfiguration} The WorkspaceConfiguration object for the specified section.
     */
    getSection(section: string): vscode.WorkspaceConfiguration {
        return this.config.getConfiguration(section);
    }
    /**
     * Adds an event listener for the onDidChangeConfiguration event.
     *
     * @param {(event: vscode.ConfigurationChangeEvent) => void} listener The event listener callback to add.
     * @returns {vscode.Disposable} A disposable to unregister the event listener.
     */
    onDidChangeConfiguration(listener: (event: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return this.onConfigurationChanged(listener);
    }
}