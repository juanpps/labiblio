'use client'

import { Worker, Viewer } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

export function PDFViewer({ file }: { file: string }) {
    const defaultLayoutPluginInstance = defaultLayoutPlugin()

    return (
        <div className="w-full h-full">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer
                    fileUrl={file}
                    plugins={[defaultLayoutPluginInstance]}
                    theme="dark"
                />
            </Worker>
        </div>
    )
}
