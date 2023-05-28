import { spawn } from 'child_process';
import * as split2 from 'split2';
import * as through2 from 'through2';

/**
 * Executes shell commands and returns the combined output.
 *
 * @param {string} commands - The shell commands to execute.
 * @returns {Promise<string>} A promise that resolves with the combined output, or rejects with an error.
 */
export default async function executeShellCommands(commands: string): Promise<string> {
	if(commands.startsWith('cd ')) {
		process.chdir(commands.substring(3));
	}

	return new Promise((resolve, reject) => {
		// Spawn a new shell and execute the commands
		const shell = spawn('bash', ['-c', commands]);
		let output = '';


		// Collect output from stdout and stderr
		shell.stdout.pipe(split2.default()).pipe(
			through2.default((chunk, enc, callback) => {
				output += chunk + '\n';
				callback();
			})
		);

		shell.stderr.pipe(split2.default()).pipe(
			through2.default((chunk, enc, callback) => {
				output += chunk + '\n';
				callback();
			})
		);

		// Handle errors in the spawned shell process
		shell.on('error', (error) => {
			reject(error);
		});

		// Handle the shell process exit with a success or failure
		shell.on('close', (code) => {
			console.log(`Exited with code ${code}`);
			if (code === 0) {
				resolve(output);
			} else {
				reject(new Error(`Exited with code ${code}: ${output}`));
			}
		});
	});
}