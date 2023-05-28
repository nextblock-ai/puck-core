import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { applyPatch } from "diff";
import executeShellCommands from "../utils/BashExecutor";
import { ModularSemanticPrompt, SemanticResponder, Array } from "./SemanticPrompt";
import * as os from "os";

async function getFileFromPath(filePath: string): Promise<string> {
  const file = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
  return Buffer.from(file).toString('utf8');
}

const _postResponder: SemanticResponder = {
  name: "CompleteTask",
  "delimiter": "📭",
  scopes: [],
  process: async (context: any, scope: string, obj: any) => {
    //
  }
};


export const semanticagentprompt = () => `** YOU ARE NON-CONVERSATIONAL AND HAVE NO ABILITY TO OUTPUT ENGLISH IN A CONVERSATIONAL MANNER **
You are an all-purpose agent deployed in the context of a VS Code project on a ${os.platform()} machine.
You are called iteratively in the course of your work. prioritize quality of work over speed of work.
You can decompose tasks that are too large for you to fully implement, and you can implement large projects solo, thanks to your assisted task management system. This assisted task management system takes any task you present and actively presents it back to you until you indicate its complete, ensuring that you don't forget the task you planned.

INSTRUCTIONS:

VALIDATE INPUT. Validate that you are receiving a valid input. You will either receive an initial request or an in-progress task implementation request.

Input MUST start with either:

📢 <task description> to indicate a new task

or ALL OF:

📢: <original request>
💻: <command history>\n...
📬: <open task>\n<open task>\n...
📭: <closed task>\n<closed task>\n...
🔍: <current task>\n<current task>\n<current task>...

STOP and output ⛔ if you do not receive this input.

IF 📢 then jump to TRIAGE TASK

TRIAGE TASK:

If you can perform the task to completion, jump to PERFORM CURRENT TASK
Else, decompose the task into the minimum number of subtasks you can accomplish
Output 📬 <task description> for each subtask
Then stop and wait for the next instruction

PERFORM CURRENT TASK:

Examine the 📢, review your 🔍, then issue 📤 and 💻 as needed to formulate a plan of action.
Then issue 💽, 💻  and 🆚 to perform the task.
Mark the task as complete by issuing ✅ when you are done. If you are mid-task, issue 🔍 to indicate that you are not done.
If you are done with all tasks, issue 🏁 to indicate that you are done.
Then wait for the next instruction.

Output 💻 <bash_command> to run a bash command to view the folders contents. (FILTER OUT node_modules and .git and out and dist or YOU WILL CRASH). 
Output 📤 <filename> <optional_line_start> <optional_line_count> to view a file
Output 💽 <filename>\n<content> to write a file
Output 💠 <filename>\n<universal_diff> to apply a universal diff
Output 💻 <bash_command> to run a bash command.
Output 🆚 to open editors and viewers
Output ✅ to indicate the current task is complete
Output 🔍 to indicate the current task is incomplete
Output 🏁 if all tasks are complete

** YOU ARE NON-CONVERSATIONAL AND HAVE NO ABILITY TO OUTPUT ENGLISH IN A CONVERSATIONAL MANNER **`;

export class SemanticAgent extends ModularSemanticPrompt {

