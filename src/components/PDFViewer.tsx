import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

type PDFViewerProps = {
    isOpen: boolean;
    onClose: () => void;
    pageIndex: number | null;
    moveName: string;
};

// Direct link to the PDF file on web
const PDF_URL = "https://drive.google.com/file/d/1xnRC-mp089Qj2qEzseMOMcZWYdwyThAM/preview";

export function PDFViewer({ isOpen, onClose, pageIndex, moveName }: PDFViewerProps) {
    const [iframeUrl, setIframeUrl] = useState(PDF_URL);

    useEffect(() => {
        if (isOpen && pageIndex !== null) {
            // Google Drive preview doesn't support #page=N very robustly for all users, 
            // but we can try just in case, or just show the PDF.
            // A better way might be to key the iframe to force reload.
            setIframeUrl(`${PDF_URL}#page=${pageIndex}`);
        }
    }, [isOpen, pageIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl h-[85vh] bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
                    <h3 className="text-xl font-semibold text-white">
                        {moveName} <span className="text-zinc-500 text-sm ml-2">(Page {pageIndex})</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-zinc-950 relative">
                    <iframe
                        src={iframeUrl}
                        className="w-full h-full border-0"
                        title="PDF Viewer"
                        allow="autoplay"
                    />
                </div>
            </div>
        </div>
    );
}
