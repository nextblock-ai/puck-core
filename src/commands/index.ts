import * as vscode from "vscode";

import OpenAIKeyCommand from "./OpenAIKeyCommand";
import constants from "../constants";
import PuckSidebarCommand from "./PuckSidebarCommand";

export function activate(context: vscode.ExtensionContext) {
    // set the OpenAI key
    new OpenAIKeyCommand(
        constants['puck-core.setOpenAIKey'].command,
        constants['puck-core.setOpenAIKey'].title, 
        context
    );
    // show the puck sidebar
    new PuckSidebarCommand(
        constants['puck-core.showSidebar'].command,
        constants['puck-core.showSidebar'].title,
        context
    );
}

export function deactivate() { 
    // noop
}