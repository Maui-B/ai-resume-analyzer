interface FSItem {
    id: string;
    uid: string;
    name: string;
    path: string;
    is_dir: boolean;
    parent_id: string;
    parent_uid: string;
    created: number;
    modified: number;
    accessed: number;
    size: number | null;
    writable: boolean;
}

interface PuterUser {
    uuid: string;
    username: string;
}

interface KVItem {
    key: string;
    value: string;
}

interface ChatMessageContent {
    type: "file" | "text";
    puter_path?: string;
    text?: string;
}

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string | ChatMessageContent[];
}

interface PuterChatOptions {
    model?: string;
    stream?: boolean;
    max_tokens?: number;
    temperature?: number;
    tools?: {
        type: "function";
        function: {
            name: string;
            description: string;
            parameters: { type: string; properties: {} };
        }[];
    };
}

interface AIResponse {
    index: number;
    message: {
        role: string;
        content: string | any[];
        refusal: null | string;
        annotations: any[];
    };
    logprobs: null | any;
    finish_reason: string;
    usage: {
        type: string;
        model: string;
        amount: number;
        cost: number;
    }[];
    via_ai_chat_service: boolean;
}

interface PuterAI {
    chat(
        prompt: string | ChatMessage[],
        imageURL?: string | PuterChatOptions,
        testMode?: boolean,
        options?: PuterChatOptions,
    ): Promise<AIResponse>;
}

interface PuterKV {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    list(prefix?: string, recursive?: boolean): Promise<KVItem[]>;
    del(key: string): Promise<void>;
    flush(): Promise<void>;
}

interface PuterFS {
    readDir(path: string): Promise<FSItem[]>;
    delete(path: string): Promise<void>;
    upload(path: string, file: File | Blob): Promise<FSItem>;
}

interface Puter {
    ai: PuterAI;
    fs: PuterFS;
    kv: PuterKV;
    auth: {
        signIn(): Promise<void>;
        signOut(): Promise<void>;
        isAuthenticated: boolean;
        user: PuterUser | null;
    };
}

interface Window {
    puter: Puter;
}
