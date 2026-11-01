// Ce qui fait vraiment le travail d'une tâche. Le registre ne connaît que ce contrat :
// le faux exécutant d'aujourd'hui sera remplacé par Claude Code (CC-09).

export interface Task {
  input: string;
  sessionId: string;
  instructions: string | null;
}

export interface Executor {
  /** Rend le résumé lu par Cornelius. Doit s'arrêter dès que `signal` est levé. */
  run(task: Task, signal: AbortSignal): Promise<string>;
}

const ECHO_MAX = 200;

/** Répond après un délai, en reprenant la demande : sert à brancher Cornelius sans Claude. */
export function fakeExecutor(delayMs = 3000): Executor {
  return {
    run: (task, signal) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const echo =
            task.input.length > ECHO_MAX ? task.input.slice(0, ECHO_MAX) + '…' : task.input;
          resolve(`Faux exécutant : demande reçue « ${echo} ».`);
        }, delayMs);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(signal.reason);
          },
          { once: true },
        );
      }),
  };
}
