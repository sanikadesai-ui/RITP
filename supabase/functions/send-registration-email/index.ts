// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.10";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";
import CryptoJS from "npm:crypto-js@4.2.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    to: string;
    type: "registration_confirmation" | "payment_update" | "general_notification" | "fest_code_approval" | "admin_otp" | "fest_pass_reminder" | "fest_registration_pending" | "paid_event_registered" | "payment_link_notification" | "slot_expired_notification" | "paid_event_registration" | "participation_certificate";
    data: {
        name: string;
        eventName?: string;
        paymentStatus?: string;
        message?: string;
        festCode?: string;
        otp?: string;
        isTeamMember?: boolean;
        teamName?: string;
        registrationFee?: number;
        amount?: number;
        paymentDeadline?: string;
        deadlineHours?: number;
        upiId?: string;
        queuePosition?: number;
        customQrBase64?: string;
        phone?: string;
        college?: string;
        registrationId?: string;
        eventId?: string;
    };
}

const SECRET_KEY = Deno.env.get("QR_SECRET_KEY") || "kaizen-ritp-2026-secret-key";

function generateQRPayload(registrationId: string, eventId: string, name: string): string {
    const timestamp = Date.now();
    const compact = {
        r: registrationId,
        e: eventId,
        n: name,
        t: timestamp,
        s: ''
    };
    
    const sigData = `${compact.r}|${compact.e}|${compact.t}`;
    const signature = CryptoJS.HmacSHA256(sigData, SECRET_KEY).toString().substring(0, 16);
    compact.s = signature;
    
    const jsonStr = JSON.stringify(compact);
    return btoa(jsonStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const getBaseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(90deg, #dc2626 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 32px; letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">KAIZEN 2026</h1>
            <p style="margin: 10px 0 0; font-size: 14px; letter-spacing: 1px; color: rgba(255,255,255,0.9); text-transform: uppercase;">Rajarambapu Institute of Technology</p>
        </div>
        <div style="padding: 40px 30px; color: #1f2937; line-height: 1.6;">
            ${content}
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p style="margin: 5px 0;">&copy; 2026 KAIZEN Team. All rights reserved.</p>
            <p style="margin: 5px 0;">Rajarambapu Institute of Technology, Islampur</p>
            <div style="margin-top: 15px;">
                <a href="https://www.kaizen-ritp.in" style="color: #dc2626; text-decoration: none; margin: 0 10px; font-weight: 600;">Website</a>
                <a href="mailto:kaizentechfest@gmail.com" style="color: #dc2626; text-decoration: none; margin: 0 10px; font-weight: 600;">Contact Us</a>
            </div>
        </div>
    </div>
</body>
</html>
`;

// ========================================
// CERTIFICATE EMAIL TEMPLATE - SEPARATE
// ========================================
const getCertificateEmailTemplate = (studentName: string, eventName: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Participation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: 'Segoe UI', sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #16213e; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <!-- Header with Gradient -->
        <div style="background: linear-gradient(135deg, #e94560 0%, #0f3460 100%); padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">CONGRATULATIONS!</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; color: #ffffff;">
            <h2 style="color: #e94560; margin-top: 0; font-size: 22px;">Certificate of Participation</h2>
            
            <p style="color: #a0a0a0; font-size: 16px;">Dear <strong style="color: #ffffff;">${studentName}</strong>,</p>
            
            <p style="color: #a0a0a0; font-size: 15px; line-height: 1.8;">
                Thank you for participating in <strong style="color: #e94560;">${eventName}</strong> at <strong>KAIZEN 2026</strong> - The Official Tech Fest of Rajarambapu Institute of Technology.
            </p>

            <div style="background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%); border: 2px solid #e94560; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px; color: #e94560; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Attachment</p>
                <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">Your Certificate is attached as PDF</p>
            </div>

            <p style="color: #a0a0a0; font-size: 14px; line-height: 1.8;">
                We hope you had an amazing experience! Your enthusiasm and participation made this event a success.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #2a2a4a;">
                <p style="color: #666; font-size: 13px; margin: 0;">
                    Keep learning, keep growing!
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0f3460; padding: 20px; text-align: center; border-top: 1px solid #2a2a4a;">
            <p style="margin: 5px 0; color: #666; font-size: 12px;">&copy; 2026 KAIZEN Team. All rights reserved.</p>
            <p style="margin: 5px 0; color: #666; font-size: 12px;">Rajarambapu Institute of Technology, Islampur</p>
            <div style="margin-top: 15px;">
                <a href="https://www.kaizen-ritp.in" style="color: #e94560; text-decoration: none; margin: 0 10px; font-weight: 600; font-size: 13px;">Website</a>
                <a href="mailto:kaizentechfest@gmail.com" style="color: #e94560; text-decoration: none; margin: 0 10px; font-weight: 600; font-size: 13px;">Contact Us</a>
            </div>
        </div>
    </div>
</body>
</html>
`;

// ========================================
// PDF CERTIFICATE GENERATOR
// ========================================
async function generateCertificatePDF(studentName: string, eventName: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 Landscape
    const { width, height } = page.getSize();
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    // Colors
    const primaryRed = rgb(0.86, 0.15, 0.15);
    const darkBlue = rgb(0.06, 0.2, 0.38);
    const gold = rgb(0.85, 0.65, 0.13);

    // Outer decorative border
    page.drawRectangle({
        x: 15,
        y: 15,
        width: width - 30,
        height: height - 30,
        borderColor: gold,
        borderWidth: 3,
    });

    // Inner border
    page.drawRectangle({
        x: 25,
        y: 25,
        width: width - 50,
        height: height - 50,
        borderColor: darkBlue,
        borderWidth: 1,
    });

    // Header line decoration
    page.drawLine({
        start: { x: 100, y: height - 80 },
        end: { x: width - 100, y: height - 80 },
        thickness: 2,
        color: gold,
    });

    // Title
    const titleText = "CERTIFICATE OF PARTICIPATION";
    const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 32);
    page.drawText(titleText, {
        x: (width - titleWidth) / 2,
        y: height - 120,
        size: 32,
        font: helveticaBold,
        color: primaryRed,
    });

    // Subtitle
    const subTitle = "KAIZEN 2026 - Annual Tech Fest";
    const subTitleWidth = helvetica.widthOfTextAtSize(subTitle, 16);
    page.drawText(subTitle, {
        x: (width - subTitleWidth) / 2,
        y: height - 150,
        size: 16,
        font: helvetica,
        color: darkBlue,
    });

    // Institute Name
    const instituteName = "Rajarambapu Institute of Technology, Islampur";
    const instituteWidth = helveticaOblique.widthOfTextAtSize(instituteName, 14);
    page.drawText(instituteName, {
        x: (width - instituteWidth) / 2,
        y: height - 175,
        size: 14,
        font: helveticaOblique,
        color: rgb(0.4, 0.4, 0.4),
    });

    // Certification text
    const certifyText = "This is to certify that";
    const certifyWidth = timesItalic.widthOfTextAtSize(certifyText, 18);
    page.drawText(certifyText, {
        x: (width - certifyWidth) / 2,
        y: height - 230,
        size: 18,
        font: timesItalic,
        color: rgb(0.3, 0.3, 0.3),
    });

    // Student Name (prominently displayed)
    const displayName = studentName.toUpperCase();
    const nameWidth = helveticaBold.widthOfTextAtSize(displayName, 36);
    page.drawText(displayName, {
        x: (width - nameWidth) / 2,
        y: height - 280,
        size: 36,
        font: helveticaBold,
        color: darkBlue,
    });

    // Underline for name
    page.drawLine({
        start: { x: (width - nameWidth) / 2 - 20, y: height - 290 },
        end: { x: (width + nameWidth) / 2 + 20, y: height - 290 },
        thickness: 1,
        color: gold,
    });

    // Participation text
    const participatedText = "has successfully participated in the event";
    const participatedWidth = timesRoman.widthOfTextAtSize(participatedText, 16);
    page.drawText(participatedText, {
        x: (width - participatedWidth) / 2,
        y: height - 330,
        size: 16,
        font: timesRoman,
        color: rgb(0.3, 0.3, 0.3),
    });

    // Event Name (prominently displayed)
    const eventDisplay = eventName.toUpperCase();
    const eventWidth = helveticaBold.widthOfTextAtSize(eventDisplay, 28);
    page.drawText(eventDisplay, {
        x: (width - eventWidth) / 2,
        y: height - 375,
        size: 28,
        font: helveticaBold,
        color: primaryRed,
    });

    // Date
    const dateText = "Held on " + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateWidth = helvetica.widthOfTextAtSize(dateText, 14);
    page.drawText(dateText, {
        x: (width - dateWidth) / 2,
        y: height - 410,
        size: 14,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
    });

    // Bottom decoration line
    page.drawLine({
        start: { x: 100, y: 130 },
        end: { x: width - 100, y: 130 },
        thickness: 1,
        color: gold,
    });

    // Left signature
    page.drawLine({
        start: { x: 120, y: 90 },
        end: { x: 280, y: 90 },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    const coordText = "Event Coordinator";
    const coordWidth = helvetica.widthOfTextAtSize(coordText, 11);
    page.drawText(coordText, {
        x: 120 + (160 - coordWidth) / 2,
        y: 72,
        size: 11,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
    });

    // Right signature
    page.drawLine({
        start: { x: width - 280, y: 90 },
        end: { x: width - 120, y: 90 },
        thickness: 1,
        color: rgb(0, 0, 0),
    });
    const directorText = "Fest Director";
    const directorWidth = helvetica.widthOfTextAtSize(directorText, 11);
    page.drawText(directorText, {
        x: width - 280 + (160 - directorWidth) / 2,
        y: 72,
        size: 11,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
    });

    // Watermark
    page.drawText("KAIZEN 2026", {
        x: width / 2 - 100,
        y: height / 2 - 50,
        size: 60,
        font: helveticaBold,
        color: rgb(0.95, 0.95, 0.95),
        opacity: 0.15,
    });

    return await pdfDoc.save();
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { to, type, data }: EmailRequest = await req.json();

        if (!to || !type || !data) {
            throw new Error("Missing required fields: to, type, or data");
        }

        let subject = "";
        let htmlContent = "";
        let attachments: any[] = [];

        const SMTP_EMAIL = Deno.env.get("SMTP_EMAIL") || "kaizentechfest@gmail.com";
        const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "bjpe cdpn lhvi ezfu";

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, 
            auth: {
                user: SMTP_EMAIL,
                pass: SMTP_PASSWORD,
            },
        });

        switch (type) {
            // =============================================
            // PARTICIPATION CERTIFICATE - NEW DEDICATED CASE
            // =============================================
            case "participation_certificate": {
                const studentName = data.name || "Participant";
                const eventName = data.eventName || "Event";
                
                subject = "Certificate of Participation - " + eventName;
                htmlContent = getCertificateEmailTemplate(studentName, eventName);

                // Generate PDF Certificate
                try {
                    console.log("Generating certificate for: " + studentName + ", Event: " + eventName);
                    const pdfBytes = await generateCertificatePDF(studentName, eventName);
                    
                    // Convert Uint8Array to base64 properly
                    let binary = '';
                    const len = pdfBytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(pdfBytes[i]);
                    }
                    const base64Pdf = btoa(binary);

                    attachments.push({
                        filename: "Certificate_" + studentName.replace(/\s+/g, '_') + "_" + eventName.replace(/\s+/g, '_') + ".pdf",
                        content: base64Pdf,
                        encoding: 'base64',
                        contentType: 'application/pdf'
                    });
                    
                    console.log("PDF certificate generated successfully");
                } catch (pdfError) {
                    console.error("PDF Generation Error:", pdfError);
                    htmlContent += '<p style="color: #ff6b6b; font-size: 12px; margin-top: 20px;">(Note: Certificate PDF could not be generated. Please contact support.)</p>';
                }
                break;
            }

            // =============================================
            // EXISTING TEMPLATES - UNCHANGED
            // =============================================
            case "paid_event_registration":
            case "paid_event_registered": {
                subject = "Registration Received: " + data.eventName;
                const bodyContent = `
                    <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Hello ${data.name},</h2>
                    <p>Thank you for registering for <strong style="color: #dc2626;">${data.eventName}</strong>. We have received your request.</p>
                    
                    ${data.isTeamMember && data.teamName ? `
                    <div style="background-color: #f3f4f6; border-left: 4px solid #9333ea; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <h3 style="color: #7e22ce; margin: 0 0 5px; font-size: 16px;">Team Registration</h3>
                        <p style="margin: 0;">You have been added to team <strong>${data.teamName}</strong>.</p>
                    </div>
                    ` : ''}

                    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                        <p style="color: #9a3412; margin: 0 0 5px; font-size: 13px; text-transform: uppercase; font-weight: 600;">Registration Fee</p>
                        <div style="font-size: 36px; font-weight: 700; color: #ea580c;">₹${data.registrationFee || 0}</div>
                    </div>

                    <div style="border-left: 4px solid #f59e0b; padding-left: 15px; margin: 25px 0;">
                        <h3 style="color: #b45309; margin: 0 0 8px; font-size: 18px;">First Come, First Serve</h3>
                        <p style="margin: 0; color: #4b5563;">
                            Seats are limited. We will review your registration and send you a <strong>Payment Link</strong> shortly if a slot is available.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 40px;">
                        <a href="https://www.kaizen-ritp.in/events" style="background-color: #f59e0b; color: #000000; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                            View Event Status
                        </a>
                    </div>
                `;
                htmlContent = getBaseTemplate(subject, bodyContent);
                break;
            }

            case "payment_link_notification": {
                subject = "Payment Link: " + data.eventName;
                const payAmount = data.amount || data.registrationFee || 0;
                const payLink = "upi://pay?pa=" + data.upiId + "&pn=KAIZEN_TechFest&am=" + payAmount + "&tn=" + encodeURIComponent(data.eventName || 'Event Fee');
                const qrUrl = data.customQrBase64 || "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(payLink);

                const bodyContent = `
                    <h2 style="color: #111827; margin-top: 0;">Payment Request</h2>
                    <p>Hello ${data.name},</p>
                    <p>Please complete your payment for <strong>${data.eventName}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                        <p style="text-transform: uppercase; color: #64748b; font-size: 12px; margin: 0 0 10px;">Amount to Pay</p>
                        <div style="font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 20px;">₹${payAmount}</div>
                        
                        <div style="background-color: white; padding: 10px; display: inline-block; border-radius: 8px; margin-bottom: 20px;">
                            <img src="${qrUrl}" alt="Payment QR" width="200" style="display: block;">
                        </div>

                        <div style="background-color: #eef2ff; padding: 12px; border-radius: 6px; font-family: monospace; color: #3730a3;">
                            ${data.upiId || 'Scan Code Above'}
                        </div>
                    </div>

                    <div style="text-align: center; margin-bottom: 20px;">
                        <p style="color: #ef4444; font-weight: 600;">Due by: ${data.paymentDeadline || 'As soon as possible'}</p>
                    </div>
                `;
                htmlContent = getBaseTemplate(subject, bodyContent);
                break;
            }

            case "slot_expired_notification": {
                subject = "Slot Expired: " + data.eventName;
                const bodyContent = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                        <h2 style="color: #111827; margin: 0;">Slot Expired</h2>
                    </div>
                    <p>Hello ${data.name},</p>
                    <p>The payment deadline for <strong>${data.eventName}</strong> has passed.</p>
                    <p>Your slot has been released. Register again if you wish to participate.</p>
                `;
                htmlContent = getBaseTemplate(subject, bodyContent);
                break;
            }

            case "fest_registration_pending": {
                subject = "Pending Verification: KAIZEN 2026 Registration";
                const bodyContent = `
                    <h2 style="color: #111827; margin-top: 0;">Registration Pending</h2>
                    <p>Hello ${data.name},</p>
                    <p>Your registration for <strong>KAIZEN 2026</strong> has been received!</p>
                    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 25px 0;">
                        <h3 style="color: #c2410c; margin: 0 0 5px;">Next Step: Verification</h3>
                        <p style="margin: 0; color: #431407;">
                            Our team is verifying your details. You will receive your <strong>Fest Code</strong> via email within 24-48 hours.
                        </p>
                    </div>
                `;
                htmlContent = getBaseTemplate(subject, bodyContent);
                break;
            }

            case "fest_code_approval":
            case "fest_pass_reminder": {
                subject = "Your Fest Pass: KAIZEN 2026";
                const bodyContent = `
                    <h2 style="color: #111827; margin-top: 0;">You're In!</h2>
                    <p>Hello ${data.name}, registration confirmed.</p>

                    <div style="background-color: #ffffff; border: 2px dashed #dc2626; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center;">
                        <p style="color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; margin: 0 0 10px;">Your Fest Code</p>
                        <div style="font-size: 32px; font-weight: 800; color: #dc2626; font-family: monospace; letter-spacing: 2px;">
                            ${data.festCode}
                        </div>
                    </div>

                    <ul style="color: #4b5563; padding-left: 20px;">
                        <li>Use code <strong>${data.festCode}</strong> to register for events.</li>
                        <li>Show QR code at entry gates.</li>
                    </ul>
                `;
                htmlContent = getBaseTemplate(subject, bodyContent);
                break;
            }

            case "registration_confirmation":
            case "payment_update": {
                const isCompleted = type === 'registration_confirmation' || data.paymentStatus?.toLowerCase() === 'completed';
                subject = isCompleted ? "Confirmed: " + data.eventName : "Payment Update: " + data.eventName;
                
                let qrSection = '';
                if (isCompleted && data.registrationId && data.eventId) {
                    try {
                        const encryptedPayload = generateQRPayload(data.registrationId, data.eventId, data.name);
                        const qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encryptedPayload;
                        qrSection = `
                            <div style="background-color: #f8fafc; border: 2px dashed #94a3b8; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <p style="text-transform: uppercase; color: #64748b; font-size: 12px; margin: 0 0 10px;">Your Entry Pass</p>
                                <div style="background-color: white; padding: 10px; display: inline-block; border-radius: 8px; margin-bottom: 20px;">
                                    <img src="${qrImageUrl}" alt="Entry QR Code" width="200" style="display: block;">
                                </div>
                                <p style="margin-top: 15px; font-size: 13px; color: #64748b;">Show this QR code at the event entrance.</p>
                            </div>
                        `;
                    } catch (e) {
                        console.error("QR Generation failed", e);
                    }
                }

                const bodyContent = isCompleted ? `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="width: 60px; height: 60px; background-color: #dcfce7; color: #16a34a; border-radius: 50%; line-height: 60px; font-size: 30px; margin: 0 auto 15px;">✓</div>
                        <h2 style="color: #111827; margin: 0;">Registration Confirmed</h2>
                    </div>
                    <p>Hello ${data.name},</p>
                    <p>You are officially registered for <strong style="color: #16a34a;">${data.eventName}</strong>. See you there!</p>
                    ${qrSection}
                ` : `
                    <h2>Payment Status Update</h2>
                    <p>Hello ${data.name},</p>
                    <p>The status for <strong>${data.eventName}</strong> is now: <strong>${data.paymentStatus}</strong></p>
                `;
                htmlContent = getBaseTemplate(subject, bodyContent);
                break;
            }

            case "admin_otp": {
                subject = "Admin Verification Code";
                const bodyContent = `
                    <div style="text-align: center;">
                        <h2 style="color: #111827;">Verification Code</h2>
                        <p style="color: #6b7280;">Please use this code to verify your identity.</p>
                        <div style="font-size: 42px; font-weight: 700; color: #111827; letter-spacing: 5px; margin: 30px 0; font-family: monospace;">
                            ${data.otp}
                        </div>
                        <p style="font-size: 13px; color: #9ca3af;">Expires in 5 minutes.</p>
                    </div>
                `;
                htmlContent = getBaseTemplate(subject, bodyContent);
                break;
            }

            default: {
                subject = "KAIZEN 2026 Notification";
                const bodyContent = '<p>' + (data.message || 'No message provided.') + '</p>';
                htmlContent = getBaseTemplate(subject, bodyContent);
            }
        }

        // Send email
        const mailOptions: any = {
            from: '"KAIZEN TechFest" <' + SMTP_EMAIL + '>',
            to: to,
            subject: subject,
            html: htmlContent,
        };

        if (attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);

        return new Response(JSON.stringify({ success: true, id: info.messageId }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error("Error sending email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
};

serve(handler);
