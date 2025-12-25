import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { key, fingerprint, deviceName } = body

        if (!key || !fingerprint) {
            return NextResponse.json({ valid: false, error: "Missing key or fingerprint" }, { status: 400 })
        }

        const license = await prisma.license.findUnique({
            where: { key },
            include: { devices: true }
        })

        if (!license) {
            return NextResponse.json({ valid: false, error: "Invalid License Key" }, { status: 404 })
        }

        if (license.status !== 'ACTIVE') {
            return NextResponse.json({ valid: false, error: "License is not active" }, { status: 403 })
        }

        if (license.validUntil && new Date(license.validUntil) < new Date()) {
            return NextResponse.json({ valid: false, error: "License has expired" }, { status: 403 })
        }

        // Check Device
        const existingDevice = license.devices.find(d => d.fingerprint === fingerprint)

        if (existingDevice) {
            // Update last seen
            await prisma.licenseDevice.update({
                where: { id: existingDevice.id },
                data: { lastSeen: new Date(), deviceName: deviceName || existingDevice.deviceName }
            })
            return NextResponse.json({ valid: true, message: "Device Verified" })
        }

        // New Device: Check limits
        if (license.devices.length >= license.maxDevices) {
            return NextResponse.json({
                valid: false,
                error: "Device limit reached",
                details: `Max ${license.maxDevices} devices allowed.`
            }, { status: 403 })
        }

        // Register new device
        await prisma.licenseDevice.create({
            data: {
                licenseId: license.id,
                fingerprint,
                deviceName
            }
        })

        return NextResponse.json({ valid: true, message: "Device Registered" })

    } catch (error) {
        console.error("Validation Error:", error)
        return NextResponse.json({ valid: false, error: "Server Error" }, { status: 500 })
    }
}