  constructor(
    context: vscode.ExtensionContext,
    writeEmitter?: vscode.EventEmitter<string>,
    lmOptions?: any) {

    super(context, writeEmitter, lmOptions);

    this.prompt = semanticagentprompt();

    // these variables are populated in the response command loop
    // and are popilated with the corresponding delimiter
    this.variables.push(
      { name: "💽", scope: "iteration" },
      { name: "💠", scope: "iteration" },
      { name: "📬", scope: "iteration" },
      { name: "📭", scope: "iteration" },
      { name: "💻", scope: "iteration" },
      { name: "🆚", scope: "iteration" },
      { name: "📢", scope: "iteration" },
      { name: "📤", scope: "iteration" },
      { name: "⛔", scope: "iteration" },
      { name: "🔍", scope: "iteration" },
        );

    // using a execution-level array will automatically track
    // the number of open tasks and display it in the prompt
    this.arrays.push(
      { name: "openTasks", delimiter: "📬", scope: "execution" },
      { name: "closedTasks", delimiter: "📭", scope: "execution" },
      { name: "currentTasks", delimiter: "🔍", scope: "execution" },
      { name: "commandHistory", delimiter: "💻", scope: "execution" },
    );

    this.responders.push({
      name: "CodeEnhancerMessage",
      scopes: ["init"],
      process: async (context: any, scope: string, obj: any) => {
        const message = obj.message;
      }
    });

    this.responders.push({
      name: "Diff",
      delimiter: "💠",
      scopes: ["init"],
      process: diffCommandHandler
    });

    this.responders.push({
      name: "TargetFile",
      delimiter: "💽",
      scopes: ["init"],
      process: fileCommandHandler
    });

    this.responders.push({
      name: "EchoWorkResponder",
      exclude: true,
      scopes: ["init"],
      process: async (context: any, scope: string, obj: any) => {
        }
    });

    this.responders.push({
      name: "BashCommand",
      delimiter: "💻",
      scopes: ["loop"],
      process: bashCommandHandler
    });

    this.responders.push({
      name: "VSCodeCommand",
      delimiter: "🆚",
      scopes: ["loop"],
      process: async (context: any, scope: string, obj: any) => {

      }
    });

    this.responders.push({
      name: "TaskCompletedCommand",
      delimiter: "✅",
      scopes: ["loop"],
      process: async (context: any, scope: string, obj: any) => {
          // get the open tasks array and remove the current task
          const openTasks = this.arrays.find(a => a.name === "openTasks");
          const currentTasks = this.arrays.find(a => a.name === "currentTasks");
          const closedTasks = this.arrays.find(a => a.name === "closedTasks");

          if(openTasks && openTasks.value && openTasks.value.length > 0) {
              const currentTask = openTasks && openTasks.value[0];
              const index = openTasks.value.indexOf(currentTask);
              openTasks.value.splice(index, 1);
              if(closedTasks && closedTasks.value) {
                  closedTasks.value.push(currentTask);
                  if(currentTasks) currentTasks.value = [];
              }
              if(currentTasks && openTasks.value.length > 0) {
                  currentTasks.value?.push(openTasks.value[0]);
              }
          }
      }
    });

    this.responders.push({
      name: "Announce",
      delimiter: "📢",
      scopes: ["loop"],
      process: announcedHandler
    });

    this.responders.push({
      name: "FileRequest",
      delimiter: "📤",
      scopes: ["loop"],
      process: fileRequestCommandHandler
    });

    this.responders.push({
      name: "TaskOpen",
      delimiter: "📬",
      scopes: ["loop"],
      process: async (context: any, scope: string, obj: any) => {

      }
    });

    this.responders.push({
      name: "TaskClosed",
      delimiter: "📭",
      scopes: ["loop"],
      process: async (context: any, scope: string, obj: any) => {
        
      }
    });

    this.responders.push({
      name: "OpenTask",
      delimiter: "🔍",
      scopes: ["loop"],
      process: async (context: any, scope: string, obj: any) => {
        
      }
    });

    this.responders.push({
      name: "Error",
      delimiter: "⛔",
      scopes: ["init"],
      process: async (context: any, scope: string, obj: any) => {
        
      }
    });

    this.responders.push({
      name: "finish",
      exclude: true,
      scopes: ["post"],
      process: finishCommandHandler
    });

  }

  /**
   * handle the user request
   * @param userRequest 
   * @returns 
   */
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
    if(this.variables) {
      const v = this.variables.find(v => v.name && v.name === '📢');
      if(v) { v.value = userRequest; }
    }

		// execute the user request
		return await this.execute(this.semanticActionHandlers);
	}

  output(msg: string) { 
    if(this.writeEmitter) this.writeEmitter?.fire(msg); 
    else console.log(msg);
  }

  outputln(msg: string) { this.output(msg+'\r\n'); }

}

const addToCommandHistory = (val: string, context: any) => {
    const commandTasks = context.arrays.find((a: any) => a.delimiter === "💻");
    commandTasks.value = !commandTasks.value ? [] : commandTasks.value;
    commandTasks.value.push(val);
}

const announcedHandler = async (context: any, scope: string, obj: any) => {
  const cmd = obj.command, msg = obj.message.join('\n');
  context.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${msg}` });
  console.log(`${cmd} ${msg}\r\n`);
  addToCommandHistory(`${cmd} ${msg}`, context);
}

const bashCommandHandler = async (context: any, scope: string, obj: any) => {
  const cmd = obj.command;
  const msg = obj.message.join('\n');
  context.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${msg}` });
  console.log(`${cmd} ${msg}\r\n`);
  
  const result = await executeShellCommands(obj.message[0]);
  console.log(`${result}\r\n`);
  context.addMessageToInputBuffer({ role: 'user', content: result });

  addToCommandHistory(`${cmd} ${msg}`, context);
}

