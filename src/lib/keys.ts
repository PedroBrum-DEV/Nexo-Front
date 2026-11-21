// Chaves de armazenamento por conta (documento = CPF/CNPJ só com números/letras).
export const workspaceKey = (doc: string) => `nexo.workspace.${doc}`;
export const profileKey = (doc: string) => `nexo.profile.${doc}`;
export const sessionsKey = (doc: string) => `nexo.sessions.${doc}`;
