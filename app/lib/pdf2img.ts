export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

export interface MultiPagePdfConversionResult {
    imageUrl: string;
    file: File | null;
    totalPages: number;
    error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    isLoading = true;
    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        // Set the worker source to use local file
        lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        pdfjsLib = lib;
        isLoading = false;
        return lib;
    });

    return loadPromise;
}

export interface MultiPagePdfConversionResult {
    imageUrl: string;
    file: File | null;
    totalPages: number;
    error?: string;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        // If there's only one page, render it normally
        if (numPages === 1) {
            return await renderSinglePage(pdf, 1, file);
        } else {
            // For multiple pages, combine them into a single tall image
            return await renderMultiPage(pdf, numPages, file);
        }
    } catch (err) {
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${err}`,
        };
    }
}

async function renderSinglePage(pdf: any, pageNumber: number, file: File): Promise<PdfConversionResult> {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (context) {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
    }

    await page.render({ canvasContext: context!, viewport }).promise;

    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    // Create a File from the blob with the same name as the pdf
                    const originalName = file.name.replace(/\.pdf$/i, "");
                    const imageFile = new File([blob], `${originalName}.png`, {
                        type: "image/png",
                    });

                    resolve({
                        imageUrl: URL.createObjectURL(blob),
                        file: imageFile,
                    });
                } else {
                    resolve({
                        imageUrl: "",
                        file: null,
                        error: "Failed to create image blob",
                    });
                }
            },
            "image/png",
            1.0
        ); // Set quality to maximum (1.0)
    });
}

async function renderMultiPage(pdf: any, totalPages: number, file: File): Promise<PdfConversionResult> {
    // Render each page separately first
    const pageImages: HTMLCanvasElement[] = [];
    
    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 }); // Slightly lower scale for multi-page to manage file size
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
        }

        await page.render({ canvasContext: context!, viewport }).promise;
        pageImages.push(canvas);
    }

    // Combine all pages into one tall canvas
    let totalHeight = 0;
    let maxWidth = 0;

    // Calculate total dimensions
    for (const canvas of pageImages) {
        totalHeight += canvas.height;
        maxWidth = Math.max(maxWidth, canvas.width);
    }

    // Create combined canvas
    const combinedCanvas = document.createElement("canvas");
    const combinedContext = combinedCanvas.getContext("2d");
    
    combinedCanvas.width = maxWidth;
    combinedCanvas.height = totalHeight;

    if (combinedContext) {
        combinedContext.fillStyle = "white";
        combinedContext.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        combinedContext.imageSmoothingEnabled = true;
        combinedContext.imageSmoothingQuality = "high";

        // Draw each page onto the combined canvas
        let yOffset = 0;
        for (const canvas of pageImages) {
            combinedContext.drawImage(canvas, 0, yOffset);
            yOffset += canvas.height;
        }
    }

    return new Promise((resolve) => {
        combinedCanvas.toBlob(
            (blob) => {
                if (blob) {
                    // Create a File from the blob with the same name as the pdf
                    const originalName = file.name.replace(/\.pdf$/i, "");
                    const imageFile = new File([blob], `${originalName}.png`, {
                        type: "image/png",
                    });

                    resolve({
                        imageUrl: URL.createObjectURL(blob),
                        file: imageFile,
                    });
                } else {
                    resolve({
                        imageUrl: "",
                        file: null,
                        error: "Failed to create image blob",
                    });
                }
            },
            "image/png",
            0.9 // Slightly reduced quality to manage file size for multi-page docs
        );
    });
}

// Function to convert PDF to multiple images (one per page)
export async function convertPdfToMultipleImages(
    file: File
): Promise<MultiPagePdfConversionResult> {
    try {
        const lib = await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        // Render all pages
        const pageImages: HTMLCanvasElement[] = [];
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (context) {
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";
            }

            await page.render({ canvasContext: context!, viewport }).promise;
            pageImages.push(canvas);
        }

        // Combine all pages into one tall canvas
        let totalHeight = 0;
        let maxWidth = 0;

        // Calculate total dimensions
        for (const canvas of pageImages) {
            totalHeight += canvas.height;
            maxWidth = Math.max(maxWidth, canvas.width);
        }

        // Create combined canvas
        const combinedCanvas = document.createElement("canvas");
        const combinedContext = combinedCanvas.getContext("2d");
        
        combinedCanvas.width = maxWidth;
        combinedCanvas.height = totalHeight;

        if (combinedContext) {
            combinedContext.fillStyle = "white";
            combinedContext.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
            combinedContext.imageSmoothingEnabled = true;
            combinedContext.imageSmoothingQuality = "high";

            // Draw each page onto the combined canvas
            let yOffset = 0;
            for (const canvas of pageImages) {
                combinedContext.drawImage(canvas, 0, yOffset);
                yOffset += canvas.height;
            }
        }

        return new Promise((resolve) => {
            combinedCanvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create a File from the blob with the same name as the pdf
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                            totalPages: numPages,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            totalPages: numPages,
                            error: "Failed to create image blob",
                        });
                    }
                },
                "image/png",
                0.9
            );
        });
    } catch (err) {
        return {
            imageUrl: "",
            file: null,
            totalPages: 0,
            error: `Failed to convert PDF: ${err}`,
        };
    }
}
