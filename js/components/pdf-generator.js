/* ============================================
   AS WEDDING — PDF Generator
   jsPDF + html2canvas for invitation cards
   ============================================ */

async function downloadInvitationPDF(eventKey) {
    const event = getEventData(eventKey);
    if (!event) return;

    const cardElement = document.getElementById(`invitation-card-${eventKey}`);
    if (!cardElement) return;

    showToast(getLang() === 'hi' ? 'PDF बना रहे हैं...' : 'Generating PDF...', false, 2000);

    try {
        // Wait for html2canvas and jsPDF to be available
        if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
            showToast('PDF libraries not loaded. Please try again.', true);
            return;
        }

        // Capture the invitation card as canvas
        const canvas = await html2canvas(cardElement, {
            scale: 2,
            backgroundColor: '#F5EFE6',
            useCORS: true,
            logging: false,
            allowTaint: true
        });

        // Create PDF
        const { jsPDF } = jspdf;
        const imgData = canvas.toDataURL('image/png');

        // Calculate dimensions (maintain aspect ratio)
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;

        let pdfWidth, pdfHeight;
        if (ratio > 1) {
            // Landscape
            pdfWidth = 210; // A4 width in mm
            pdfHeight = pdfWidth / ratio;
        } else {
            // Portrait
            pdfHeight = 297; // A4 height in mm
            pdfWidth = pdfHeight * ratio;
        }

        // Center on A4
        const pdf = new jsPDF({
            orientation: ratio > 1 ? 'landscape' : 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const x = (pageWidth - pdfWidth) / 2;
        const y = (pageHeight - pdfHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, pdfWidth, pdfHeight);

        // Generate filename
        const eventName = event.title.en.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `AS_${eventName}_Invitation.pdf`;

        pdf.save(filename);

        showToast(getLang() === 'hi' ? 'PDF डाउनलोड हो गई! 📄' : 'PDF downloaded! 📄');
    } catch (error) {
        console.error('PDF generation error:', error);
        showToast(getLang() === 'hi' ? 'PDF बनाने में त्रुटि' : 'Error generating PDF', true);
    }
}
