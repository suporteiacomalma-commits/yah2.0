import { jsPDF } from "jspdf";

interface PDFSection {
    title: string;
    content: string;
}

interface GeneratePDFOptions {
    title: string;
    sections: PDFSection[];
    fileName?: string;
}

export const generatePDF = ({ title, sections, fileName = "documento.pdf" }: GeneratePDFOptions) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    let yPosition = margin;

    // Helper to check page break
    const checkPageBreak = (height: number) => {
        if (yPosition + height > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
            return true;
        }
        return false;
    };

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(182, 188, 69); // #B6BC45 - Brand Green

    // Split title if too long
    const titleLines = doc.splitTextToSize(title, contentWidth);
    doc.text(titleLines, margin, yPosition);
    yPosition += titleLines.length * 10 + 10;

    // Sections
    sections.forEach((section) => {
        // Section Title
        checkPageBreak(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40); // Dark Gray

        // Split section title
        const sectionTitleLines = doc.splitTextToSize(section.title, contentWidth);

        // Check if title fits, if not add page
        if (checkPageBreak(sectionTitleLines.length * 8 + 10)) {
            // If we added a page, re-set font settings because addPage might reset them in some versions (safety)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
        }

        doc.text(sectionTitleLines, margin, yPosition);
        yPosition += sectionTitleLines.length * 8 + 5;

        // Section Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60); // Lighter Gray

        // Clean content (remove empty lines, etc)
        const cleanContent = section.content.replace(/\r\n/g, "\n").trim();

        // Split text to fit width
        const contentLines = doc.splitTextToSize(cleanContent, contentWidth);

        // Render lines with pagination
        contentLines.forEach((line: string) => {
            checkPageBreak(7);
            doc.text(line, margin, yPosition);
            yPosition += 7;
        });

        yPosition += 10; // Spacing after section
    });

    // Footer (Simple Page Numbers)
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
        doc.text("YAH 2.0 - Plataforma de Identidade de Marca", margin, pageHeight - 10);
    }

    doc.save(fileName);
};
