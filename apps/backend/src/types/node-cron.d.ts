declare module 'node-cron' {
  const cron: {
    schedule: (expression: string, fn: () => void) => void;
  };
  export default cron;
}
