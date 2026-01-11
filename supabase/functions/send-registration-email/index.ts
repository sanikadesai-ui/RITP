// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.10";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
    to: string;
    type: "registration_confirmation" | "payment_update" | "general_notification" | "fest_code_approval" | "admin_otp" | "fest_pass_reminder" | "fest_registration_pending" | "paid_event_registered" | "payment_link_notification" | "slot_expired_notification";
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
    };
}

const getBaseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', user-select, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background: linear-gradient(90deg, #dc2626 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 32px; letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">KAIZEN 2026</h1>
            <p style="margin: 10px 0 0; font-size: 14px; letter-spacing: 1px; color: rgba(255,255,255,0.9); text-transform: uppercase;">Rajarambapu Institute of Technology</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px; color: #1f2937; line-height: 1.6;">
            ${content}
        </div>

        <!-- Footer -->
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

const handler = async (req: Request): Promise<Response> => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { to, type, data }: EmailRequest = await req.json();

        let subject = "";
        let bodyContent = "";

        // Using secrets from Supabase Dashboard
        const SMTP_EMAIL = Deno.env.get("SMTP_EMAIL") || "kaizentechfest@gmail.com";
        const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "bjpe cdpn lhvi ezfu"; // Replace with actual app password if not in env

        if (!SMTP_EMAIL || !SMTP_PASSWORD) {
            console.warn("SMTP credentials not found in env, using hardcoded fallback (DANGEROUS IN PROD)");
        }

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
            case "paid_event_registered":
                subject = `Registration Received: ${data.eventName}`;
                bodyContent = `
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

                    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                        Please keep an eye on your email. Once you receive the link, you will have limited time to complete the payment.
                    </p>
                `;
                break;

            case "payment_link_notification":
                subject = `Action Required: Payment for ${data.eventName}`;
                bodyContent = `
                    <h2 style="color: #111827; margin-top: 0;">Payment Link Ready</h2>
                    <p>Hello ${data.name}, your slot for <strong>${data.eventName}</strong> is reserved pending payment.</p>

                    <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
                        <p style="color: #1e40af; margin: 0 0 10px; font-size: 13px; text-transform: uppercase; font-weight: 600;">Amount Due</p>
                        <div style="font-size: 42px; font-weight: 800; color: #2563eb;">₹${data.registrationFee || 0}</div>
                        
                        ${data.upiId ? `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dbeafe;">
                            <p style="margin: 0; color: #4b5563;">UPI ID: <strong style="color: #1f2937; font-family: monospace; font-size: 16px;">${data.upiId}</strong></p>
                        </div>
                        ` : ''}
                    </div>

                    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <div style="display: flex; align-items: start; gap: 12px;">
                            <div style="font-size: 24px;">⏰</div>
                            <div>
                                <h3 style="color: #991b1b; margin: 0 0 5px; font-size: 16px; font-weight: 700;">Deadline: 48 Hours</h3>
                                <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
                                    Please complete payment by <strong>${data.paymentDeadline || 'Deadline'}</strong>. If missed, your slot will be passed to the next person.
                                </p>
                            </div>
                        </div>
                    </div>

                    <h3 style="color: #111827; font-size: 18px; margin-top: 30px;">How to Pay:</h3>
                    <ol style="margin: 0 0 20px 0; padding-left: 20px; color: #374151;">
                        <li style="margin-bottom: 8px;">Pay <strong>₹${data.registrationFee || 0}</strong> via UPI/App.</li>
                        <li style="margin-bottom: 8px;">Take a <strong>screenshot</strong> of the success screen.</li>
                        <li style="margin-bottom: 8px;"><strong>Reply to this email</strong> with the screenshot attached.</li>
                    </ol>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="mailto:kaizentechfest@gmail.com?subject=Payment Proof for ${data.eventName}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                            Reply with Proof
                        </a>
                    </div>
                `;
                break;

            case "payment_link_notification":
                subject = `Payment Link: ${data.eventName}`;
                // Use provided amount or registrationFee or default to 0
                const payAmount = data.amount || data.registrationFee || 0;
                
                // Generate UPI link if upiId is present
                // Format: upi://pay?pa=UPI_ID&pn=KAIZEN_RIT&am=AMOUNT&tn=Event_Fee
                const payLink = data.paymentLink?.startsWith('http') 
                    ? data.paymentLink 
                    : `upi://pay?pa=${data.paymentLink || data.upiId}&pn=KAIZEN_TechFest&am=${payAmount}&tn=${encodeURIComponent(data.eventName || 'Event Fee')}`;
                
                // Use custom QR if provided, otherwise generate one
                const qrUrl = data.customQrBase64 
                    ? data.customQrBase64 
                    : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payLink)}`;

                bodyContent = `
                    <h2 style="color: #111827; margin-top: 0;">Payment Request</h2>
                    <p>Hello ${data.name},</p>
                    <p>Please complete your payment for <strong>${data.eventName}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                        <p style="text-transform: uppercase; color: #64748b; font-size: 12px; margin: 0 0 10px;">Amount to Pay</p>
                        <div style="font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 20px;">₹${payAmount}</div>
                        
                        <div style="background-color: white; padding: 10px; display: inline-block; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px;">
                            <img src="${qrUrl}" alt="Payment QR" width="200" style="display: block; max-width: 100%; height: auto;">
                        </div>

                         <div style="background-color: #eef2ff; padding: 12px; border-radius: 6px; margin-top: 5px; font-family: monospace; color: #3730a3; word-break: break-all;">
                            ${data.paymentLink || data.upiId}
                         </div>

                        <p style="margin-top: 15px; font-size: 13px; color: #64748b;">
                            Scan QR or use the UPI ID above to pay.
                        </p>
                    </div>

                    <div style="text-align: center; margin-bottom: 20px;">
                        <p style="color: #ef4444; font-weight: 600;">Due by: ${data.paymentDeadline || 'As soon as possible'}</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="mailto:kaizentechfest@gmail.com?subject=Payment Proof for ${data.eventName}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                            Reply with Payment Screenshot
                        </a>
                    </div>
                `;
                break;

            case "slot_expired_notification":
                subject = `Slot Expired: ${data.eventName}`;
                bodyContent = `
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
                        <h2 style="color: #111827; margin: 0;">Slot Expired</h2>
                    </div>
                    
                    <p>Hello ${data.name},</p>
                    <p>We're sorry, but the payment deadline for <strong>${data.eventName}</strong> has passed.</p>
                    
                    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <p style="margin: 0; color: #4b5563;">
                            Your slot has been released to the waiting queue. If you still wish to participate, please register again to join the new queue.
                        </p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://www.kaizen-ritp.in/events" style="background-color: #4b5563; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                            View Events
                        </a>
                    </div>
                `;
                break;

            case "fest_registration_pending":
                subject = `Pending Verification: KAIZEN 2026 Registration`;
                bodyContent = `
                    <h2 style="color: #111827; margin-top: 0;">Registration Pending</h2>
                    <p>Hello ${data.name},</p>
                    <p>Your registration for <strong>KAIZEN 2026</strong> has been received! 📝</p>

                    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 25px 0; border-radius: 0 4px 4px 0;">
                        <h3 style="color: #c2410c; margin: 0 0 5px; font-size: 16px;">Next Step: Verification</h3>
                        <p style="margin: 0; color: #431407;">
                            Our team is verifying your details. You will receive your official <strong>Fest Code</strong> via email within 24-48 hours.
                        </p>
                    </div>

                    <p>You can check your status at any time on our website.</p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://www.kaizen-ritp.in" style="background-color: #f97316; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                            Check Status
                        </a>
                    </div>
                `;
                break;

            case "fest_code_approval":
            case "fest_pass_reminder":
                subject = `Your Fest Pass: KAIZEN 2026`;
                bodyContent = `
                    <h2 style="color: #111827; margin-top: 0;">You're In! 🎉</h2>
                    <p>Hello ${data.name}, registration confirmed.</p>

                    <div style="background-color: #ffffff; border: 2px dashed #dc2626; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center; background-image: radial-gradient(#fee2e2 1px, transparent 1px); background-size: 20px 20px;">
                        <p style="color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; margin: 0 0 10px;">Your Fest Code</p>
                        <div style="font-size: 32px; font-weight: 800; color: #dc2626; font-family: monospace; letter-spacing: 2px;">
                            ${data.festCode}
                        </div>
                    </div>

                    <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                        <h3 style="color: #1e40af; margin: 0 0 10px; font-size: 16px;">🎟️ Get Your Digital Pass</h3>
                        <p style="margin: 0 0 15px; color: #1e3a8a;">
                            Download your Fest Pass with QR Code for smooth entry.
                        </p>
                        <a href="https://www.kaizen-ritp.in" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                            Download Pass
                        </a>
                    </div>

                    <ul style="color: #4b5563; padding-left: 20px;">
                        <li>Use code <strong>${data.festCode}</strong> to register for events.</li>
                        <li>Show QR code at entry gates.</li>
                    </ul>
                `;
                break;

            case "registration_confirmation":
            case "payment_update":
                const isCompleted = type === 'registration_confirmation' || data.paymentStatus?.toLowerCase() === 'completed';
                subject = isCompleted ? `Confirmed: ${data.eventName}` : `Payment Update: ${data.eventName}`;
                
                if (isCompleted) {
                    bodyContent = `
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div style="width: 60px; height: 60px; background-color: #dcfce7; color: #16a34a; border-radius: 50%; line-height: 60px; font-size: 30px; margin: 0 auto 15px;">✓</div>
                            <h2 style="color: #111827; margin: 0;">Registration Confirmed</h2>
                        </div>
                        
                        <p>Hello ${data.name},</p>
                        <p>You are officially registered for <strong style="color: #16a34a;">${data.eventName}</strong>. See you there!</p>

                        <div style="text-align: center; margin-top: 30px;">
                             <a href="https://www.kaizen-ritp.in" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                                View Dashboard
                            </a>
                        </div>
                    `;
                } else {
                    bodyContent = `
                        <h2>Payment Status Update</h2>
                        <p>Hello ${data.name},</p>
                        <p>The status for <strong>${data.eventName}</strong> is now: <strong>${data.paymentStatus}</strong></p>
                    `;
                }
                break;

            case "admin_otp":
                subject = "Admin Verification Code";
                bodyContent = `
                    <div style="text-align: center;">
                        <h2 style="color: #111827;">Verification Code</h2>
                        <p style="color: #6b7280;">Please use this code to verify your identity.</p>
                        <div style="font-size: 42px; font-weight: 700; color: #111827; letter-spacing: 5px; margin: 30px 0; font-family: monospace;">
                            ${data.otp}
                        </div>
                        <p style="font-size: 13px; color: #9ca3af;">Expires in 5 minutes.</p>
                    </div>
                `;
                break;

            default:
                subject = "Notification";
                bodyContent = `<p>${data.message}</p>`;
        }

        const htmlContent = getBaseTemplate(subject, bodyContent);

        const info = await transporter.sendMail({
            from: `"KAIZEN TechFest" <${SMTP_EMAIL}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });

        console.log("Email sent:", info.messageId);

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
