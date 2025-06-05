// Helper function for creating unique constraints
export function unique(name: string) {
  return {
    name,
    on: (...columns: any[]) => ({
      name,
      columns,
    }),
  };
}
