// src/validator/claude-cli.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ValidationResult, ValidationError } from '../types.js';

const execAsync = promisify(exec);

export interface ClaudeValidationResult extends ValidationResult {
  skipped?: boolean;
}

export class ClaudeCliValidator {
  async validate(path: string): Promise<ClaudeValidationResult> {
    try {
      const { stdout, stderr } = await execAsync(
        `claude plugin validate "${path}"`,
        { timeout: 30000 }
      );

      // Parse output for errors
      const errors = this.parseOutput(stdout, stderr);

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error: unknown) {
      // Check if claude CLI is not installed
      if (this.isCommandNotFound(error)) {
        return {
          valid: true,
          errors: [],
          skipped: true
        };
      }

      // Claude CLI returned non-zero exit code (validation failed)
      if (this.isExecError(error)) {
        const errors = this.parseOutput(error.stdout || '', error.stderr || '');
        if (errors.length > 0) {
          return { valid: false, errors };
        }

        // Generic error
        return {
          valid: false,
          errors: [
            {
              layer: 'claude-cli',
              message: error.stderr || error.message || 'Validation failed'
            }
          ]
        };
      }

      // Unknown error - skip validation
      return {
        valid: true,
        errors: [],
        skipped: true
      };
    }
  }

  private parseOutput(stdout: string, stderr: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const combined = `${stdout}\n${stderr}`;

    // Look for common error patterns
    const lines = combined.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and success messages
      if (!trimmed || trimmed.includes('valid') || trimmed.includes('Valid')) {
        continue;
      }

      // Look for error indicators
      if (
        trimmed.includes('error') ||
        trimmed.includes('Error') ||
        trimmed.includes('invalid') ||
        trimmed.includes('Invalid') ||
        trimmed.includes('missing') ||
        trimmed.includes('Missing') ||
        trimmed.includes('failed') ||
        trimmed.includes('Failed')
      ) {
        errors.push({
          layer: 'claude-cli',
          message: trimmed
        });
      }
    }

    return errors;
  }

  private isCommandNotFound(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('command not found') ||
        message.includes('enoent') ||
        message.includes('is not recognized')
      );
    }
    return false;
  }

  private isExecError(
    error: unknown
  ): error is Error & { stdout?: string; stderr?: string } {
    return error instanceof Error && 'code' in error;
  }
}
