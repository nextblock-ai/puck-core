
import * as assert from "assert";
import OutputLogManager from "../../src/manager/OutputLogManager";

suite("OutputLogManager Test Suite", () => {
  let outputLogManager: OutputLogManager;

  setup(() => {
    outputLogManager = OutputLogManager.getInstance("puck.log");
  });

  test("initialize and dispose", () => {
    assert.strictEqual(outputLogManager.logFile, "puck.log");
  });

  // Add further tests for OutputLogManager methods
});
