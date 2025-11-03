declare module 'imap-simple' {
  export interface ImapSimpleOptions {
    imap: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
      tlsOptions?: { rejectUnauthorized?: boolean };
    };
  }

  export interface Connection {
    openBox(boxName: string): Promise<void>;
    search(searchCriteria: string[], fetchOptions: any): Promise<any[]>;
    fetch(uids: number[], options: any): Promise<any[]>;
    end(): Promise<void>;
  }

  export function connect(options: ImapSimpleOptions): Promise<Connection>;
  export function getParts(parts: any): any[];
}

