/**
 * Pre-Tool Use Safety Guard for Aura Fashion
 * Inspects tool executions and prevents destructive accidental commands.
 */
const fs = require('fs');

function runGuard() {
  let input = '';
  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', chunk => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    try {
      if (!input.trim()) {
        console.log(JSON.stringify({ decision: 'allow' }));
        return;
      }

      const payload = JSON.parse(input);
      const toolCall = payload.toolCall || {};

      if (toolCall.name === 'run_command') {
        const cmd = (toolCall.args && toolCall.args.CommandLine) ? toolCall.args.CommandLine : '';
        const lowerCmd = cmd.toLowerCase();

        // Destructive patterns that could cause irreversible data loss
        const dangerousPatterns = [
          /\brmdir\s+\/s\s+\/q\s+[c-z]:\\/i,
          /\brm\s+-rf\s+(\/|\*|~\/)/i,
          /\bdrop\s+(database|schema)\b/i,
          /\bformat\s+[c-z]:/i,
          /\bdiskpart\b/i
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(cmd)) {
            console.log(JSON.stringify({
              decision: 'deny',
              reason: `Command blocked by Aura Fashion safety guard: dangerous destructive pattern detected [${pattern}].`
            }));
            return;
          }
        }
      }

      // Default allow
      console.log(JSON.stringify({ decision: 'allow' }));
    } catch (err) {
      // In case of parsing error, fail safe to allow normal agent flow
      console.log(JSON.stringify({ decision: 'allow' }));
    }
  });
}

runGuard();
