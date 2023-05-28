import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import ConversationManager from '../../src/manager/ConversationManager';
import { afterEach, beforeEach } from 'mocha';



suite('Conversation Manager Test Suite', () => {

    const testConversationsFile = vscode.workspace.workspaceFolders
      ? `${vscode.workspace.workspaceFolders[0].uri.fsPath}/conversations_test.json`
      : 'conversations_test.json';
      
    beforeEach(() => {
      if (fs.existsSync(testConversationsFile)) {
        fs.unlinkSync(testConversationsFile);
      }
    });

    afterEach(() => {
      if (fs.existsSync(testConversationsFile)) {
        fs.unlinkSync(testConversationsFile);
      }
    });

    test('Constructor and instance creation', () => {
      const manager = ConversationManager.getInstance(testConversationsFile);
      const manager2 = ConversationManager.getInstance(testConversationsFile);
      assert.strictEqual(manager, manager2, 'Creating singleton instance failed');
    });

    test('Load, save, and set conversation', () => {
      const manager = ConversationManager.getInstance(testConversationsFile);
      assert.strictEqual(manager.conversations.length, 0, 'Initial conversations not empty');

      const conversation = {
        messages: [
          {
            content: 'Test message'
          }
        ]
      };

      manager.setConversation(conversation);
      assert.strictEqual(manager.conversations.length, 1, 'Conversations not saved or loaded correctly');
    });

    test('Manage conversations with same message', () => {
      const manager = ConversationManager.getInstance(testConversationsFile);

      const conversation1 = {
        messages: [
          {
            content: 'Test message 1'
          }
        ]
      };

      const conversation2 = {
        messages: [
          {
            content: 'Test message 1'
          }
        ]
      };

      manager.setConversation(conversation1);
      manager.setConversation(conversation2);

      assert.strictEqual(manager.conversations.length, 1, 'Conversations with same message not grouped');
      assert.strictEqual(manager.conversations[0].count, 2, 'Count of conversations with same message not correct');
    });

});



suite('ConversationManager Test Suite', () => {
    const conversationsFile = vscode.workspace.workspaceFolders
        ? `${vscode.workspace.workspaceFolders[0].uri.fsPath}/conversations_test.json`
        : 'conversations_test.json';

    test('getInstance ensures only one instance of ConversationManager is created', () => {
        const instance1 = ConversationManager.getInstance(conversationsFile);
        const instance2 = ConversationManager.getInstance(conversationsFile);
        
        assert.strictEqual(instance1, instance2);
    });

    test('setConversation saves a new conversation and increments its count if it already exists', () => {
        const conversationManager = ConversationManager.getInstance(conversationsFile);
        const conversation = {
            messages: [
                { content: 'Test message' }
            ]
        };

        conversationManager.setConversation(conversation);

        // Save the conversation a second time to test count increment.
        conversationManager.setConversation(conversation);

        // Verify that there is only one conversation with the hash of the content.
        const hash = conversationManager["_md5hash"](conversation.messages[0].content);
        const conversationsWithHash = conversationManager.conversations.filter(c => c.hash === hash);

        assert.strictEqual(conversationsWithHash.length, 1);
        assert.strictEqual(conversationsWithHash[0].count, 2);
    });
});