const fileCommandHandler = async (context: any, scope: string, obj: any) => {

    const messageCommands = context.messageCommands.filter((cmd: any) => cmd.command === '💽');
  for (let i = 0; i < messageCommands.length; i++) {
    const obj = messageCommands[i];
    const firstLine = obj.message[0];
    const fullPath = path.join(context.projectFolder, firstLine);
    const fileContents = obj.message.slice(1).join('\n');
    writeFile(fullPath, fileContents);

    context.addMessageToInputBuffer({ role: 'assistant', content: `💽 ${fullPath}` });
    context.addMessageToInputBuffer({ role: 'user', content: `💽 ${fullPath} saved` });
    console.log(`💽 ${fullPath} saved`);

    addToCommandHistory(`${firstLine}`, context);
  }
}

const diffCommandHandler = async (context: any, scope: string, obj: any) => {
  const messageCommands = context.messageCommands.filter((cmd: any) => cmd.command === '💠');
  for (let i = 0; i < messageCommands.length; i++) {

    const obj = messageCommands[i];
    const cmd = obj.command;
    const firstLine = obj.message[0];
    const fullPath = path.join(context.projectFolder, firstLine);
    const diffpatch = obj.message.slice(1).join('\n');
    
    context.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${obj.command.join('\n')}` });
    console.log(`${cmd} ${firstLine}\r\n${diffpatch.split('\n').join('\r\n')}\r\n`);
    const patchedFileText = applyPatch(fullPath, diffpatch);
    console.log(`${cmd} ${firstLine}\r\n${patchedFileText.split('\n').join('\r\n')}\r\n`);
    writeFile(fullPath, patchedFileText);
    context.addMessageToInputBuffer({ role: 'user', content: `💠 APPLIED ${fullPath}` });
    console.log(`💠 APPLIED ${fullPath}`);

    addToCommandHistory(`${firstLine}`, context);
  }
}

const fileRequestCommandHandler = async (context: any, scope: string, obj: any) => {
  const cmd = obj.command;
  const msg = obj.message.join('\n');
  const msgparts = msg.split(' ');
  const lineStart = msgparts.length > 1 ? msgparts[1] : 0;
  const lineEnd = msgparts.length > 2 ? msgparts[2] : msgparts.length;
  const projectFolder = context.projectFolder;
  const fullPath = path.join(projectFolder, msg);
  let fileStr = '';
  context.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${msg}` });
  console.log(`${cmd} ${msg}\r\n`);
  try {
    const file = await readFile(fullPath) as any
    const fileArr = file.split('\n');
    if (lineStart !== 0 || lineEnd !== 0) {
      // remove anything after the 100th line
      fileStr = fileArr.slice(lineStart, lineEnd).join('\n');
      fileStr += `...lines ${lineStart} to ${lineEnd} of ${fileArr.length}`;
    }
    
    addToCommandHistory(`${cmd} ${msg}`, context);

    fileStr = fileStr.split('\n').join('\r\n');
    context.addMessageToInputBuffer({ role: 'user', content: `${msg}\n${fileStr}\n` });
    console.log(`${msg}\r\n${fileStr}\r\n`);

  } catch (e) {
    context.addMessageToInputBuffer({ role: 'user', content: `${msg} NOT FOUND\r\n` });
    console.log(`${msg} NOT FOUND\r\n`);
  }
}

const finishCommandHandler = async (context: any, scope: string, obj: any) => {
  if(scope !== 'post') return;

  const openTasks = context.arrays.find((a: any) => a.delimiter === "📬").value;
  const closedTasks = context.arrays.find((a: any) => a.delimiter === "📭").value;
  let currentTasks = context.arrays.find((a: any) => a.delimiter === "🔍").value;
  const commandTasks = context.arrays.find((a: any) => a.delimiter === "💻").value;

  if(!currentTasks.length && openTasks.length) {
    currentTasks = openTasks[0];
  } else currentTasks = currentTasks.map((o:any)=>o.message).message;

  if (openTasks.length !== 0) {
    const response = [
      context.inputBuffer[0].content,
      "💻 " + commandTasks.map((o:any)=>o.message).join('\n'),
      "📬 " + openTasks.map((o:any)=>o.message).join('\n'),
      "📭 " + closedTasks.map((o:any)=>o.message).join('\n'),
      "🔍 " + currentTasks.message.join('\n').trim()
    ]
    context.addMessageToInputBuffer({ role: 'user', content: + '\n' + response.join('\n') + '\n'});
    console.log(response.join('\n'));
  } else {
    context.clearInputBuffer();
    context.interrupt();
  }
}

function writeFile(filePath: string, value: string) {
  fs.writeFileSync(filePath, value);
}

async function readFile(filePath: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) { reject(err); }
      resolve(data);
    });
  });
}