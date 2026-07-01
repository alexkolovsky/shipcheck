import pc from 'picocolors';

export interface Logger {
  verbose: boolean;
  debug: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

/** A tiny stderr logger. Debug output is gated behind `--verbose`. */
export function createLogger(verbose = false): Logger {
  return {
    verbose,
    debug(message) {
      if (verbose) process.stderr.write(pc.dim(`[shipcheck] ${message}\n`));
    },
    warn(message) {
      process.stderr.write(`${pc.yellow('[shipcheck]')} ${message}\n`);
    },
    error(message) {
      process.stderr.write(`${pc.red('[shipcheck]')} ${message}\n`);
    },
  };
}
