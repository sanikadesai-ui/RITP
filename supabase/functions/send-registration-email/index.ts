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
    type: "registration_confirmation" | "payment_update" | "general_notification" | "fest_code_approval" | "admin_otp" | "fest_pass_reminder" | "fest_registration_pending" | "paid_event_registered" | "payment_link_notification" | "slot_expired_notification" | "paid_event_registration";
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
        paymentDeadline?: string;
        deadlineHours?: number;
        upiId?: string;
        queuePosition?: number;
        phone?: string;
        college?: string;
    };
}

const handler = async (req: Request): Promise<Response> => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { to, type, data }: EmailRequest = await req.json();

        let subject = "";
        let htmlContent = "";

        // Using secrets from Supabase Dashboard
        const SMTP_EMAIL = Deno.env.get("SMTP_EMAIL") || "kaizentechfest@gmail.com";
        const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "bjpe cdpn lhvi ezfu"; // Replace with actual app password if not in env

        if (!SMTP_EMAIL || !SMTP_PASSWORD) {
            // Fallback for local development if env vars are missing
            console.warn("SMTP credentials not found in env, using hardcoded fallback (DANGEROUS IN PROD)");
        }

        // Create Nodemailer Transporter with explicit settings
        console.log("SMTP Config:", {
            user: SMTP_EMAIL,
            passLength: SMTP_PASSWORD?.length
        });

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // use SSL
            auth: {
                user: SMTP_EMAIL,
                pass: SMTP_PASSWORD,
            },
        });

        // Verify connection configuration
        await new Promise((resolve, reject) => {
            transporter.verify(function (error: any, success: any) {
                if (error) {
                    console.error("SMTP Connection Error:", error);
                    reject(error);
                } else {
                    console.log(" Server is ready to take our messages");
                    resolve(success);
                }
            });
        });

        switch (type) {

<<<<<<< Updated upstream
<<<<<<< Updated upstream
            case "paid_event_registered":
                subject = `🎯 Registration Received: ${data.eventName} - KAIZEN 2026`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #f59e0b;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #000000; text-shadow: 0 2px 4px rgba(255,255,255,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #000000; text-transform: uppercase; opacity: 0.9;">🎯 Event Registration Received</p>
=======
=======
>>>>>>> Stashed changes
            case "paid_event_registration":
                subject = `🎟️ Registration Received - ${data.eventName} | KAIZEN 2026`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #3b82f6;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">🎟️ Your Spot is Reserved!</p>
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        <p style="color: #cccccc; line-height: 1.6;">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
                            ${data.isTeamMember 
                                ? `You have been added to team <strong style="color: #f59e0b;">${data.teamName}</strong> for <strong style="color: #dc2626;">${data.eventName}</strong>!`
                                : `Thank you for registering for <strong style="color: #dc2626;">${data.eventName}</strong> at KAIZEN 2026!`
                            }
                        </p>

                        ${data.isTeamMember && data.teamName ? `
                        <div style="background-color: #1a1a1a; border-left: 4px solid #9333ea; padding: 20px; margin: 20px 0;">
                            <h3 style="color: #9333ea; margin: 0 0 10px;">👥 Team Details</h3>
                            <p style="color: #cccccc; margin: 0;"><strong>Team Name:</strong> ${data.teamName}</p>
                            <p style="color: #888; margin-top: 5px; font-size: 12px;">Your team leader will receive the payment link.</p>
                        </div>
                        ` : ''}

                        <!-- Registration Fee Box -->
                        <div style="background-color: #000000; border: 2px solid #f59e0b; box-shadow: 0 0 15px rgba(245, 158, 11, 0.3); border-radius: 4px; padding: 25px; margin: 30px 0; text-align: center;">
                            <p style="color: #888; margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Registration Fee</p>
                            <div style="font-size: 42px; font-weight: 800; color: #f59e0b; font-family: 'Courier New', monospace;">
                                ₹${data.registrationFee || 0}
                            </div>
                        </div>

                        <!-- First Come First Serve Notice -->
                        <div style="background: linear-gradient(135deg, #78350f 0%, #451a03 100%); border-left: 4px solid #f59e0b; padding: 25px; margin: 30px 0; border-radius: 4px;">
                            <h3 style="color: #fbbf24; margin: 0 0 15px; font-size: 18px;">⏳ First Come, First Serve</h3>
                            <p style="color: #fef3c7; line-height: 1.8; margin: 0;">
                                <strong>We will contact you soon</strong> with the payment link. Seats for this event are limited and will be allocated on a <strong>first come, first serve</strong> basis.
                            </p>
                            <p style="color: #fde68a; font-size: 13px; margin-top: 15px;">
                                📧 Keep an eye on your inbox and phone for the payment link!
                            </p>
                        </div>

                        <!-- Important Warning -->
                        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); border: 2px solid #dc2626; padding: 20px; margin: 30px 0; border-radius: 4px;">
                            <h3 style="color: #fca5a5; margin: 0 0 10px; font-size: 16px;">⚠️ Important: Limited Time Offer</h3>
                            <p style="color: #fecaca; line-height: 1.6; margin: 0; font-size: 14px;">
                                Once you receive the payment link, you will have <strong>48 hours</strong> to complete the payment. 
                                <strong style="color: #f87171;">If payment is not received within the deadline, your slot will be given to the next person in queue.</strong>
                            </p>
                        </div>

                        <!-- What Happens Next -->
                        <div style="background-color: #1a1a1a; border: 1px solid #333; border-radius: 4px; padding: 25px; margin: 30px 0;">
                            <h3 style="color: #ffffff; margin: 0 0 15px;">📋 What Happens Next?</h3>
                            <ol style="color: #cccccc; line-height: 2; margin: 0; padding-left: 20px;">
                                <li>Our team reviews your registration</li>
                                <li>You'll receive a <strong>payment link</strong> via email</li>
                                <li>Complete payment within <strong>48 hours</strong></li>
                                <li><strong>Reply to the email</strong> with payment screenshot</li>
                                <li>Your spot is confirmed! 🎉</li>
                            </ol>
                        </div>

                        <div style="text-align: center; margin-top: 40px;">
                            <a href="https://www.kaizen-ritp.in" style="background-color: #f59e0b; color: #000000; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                                Check Registration Status
                            </a>
                        </div>

                        <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                            Questions? Reply to this email or contact us at kaizentechfest@gmail.com
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
                `;
                break;

            case "payment_link_notification":
                subject = `💳 Payment Link: ${data.eventName} - Complete Within ${data.deadlineHours || 48} Hours!`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #16a34a 0%, #15803d 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #16a34a;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">💳 Your Payment Link is Here!</p>
                    </div>

                    <!-- Urgent Banner -->
                    <div style="background: linear-gradient(90deg, #dc2626 0%, #b91c1c 100%); padding: 15px; text-align: center;">
                        <p style="margin: 0; color: #ffffff; font-weight: bold; font-size: 16px;">
                            ⏰ DEADLINE: ${data.paymentDeadline || 'Within 48 hours'}
                        </p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        <p style="color: #cccccc; line-height: 1.6;">
                            Great news! Your slot for <strong style="color: #16a34a;">${data.eventName}</strong> is ready. Complete your payment now to confirm your spot!
                        </p>

                        ${data.queuePosition ? `
                        <div style="background-color: #1a1a1a; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
                            <p style="color: #60a5fa; margin: 0; font-size: 14px;">
                                🎫 Your Queue Position: <strong>#${data.queuePosition}</strong>
                            </p>
                        </div>
                        ` : ''}

                        <!-- Payment Details Box -->
                        <div style="background-color: #000000; border: 2px solid #16a34a; box-shadow: 0 0 15px rgba(22, 163, 74, 0.3); border-radius: 4px; padding: 25px; margin: 30px 0; text-align: center;">
                            <p style="color: #888; margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Amount to Pay</p>
                            <div style="font-size: 48px; font-weight: 800; color: #16a34a; font-family: 'Courier New', monospace;">
                                ₹${data.registrationFee || 0}
                            </div>
                            ${data.upiId ? `
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                                <p style="color: #888; margin: 0 0 5px; font-size: 12px;">UPI ID</p>
                                <p style="color: #22c55e; font-size: 18px; font-weight: bold; margin: 0; font-family: monospace;">${data.upiId}</p>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Critical Warning -->
                        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); border: 2px solid #dc2626; padding: 25px; margin: 30px 0; border-radius: 4px;">
                            <h3 style="color: #fca5a5; margin: 0 0 15px; font-size: 18px;">🚨 CRITICAL: Do Not Miss Your Slot!</h3>
                            <ul style="color: #fecaca; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Complete payment before: <strong>${data.paymentDeadline || 'Within 48 hours'}</strong></li>
                                <li><strong style="color: #f87171;">If you don't pay in time, your slot will be given to the next person in queue!</strong></li>
                                <li>No extensions will be provided</li>
                            </ul>
                        </div>

                        <!-- How to Pay -->
                        <div style="background-color: #1a1a1a; border: 1px solid #333; border-radius: 4px; padding: 25px; margin: 30px 0;">
                            <h3 style="color: #22c55e; margin: 0 0 15px;">📱 How to Complete Payment</h3>
                            <ol style="color: #cccccc; line-height: 2.2; margin: 0; padding-left: 20px;">
                                <li>Pay <strong>₹${data.registrationFee || 0}</strong> using UPI/NEFT/IMPS</li>
                                <li>Take a <strong>screenshot</strong> of the payment confirmation</li>
                                <li><strong style="color: #22c55e;">Reply to this email</strong> with the screenshot attached</li>
                                <li>We'll verify and confirm your spot within 24 hours</li>
                            </ol>
                        </div>

                        <!-- Payment Proof Box -->
                        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border: 2px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                            <h3 style="color: #93c5fd; margin: 0 0 10px; font-size: 16px;">📎 Payment Proof Required</h3>
                            <p style="color: #bfdbfe; line-height: 1.6; margin: 0; font-size: 14px;">
                                After payment, <strong>reply to this email</strong> with:
                            </p>
                            <ul style="color: #bfdbfe; margin: 10px 0 0; padding-left: 20px; font-size: 14px;">
                                <li>Payment screenshot attached</li>
                                <li>Transaction ID / UTR number</li>
                                <li>Your registered name</li>
                            </ul>
                        </div>

                        <div style="text-align: center; margin-top: 40px;">
                            <p style="color: #888; font-size: 14px; margin-bottom: 15px;">After payment, reply to this email with screenshot</p>
                        </div>

                        <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                            Questions? Reply to this email or contact us at kaizentechfest@gmail.com
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
                `;
                break;

            case "slot_expired_notification":
                subject = `❌ Slot Expired: ${data.eventName} - KAIZEN 2026`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #dc2626;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">❌ Payment Deadline Missed</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        
                        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%); border: 2px solid #dc2626; padding: 25px; margin: 30px 0; border-radius: 4px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">😔</div>
                            <h3 style="color: #fca5a5; margin: 0 0 10px;">Your Slot Has Expired</h3>
                            <p style="color: #fecaca; line-height: 1.6; margin: 0;">
                                Unfortunately, we did not receive your payment for <strong>${data.eventName}</strong> within the deadline.
                            </p>
                        </div>

                        <p style="color: #cccccc; line-height: 1.6;">
                            As per our first come, first serve policy, your slot has been allocated to the next person in the queue.
                        </p>

                        <div style="background-color: #1a1a1a; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #f59e0b; margin: 0 0 10px;">🔄 Want to Try Again?</h3>
                            <p style="color: #cccccc; line-height: 1.6; margin: 0;">
                                You can register again for this event. However, you will be placed at the end of the queue and will receive a new payment link based on availability.
=======
=======
>>>>>>> Stashed changes
                            Thank you for registering for <strong style="color: #3b82f6;">${data.eventName}</strong>! Your spot has been reserved.
                        </p>

                        ${data.isTeamMember && data.teamName ? `
                        <div style="background-color: #1a1a1a; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0;">
                            <h3 style="color: #8b5cf6; margin: 0 0 10px;">👥 Team Registration</h3>
                            <p style="color: #cccccc; margin: 0;"><strong>Team Name:</strong> ${data.teamName}</p>
                            <p style="color: #888; margin-top: 5px; font-size: 12px;">You have been added to this team.</p>
                        </div>
                        ` : ''}

                        <div style="background-color: #000000; border: 2px solid #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); border-radius: 4px; padding: 25px; margin: 30px 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 15px;">
                                <span style="color: #888; font-size: 14px;">Event</span>
                                <span style="color: #ffffff; font-weight: bold;">${data.eventName}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #888; font-size: 14px;">Registration Fee</span>
                                <span style="font-size: 28px; font-weight: 800; color: #22c55e;">₹${data.registrationFee || 0}</span>
                            </div>
                        </div>

                        <div style="background-color: #1a1a1a; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #f59e0b; margin: 0 0 15px;">⏳ What Happens Next?</h3>
                            <p style="color: #cccccc; line-height: 1.8; margin: 0;">
                                <strong>We will contact you shortly!</strong><br><br>
                                Our team will reach out to you via email or phone with the payment link to complete your registration and confirm your seat.
                            </p>
                            <p style="color: #f59e0b; margin-top: 15px; font-size: 14px; font-weight: bold;">
                                🎯 First Come, First Serve - Your spot is reserved!
                            </p>
                        </div>

                        <div style="background-color: #16a34a20; border: 1px solid #16a34a50; padding: 20px; margin: 30px 0; border-radius: 4px;">
                            <h3 style="color: #22c55e; margin: 0 0 10px;">💡 Our Promise</h3>
                            <p style="color: #cccccc; margin: 0; line-height: 1.6;">
                                We believe in giving every student a fair chance. That's why we follow the <strong style="color: #22c55e;">First Come, First Serve</strong> model - register early and we'll reach out with payment details so you have proper time to complete your registration.
                            </p>
                        </div>

                        <div style="background-color: #1a1a1a; padding: 20px; border-radius: 4px; margin: 30px 0;">
                            <h3 style="color: #ffffff; margin: 0 0 10px;">📞 Contact Details on File</h3>
                            <p style="color: #888; margin: 0; font-size: 14px;">We'll use these to contact you:</p>
                            <p style="color: #cccccc; margin: 10px 0 0;">
                                📧 Email: <strong>${to}</strong><br>
                                ${data.phone ? `📱 Phone: <strong>${data.phone}</strong>` : ''}
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
                            </p>
                        </div>

                        <div style="text-align: center; margin-top: 40px;">
<<<<<<< Updated upstream
<<<<<<< Updated upstream
                            <a href="https://www.kaizen-ritp.in/events" style="background-color: #f59e0b; color: #000000; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                                Register Again
                            </a>
                        </div>

=======
=======
>>>>>>> Stashed changes
                            <a href="https://www.kaizen-ritp.in/events" style="background-color: #3b82f6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #3b82f6; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);">
                                View All Events
                            </a>
                        </div>
                        
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
                        <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                            Questions? Reply to this email or contact us at kaizentechfest@gmail.com
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
                `;
                break;

            case "fest_registration_pending":
                subject = `📝 Registration Received - KAIZEN 2026`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #dc2626 0%, #9333ea 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #dc2626;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">📝 Registration Received - Pending Verification</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        <p style="color: #cccccc; line-height: 1.6;">
                            Thank you for registering for <strong style="color: #dc2626;">KAIZEN 2026</strong>! Your registration has been received and is now pending payment verification.
                        </p>

                        <div style="background-color: #1a1a1a; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #f59e0b; margin: 0 0 10px;">⏳ What Happens Next?</h3>
                            <ol style="color: #cccccc; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Our team will verify your payment proof</li>
                                <li>Once verified, you'll receive an email with your <strong>Fest Code</strong></li>
                                <li>Use the Fest Code to get your <strong>Fest Pass</strong> with QR code</li>
                            </ol>
                            <p style="color: #888; margin-top: 15px; font-size: 12px;">Verification typically takes 24-48 hours.</p>
                        </div>

                        <div style="background-color: #000000; border: 2px solid #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); border-radius: 4px; padding: 25px; margin: 30px 0; text-align: center;">
                            <h3 style="color: #3b82f6; margin: 0 0 15px;">📱 Check Your Registration Status</h3>
                            <p style="color: #cccccc; margin: 0 0 15px; font-size: 14px;">Track your verification status anytime:</p>
                            <ol style="color: #cccccc; line-height: 1.8; margin: 0; padding-left: 20px; text-align: left;">
                                <li>Visit <a href="https://www.kaizen-ritp.in" style="color: #3b82f6;">www.kaizen-ritp.in</a></li>
                                <li>Click on <strong>"Check Status"</strong> in the menu</li>
                                <li>Enter your email: <strong style="color: #3b82f6;">${to}</strong></li>
                                <li>View your registration status</li>
                            </ol>
                        </div>

                        <div style="text-align: center; margin-top: 40px;">
                            <a href="https://www.kaizen-ritp.in" style="background-color: #3b82f6; color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #3b82f6;">
                                Check Status
                            </a>
                        </div>

                        <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                            Questions? Reply to this email or contact us at kaizentechfest@gmail.com
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
                `;
                break;

            case "fest_code_approval":
                subject = `🎫 Payment Verified - Get Your KAIZEN 2026 Fest Pass!`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #dc2626 0%, #9333ea 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #dc2626;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">🎉 Payment Verified & Registration Confirmed 🎉</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        <p style="color: #cccccc; line-height: 1.6;">
                            The gate is open. Your payment has been verified. You are now officially registered for <strong style="color: #dc2626;">KAIZEN 2026</strong>.
                        </p>

                        <div style="background-color: #000000; border: 2px solid #dc2626; box-shadow: 0 0 15px rgba(220, 38, 38, 0.3); border-radius: 4px; padding: 25px; margin: 30px 0; text-align: center;">
                            <p style="color: #888; margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your Unique Fest Registration Code</p>
                            <div style="font-size: 36px; font-weight: 800; color: #ff0000; letter-spacing: 4px; font-family: 'Courier New', monospace; text-shadow: 0 0 10px #ff0000;">
                                ${data.festCode}
                            </div>
                            <p style="color: #888; margin: 10px 0 0; font-size: 12px;">Save this code - you'll need it!</p>
                        </div>

                        <div style="background-color: #1a1a1a; border-left: 4px solid #22c55e; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #22c55e; margin: 0 0 10px;">🎫 GET YOUR FEST PASS NOW!</h3>
                            <ol style="color: #cccccc; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Visit <a href="https://www.kaizen-ritp.in" style="color: #dc2626;">www.kaizen-ritp.in</a></li>
                                <li>Click on <strong>"Check Status"</strong> in the menu</li>
                                <li>Enter your email and click Search</li>
                                <li>Click the <strong>"GET YOUR FEST PASS"</strong> button</li>
                                <li>Download your pass with QR code!</li>
                            </ol>
                        </div>

                        <p style="color: #cccccc; line-height: 1.6;">
                            <strong>Your Fest Pass includes:</strong><br>
                            ✅ QR Code for entry & attendance<br>
                            ✅ Access to all open events<br>
                            ✅ Use code <strong>${data.festCode}</strong> to register for paid events
                        </p>

                        <div style="text-align: center; margin-top: 40px;">
                            <a href="https://www.kaizen-ritp.in" style="background-color: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #ff0000; box-shadow: 0 0 10px rgba(220, 38, 38, 0.5);">
                                Get Your Fest Pass
                            </a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
                `;
                break;

            case "admin_otp":
                const otpCode = data.otp || "ERROR";
                console.log("Sending OTP:", otpCode);
                subject = `Admin Login Verification Code - KAIZEN 2026`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #dc2626 0%, #9333ea 100%); padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 24px; color: #ffffff;">KAIZEN ADMIN</h1>
                    </div>
                    <div style="padding: 40px 30px; background-color: #0a0a0a; text-align: center;">
                        <h2 style="color: #ffffff; margin-top: 0;">Verification Code</h2>
                        <p style="color: #cccccc;">Use the following code to complete your login:</p>
                        <div style="font-size: 48px; font-weight: 800; color: #dc2626; letter-spacing: 8px; margin: 30px 0;">
                            ${otpCode}
                        </div>
                        <p style="color: #666; font-size: 12px;">This code will expire in 5 minutes.</p>
                    </div>
                </div>
                `;
                break;

            case "fest_pass_reminder":
                subject = `🎫 Get Your KAIZEN 2026 Fest Pass Now!`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #dc2626 0%, #9333ea 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #dc2626;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 18px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">🎫 Your Fest Pass is Ready!</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        <p style="color: #cccccc; line-height: 1.6;">
                            Great news! Your payment has been verified and your <strong style="color: #dc2626;">Fest Pass</strong> is ready to download!
                        </p>

                        <div style="background-color: #000000; border: 2px solid #dc2626; box-shadow: 0 0 15px rgba(220, 38, 38, 0.3); border-radius: 4px; padding: 25px; margin: 30px 0; text-align: center;">
                            <p style="color: #888; margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your Fest Registration Code</p>
                            <div style="font-size: 36px; font-weight: 800; color: #ff0000; letter-spacing: 4px; font-family: 'Courier New', monospace; text-shadow: 0 0 10px #ff0000;">
                                ${data.festCode}
                            </div>
                        </div>

                        <div style="background-color: #1a1a1a; border-left: 4px solid #22c55e; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #22c55e; margin: 0 0 10px;">📱 How to Get Your Fest Pass:</h3>
                            <ol style="color: #cccccc; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Visit <a href="https://www.kaizen-ritp.in" style="color: #dc2626;">www.kaizen-ritp.in</a></li>
                                <li>Click on <strong>"Check Status"</strong> in the menu</li>
                                <li>Enter your email and click Search</li>
                                <li>Click <strong>"GET YOUR FEST PASS"</strong> button</li>
                                <li>Download your pass with QR code!</li>
                            </ol>
                        </div>

                        <p style="color: #cccccc; line-height: 1.6;">
                            <strong>🎉 Your Fest Pass includes:</strong><br>
                            ✅ Entry to KAIZEN 2026<br>
                            ✅ QR Code for attendance tracking<br>
                            ✅ Access to all open events<br>
                            ✅ Use your code to register for paid events
                        </p>

                        <div style="text-align: center; margin-top: 40px;">
                            <a href="https://www.kaizen-ritp.in" style="background-color: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #ff0000; box-shadow: 0 0 10px rgba(220, 38, 38, 0.5);">
                                Get Your Fest Pass Now
                            </a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
                `;
                break;

            case "registration_confirmation":
                subject = `Event Registration Confirmed: ${data.eventName} - KAIZEN 2026`;
                htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #dc2626 0%, #9333ea 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #dc2626;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">🎉 Event Registration Confirmed</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        <p style="color: #cccccc; line-height: 1.6;">
                            You have successfully registered for <strong style="color: #dc2626;">${data.eventName}</strong> at KAIZEN 2026! We are thrilled to have you compete.
                        </p>

                        ${data.isTeamMember && data.teamName ? `
                        <div style="background-color: #1a1a1a; border-left: 4px solid #9333ea; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #9333ea; margin: 0 0 10px;">👥 Team Details</h3>
                            <p style="color: #cccccc; margin: 0;"><strong>Team Name:</strong> ${data.teamName}</p>
                            <p style="color: #888; margin-top: 5px; font-size: 12px;">You have been added to this team.</p>
                        </div>
                        ` : ''}

                        <div style="background-color: #000000; border: 1px solid #333; border-radius: 4px; padding: 25px; margin: 30px 0;">
                            <h3 style="color: #dc2626; margin: 0 0 15px;">📅 Next Steps</h3>
                            <ul style="color: #cccccc; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Check the schedule on our website for event timings.</li>
                                <li>Bring your <strong>Fest Pass QR Code</strong> for entry (Essential).</li>
                                <li>Report to the venue 30 minutes before the event starts.</li>
                            </ul>
                        </div>

                        <div style="text-align: center; margin-top: 40px;">
                            <a href="https://www.kaizen-ritp.in/events" style="background-color: #dc2626; color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #ff0000; box-shadow: 0 0 10px rgba(220, 38, 38, 0.5);">
                                View Event Details
                            </a>
                        </div>
                        
                        <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                            Questions? Reply to this email or contact the event coordinators directly on the website.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
                `;
                break;
            case "payment_update":
                if (data.paymentStatus?.toLowerCase() === 'completed') {
                    subject = `Payment Verified - Event Registration Confirmed: ${data.eventName}`;
                    htmlContent = `
                <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; background-color: #000000; color: #e0e0e0; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(90deg, #16a34a 0%, #059669 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #16a34a;">
                        <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 42px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">KAIZEN 2026</h1>
                        <p style="margin: 15px 0 0; font-size: 14px; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; opacity: 0.9;">✅ Payment Success & Registration Confirmed</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 40px 30px; background-color: #0a0a0a;">
                        <h2 style="color: #ffffff; margin-top: 0; font-weight: normal; letter-spacing: 1px;">Hello ${data.name},</h2>
                        <p style="color: #cccccc; line-height: 1.6;">
                            Your payment has been verified! You are now officially registered for <strong style="color: #16a34a;">${data.eventName}</strong>.
                        </p>

                        <div style="background-color: #1a1a1a; border-left: 4px solid #16a34a; padding: 20px; margin: 30px 0;">
                            <h3 style="color: #16a34a; margin: 0 0 10px;">🎉 Registration Complete!</h3>
                            <p style="color: #cccccc; margin: 0;">We have received your payment and your spot is secured.</p>
                        </div>

                        <p style="color: #cccccc; line-height: 1.6;">
                            Make sure to keep your <strong>Fest Pass QR Code</strong> handy, as it will be used for entry to the event venue.
                        </p>

                        <div style="text-align: center; margin-top: 40px;">
                            <a href="https://www.kaizen-ritp.in" style="background-color: #16a34a; color: white; padding: 14px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #22c55e;">
                                Go to Dashboard
                            </a>
                        </div>
                    </div>
                     <!-- Footer -->
                    <div style="background-color: #000000; padding: 20px; text-align: center; border-top: 1px solid #333;">
                        <p style="color: #52525b; font-size: 12px; margin: 0;">
                            &copy; 2026 KAIZEN Team. All rights reserved.<br>
                            Rajarambapu Institute of Technology
                        </p>
                    </div>
                </div>
            `;
                } else {
                    subject = `Payment Status Update: ${data.eventName}`;
                    htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h1>Payment Update</h1>
                <p>Hi ${data.name},</p>
                <p>Your payment for <strong>${data.eventName}</strong> has been marked as <strong>${data.paymentStatus}</strong>.</p>
                <p>Please check your dashboard for more details.</p>
              </div>
            `;
                }
                break;
            default:
                subject = "Notification from KAIZEN";
                htmlContent = `<p>${data.message}</p>`;
        }

        // Send Email
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
