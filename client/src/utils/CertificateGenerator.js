import { jsPDF } from 'jspdf';

/**
 * Generates a professional certificate PDF for a student.
 * @param {Object} data - Certificate data
 * @param {string} data.studentName - Name of the student
 * @param {string} data.eventName - Name of the event
 * @param {string} data.manualDescription - Optional custom description
 * @param {string} data.rank - Rank
 * @param {string} data.certificateId - Unique ID
 * @param {string} data.date - Date of issue
 * @param {string} data.theme - 'modern' | 'institutional' | 'classic'
 * @param {string} data.mitLogo - Base64 MIT logo
 * @param {string} data.clubLogo - Base64 Club logo
 * @param {string} data.rankBadge - Base64 rank medal
 * @param {boolean} data.returnBlob - If true, returns PDF blob instead of downloading
 * @param {Array} data.signatures - Array of { name, title }
 */
export const generateCertificatePDF = (data) => {
    const { 
        studentName, 
        eventName, 
        manualDescription,
        rank, 
        certificateId, 
        date, 
        theme = 'institutional',
        mitLogo,
        clubLogo,
        rankBadge,
        returnBlob = false,
        signatures = []
    } = data;
    
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [800, 600]
    });

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // --- HELPER: DRAW BACKGROUND PATTERNS ---
    const drawBackgroundPattern = () => {
        // Background pattern removed per user request
    };

    // --- BACKGROUND DESIGN ---
    if (theme === 'modern') {
        doc.setFillColor(252, 252, 255);
        doc.rect(0, 0, width, height, 'F');
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(1);
        doc.rect(25, 25, width - 50, height - 50);
        // Modern accent sidebar
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 15, height, 'F');
    } else if (theme === 'classical') {
        // Classical Theme (New)
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, width, height, 'F');
        drawBackgroundPattern();
        
        // Navy Outer Border
        doc.setDrawColor(20, 46, 122); 
        doc.setLineWidth(12);
        doc.rect(12, 12, width - 24, height - 24);
        
        // Gold Inner Border
        doc.setDrawColor(218, 165, 32); 
        doc.setLineWidth(1.5);
        doc.rect(20, 20, width - 40, height - 40);
    } else {
        // Institutional
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, width, height, 'F');
        
        doc.setDrawColor(20, 46, 122);
        doc.setLineWidth(12);
        doc.rect(12, 12, width - 24, height - 24);
        
        doc.setDrawColor(218, 165, 32);
        doc.setLineWidth(1.5);
        doc.rect(20, 20, width - 40, height - 40);
    }

    // --- LOGOS ---
    // Branding (Top Left)
    try {
        if (theme === 'classical') {
            // Precise layout from provided image
            doc.setFont("helvetica", "bold");
            doc.setFontSize(32); // Adjusted for better scale
            doc.setTextColor(0, 0, 0); // Pure black like image
            doc.text("MIT", 45, 70);
            
            // Vertical separator
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(1.5);
            doc.line(100, 48, 100, 85);
            
            // Academy of Engineering
            doc.setFont("helvetica", "normal");
            doc.setFontSize(18);
            doc.text("Academy of", 110, 62);
            doc.setFontSize(22);
            doc.text("Engineering", 110, 83);
            
            // Subtitle
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.text("(An Autonomous Institute Affiliated to Savitribai Phule Pune University)", 45, 98);
        } else {
            // Standard Branding
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.setTextColor(20, 46, 122);
            doc.text("MIT Academy of Engineering, Pune", 45, 55);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(107, 114, 128);
            doc.text("(An Autonomous Institute Affiliated to Savitribai Phule Pune University)", 45, 68);
        }
    } catch (e) {
        console.error("Branding Rendering Error", e);
    }

    // Hide club logo for classical theme as per user requirement
    if (clubLogo && theme !== 'classical') {
        try {
            // Highly visible club logo in top right
            doc.addImage(clubLogo, 'PNG', width - 130, 40, 90, 90);
        } catch (e) {
            console.error("Club Logo Rendering Error", e);
        }
    }

    // --- RANK BADGE (Top Right Overlay) ---
    if (rankBadge) {
        try {
            // Priority: Rank badge usually takes the spot of the logo for prize winners
            // It is larger and centered in the top-right quadrant
            doc.addImage(rankBadge, 'PNG', width - 150, 40, 100, 150);
        } catch (e) {
            console.warn("Rank Badge Rendering Error", e);
        }
    }

    // --- CONTENT ---
    
    // Header
    if (theme === 'classical') {
        doc.setFont("times", "bold"); // Serif font for classical
    } else {
        doc.setFont("helvetica", "bold");
    }
    doc.setFontSize(54); 
    doc.setTextColor(17, 24, 39);
    doc.text("CERTIFICATE", width / 2, 150, { align: "center" });

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 46, 122);
    
    const isPrize = rank && (rank.toString().includes('1') || rank.toString().includes('2') || rank.toString().includes('3'));
    let subTitle = "CERTIFICATION OF PARTICIPATION";
    if (isPrize) {
        subTitle = rank.toString().toUpperCase();
        if (!subTitle.includes('RANK')) subTitle += " RANK";
    }
    
    if (theme === 'classical') {
        doc.setFont("times", "normal");
        doc.setFontSize(28);
    } else {
        doc.setFontSize(28); 
    }
    doc.text(subTitle, width / 2, 175, { align: "center" });

    doc.setFontSize(16);
    if (theme === 'classical') {
        doc.setFont("helvetica", "normal");
    } else {
        doc.setFont("helvetica", "normal");
    }
    doc.setTextColor(107, 114, 128);
    doc.text("WE ARE PROUDLY PRESENT THIS TO", width / 2, 215, { align: "center" });

    // Student Name
    doc.setFontSize(64); // Decreased from 80
    doc.setFont("times", "italic");
    doc.setTextColor(20, 46, 122);
    doc.text(studentName, width / 2, 280, { align: "center" });

    // Body text
    if (theme === 'classical') {
        doc.setFont("times", "normal");
    } else {
        doc.setFont("helvetica", "normal");
    }
    doc.setFontSize(16); 
    doc.setTextColor(75, 85, 99);
    
    let desc = manualDescription;
    if (!desc) {
        const actionText = isPrize ? `for securing ${rank} Rank in` : "for successfully participating in";
        doc.text(actionText, width / 2, 330, { align: "center" });
        
        if (theme === 'classical') {
            doc.setFont("times", "bold");
        } else {
            doc.setFont("helvetica", "bold");
        }
        doc.setFontSize(26);
        doc.setTextColor(20, 46, 122);
        doc.text(`"${eventName}"`, width / 2, 360, { align: "center" });
        
        if (theme === 'classical') {
            doc.setFont("times", "normal");
        } else {
            doc.setFont("helvetica", "normal");
        }
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        desc = `organized by MIT Academy of Engineering, Pune. We recognize their dedication and commitment towards excellence.`;
        const bodyLines = doc.splitTextToSize(desc, width - 260);
        doc.text(bodyLines, width / 2, 385, { align: "center", lineHeightFactor: 1.4 });
    } else {
        const bodyLines = doc.splitTextToSize(desc, width - 260);
        doc.text(bodyLines, width / 2, 340, { align: "center", lineHeightFactor: 1.4 });
    }

    // Date
    if (theme === 'classical') {
        doc.setFont("times", "normal");
    }
    doc.setFontSize(13); 
    doc.text(`Issued on: ${new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, width / 2, 430, { align: "center" });

    // --- GOLD SEAL REMOVED AS PER USER REQUEST ---

    // --- SIGNATURES (DYNAMIC LAYOUT) ---
    const activeSignatures = signatures.filter(s => s.name && s.name.trim() !== '');
    const sigCount = activeSignatures.length;

    if (sigCount > 0) {
        const containerWidth = width - 160;
        const sigWidth = 140;
        const spacing = sigCount === 1 ? 0 : (containerWidth - (sigCount * sigWidth)) / (sigCount - 1);
        const startX = 80;

        activeSignatures.forEach((sig, index) => {
            const x = sigCount === 1 ? (width / 2) - (sigWidth / 2) : startX + (index * (sigWidth + spacing));
            const y = 510; // Moved up from 530

            // Signature line
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(2); // Thicker line
            doc.line(x - 15, y, x + sigWidth + 15, y); // Longer line

            // Name
            if (theme === 'classical') {
                doc.setFont("times", "bold");
            } else {
                doc.setFont("helvetica", "bold");
            }
            doc.setFontSize(20); 
            doc.setTextColor(17, 24, 39);
            doc.text(sig.name, x + (sigWidth / 2), y + 22, { align: "center" });

            // Title
            if (theme === 'classical') {
                doc.setFont("times", "italic");
            } else {
                doc.setFont("helvetica", "normal");
            }
            doc.setFontSize(14); 
            doc.setTextColor(107, 114, 128);
            doc.text(sig.title, x + (sigWidth / 2), y + 40, { align: "center" });
        });
    }

    // Footer Branding / ID
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(`CERTIFICATE ID: ${certificateId}`, 45, height - 25);
    doc.text(`VERIFY AT: MITAOE.AC.IN/VERIFY`, width - 45, height - 25, { align: "right" });

    // --- OUTPUT ---
    if (returnBlob) {
        return doc.output('blob');
    } else {
        doc.save(`${studentName}_Certificate.pdf`);
        return true;
    }
};
