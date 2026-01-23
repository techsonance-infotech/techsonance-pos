import nodemailer from 'nodemailer'

// Email configuration from environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
})

/**
 * Send Password Reset OTP Email
 * @param email - Recipient email address
 * @param otp - 6-digit OTP code
 * @param expiryMinutes - OTP validity in minutes (default: 5)
 */
export async function sendPasswordResetOTP(
    email: string,
    otp: string,
    expiryMinutes: number = 5
): Promise<boolean> {
    const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                🔐 Password Reset
                            </h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                                SyncServe POS
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                                Hello,
                            </p>
                            <p style="margin: 0 0 30px; color: #333; font-size: 16px; line-height: 1.6;">
                                We received a request to reset your password. Use the following OTP to proceed:
                            </p>
                            
                            <!-- OTP Box -->
                            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px;">
                                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                                    Your OTP Code
                                </p>
                                <p style="margin: 0; color: #c2410c; font-size: 42px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                    ${otp}
                                </p>
                            </div>
                            
                            <!-- Expiry Warning -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 0 0 30px;">
                                <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 600;">
                                    ⏰ This OTP expires in ${expiryMinutes} minutes
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 15px; color: #666; font-size: 14px; line-height: 1.6;">
                                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                            </p>
                            
                            <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                                For security reasons, do not share this OTP with anyone.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px; text-align: center;">
                                This is an automated email from SyncServe POS. Please do not reply.
                            </p>
                            <p style="margin: 0; color: #f97316; font-size: 12px; text-align: center; font-weight: 600;">
                                Powered by SyncServe
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'SyncServe <noreply@syncserve.com>',
            to: email,
            subject: '🔐 Password Reset OTP - SyncServe',
            html: emailTemplate,
        })
        console.log(`Password reset OTP sent to ${email}`)
        return true
    } catch (error) {
        console.error('Failed to send password reset email:', error)
        return false
    }
}

/**
 * Send Password Reset Success Email
 * @param email - Recipient email address
 */
export async function sendPasswordResetSuccess(email: string): Promise<boolean> {
    const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                ✅ Password Reset Successful
                            </h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                                SyncServe POS
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                                Hello,
                            </p>
                            <p style="margin: 0 0 30px; color: #333; font-size: 16px; line-height: 1.6;">
                                Your password has been successfully reset. You can now log in to your account with your new password.
                            </p>
                            
                            <!-- Success Box -->
                            <div style="background-color: #f0fdf4; border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 30px;">
                                <p style="margin: 0; color: #166534; font-size: 16px; font-weight: 600;">
                                    🎉 Your account is secure!
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 15px; color: #666; font-size: 14px; line-height: 1.6;">
                                If you did not make this change, please contact our support team immediately.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px; text-align: center;">
                                This is an automated email from SyncServe POS. Please do not reply.
                            </p>
                            <p style="margin: 0; color: #f97316; font-size: 12px; text-align: center; font-weight: 600;">
                                Powered by SyncServe
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'SyncServe <noreply@syncserve.com>',
            to: email,
            subject: '✅ Password Reset Successful - SyncServe',
            html: emailTemplate,
        })
        console.log(`Password reset success email sent to ${email}`)
        return true
    } catch (error) {
        console.error('Failed to send password reset success email:', error)
        return false
    }
}

/**
 * Send Email Verification Link
 * @param email - Recipient email address
 * @param token - Verification token
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const confirmationLink = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`

    const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                ✉️ Verify Your Email
                            </h1>
                            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                                SyncServe POS
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px; color: #333; font-size: 16px; line-height: 1.6;">
                                Hello,
                            </p>
                            <p style="margin: 0 0 30px; color: #333; font-size: 16px; line-height: 1.6;">
                                Thank you for registering with SyncServe. To activate your account, please verify your email address by clicking the button below.
                            </p>
                            
                            <!-- Button -->
                            <div style="text-align: center; margin: 0 0 30px;">
                                <a href="${confirmationLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
                                    Verify Email Address
                                </a>
                            </div>

                            <p style="margin: 0 0 15px; color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
                                Or copy and paste this link in your browser:
                                <br>
                                <a href="${confirmationLink}" style="color: #2563eb; word-break: break-all;">${confirmationLink}</a>
                            </p>
                            
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 20px 0 30px;">
                                <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                                    ⏰ This link expires in 30 minutes
                                </p>
                            </div>
                            
                            <p style="margin: 0 0 15px; color: #666; font-size: 14px; line-height: 1.6;">
                                If you didn't create an account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px; text-align: center;">
                                This is an automated email from SyncServe POS. Please do not reply.
                            </p>
                            <p style="margin: 0; color: #f97316; font-size: 12px; text-align: center; font-weight: 600;">
                                Powered by SyncServe
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || 'SyncServe <noreply@syncserve.com>',
            to: email,
            subject: '✉️ Verify Your Email Address - SyncServe',
            html: emailTemplate,
        })
        console.log(`Verification email sent to ${email}`)
        return true
    } catch (error) {
        console.error('Failed to send verification email:', error)
        return false
    }
}
