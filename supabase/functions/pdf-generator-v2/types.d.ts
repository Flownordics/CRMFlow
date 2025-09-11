/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

declare global {
    const Deno: {
        env: {
            get(key: string): string | undefined;
        };
    };

    const fetch: typeof globalThis.fetch;
    const console: typeof globalThis.console;
    const Response: typeof globalThis.Response;
    const Request: typeof globalThis.Request;

    // PDF-lib types
    namespace PDFLib {
        interface PDFDocument {
            addPage(dimensions?: [number, number]): PDFPage;
            embedFont(font: any): Promise<any>;
            embedPng(imageBytes: Uint8Array): Promise<any>;
            save(): Promise<Uint8Array>;
        }

        interface PDFPage {
            drawText(text: string, options: any): void;
            drawRectangle(options: any): void;
            drawLine(options: any): void;
            drawImage(image: any, options: any): void;
        }
    }
}

export { };
