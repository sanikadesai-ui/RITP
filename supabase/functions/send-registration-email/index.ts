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
    type: "registration_confirmation" | "payment_update" | "general_notification" | "fest_code_approval" | "admin_otp" | "fest_pass_reminder" | "fest_registration_pending";
    data: {
        name: string;
        eventName?: string;
        paymentStatus?: string;
        message?: string;
        festCode?: string;
        otp?: string;
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
                subject = `Registration Confirmed: ${data.eventName}`;
                htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h1 style="color: #dc2626; text-align: center;">Welcome to KAIZEN!</h1>
            <p>Hi ${data.name},</p>
            <p>You have successfully registered for <strong>${data.eventName}</strong>.</p>
            <p>We look forward to seeing you there!</p>
          </div>
        `;
                break;
            case "payment_update":
                if (data.paymentStatus?.toLowerCase() === 'completed') {
                    subject = `Payment Verified - Registration Confirmed for ${data.eventName}`;
                    htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h1 style="color: #16a34a; text-align: center;">Payment Verified!</h1>
                <p>Hi <strong>${data.name}</strong>,</p>
                <p>Congratulations! Your payment for <strong>${data.eventName}</strong> has been successfully verified.</p>
                
                <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #16a34a;">
                    <h3 style="margin-top: 0; color: #166534;">Your QR Code Ticket is Ready</h3>
                    <p style="margin-bottom: 0;">You can now access your entry pass on our website.</p>
                </div>

                <h3>How to access your QR Code:</h3>
                <ol>
                    <li>Visit <a href="https://www.kaizen-ritp.in" style="color: #dc2626; text-decoration: none;">www.kaizen-ritp.in</a></li>
                    <li>Login with your registered email</li>
                    <li>Go to your <strong>Profile / Dashboard</strong></li>
                    <li>Click on <strong>"My Events"</strong> to view your QR Pass</li>
                </ol>
                
                <p style="margin-top: 30px; font-size: 12px; color: #666;">If you have any questions, please reply to this email.</p>
              </div>
            `;
                } else {
                    subject = `Payment Status Update: ${data.eventName}`;
                    htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h1>Payment Update</h1>
                <p>Hi ${data.name},</p>
                <p>Your payment for <strong>${data.eventName}</strong> has been marked as <strong>${data.paymentStatus}</strong>.</p>
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
