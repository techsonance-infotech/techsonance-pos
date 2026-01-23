'use server'

import { prisma } from "@/lib/prisma"
import { getUserProfile } from "./user"
import { revalidatePath } from "next/cache"

// Helper to generate Ticket ID
function generateTicketId() {
    return `TKT-${Math.floor(100000 + Math.random() * 900000)}`
}

export async function createTicket(data: {
    title: string,
    category: string,
    priority: string,
    description: string,
    attachments?: string,
    systemInfo?: string
}) {
    const user = await getUserProfile()
    if (!user) throw new Error("Unauthorized")

    // Ensure unique ID (simple retry if collision, though rare with 6 digits + TKT prefix, maybe add timestamp if needed)
    let ticketId = generateTicketId()

    const ticket = await prisma.supportTicket.create({
        data: {
            ticketId,
            title: data.title,
            category: data.category,
            priority: data.priority,
            description: data.description,
            attachments: data.attachments,
            systemInfo: data.systemInfo,
            userId: user.id,
            storeId: user.defaultStoreId,
            status: 'OPEN'
        }
    })

    revalidatePath('/dashboard/support/tickets')
    return ticket
}

export async function getTickets(filter?: { status?: string }) {
    const user = await getUserProfile()
    if (!user) return []

    const where: any = {}

    // Logic: Super Admin sees all? Or implies "Support Team"?
    // For now, let's restrict normal users to their own tickets.
    if (user.role !== 'SUPER_ADMIN') {
        where.userId = user.id
    }

    if (filter?.status && filter.status !== 'ALL') {
        where.status = filter.status
    }

    return await prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: { username: true, email: true }
            }
        }
    })
}

export async function getTicketDetails(ticketId: string) {
    const user = await getUserProfile()
    if (!user) return null

    const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
            messages: {
                include: {
                    sender: {
                        select: { id: true, username: true, role: true }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            user: {
                select: { id: true, username: true, email: true } // Creator info
            }
        }
    })

    if (!ticket) return null

    // Authorization check
    if (user.role !== 'SUPER_ADMIN' && ticket.userId !== user.id) {
        throw new Error("Unauthorized access to this ticket")
    }

    return ticket
}

export async function addTicketMessage(ticketId: string, message: string, attachments?: string) {
    const user = await getUserProfile()
    if (!user) throw new Error("Unauthorized")

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) throw new Error("Ticket not found")

    // Auth check
    if (user.role !== 'SUPER_ADMIN' && ticket.userId !== user.id) {
        throw new Error("Unauthorized")
    }

    const newMessage = await prisma.supportMessage.create({
        data: {
            ticketId,
            senderId: user.id,
            message,
            attachments
        }
    })

    // If user replies, maybe update status to OPEN if it was closed?
    // If admin replies, maybe update to IN_PROGRESS or WAITING_FOR_USER?
    // Let's keep it simple: Just add message.

    revalidatePath(`/dashboard/support/tickets/${ticketId}`)
    return newMessage
}

export async function getFaqs(category?: string, search?: string) {
    const where: any = { isVisible: true }

    if (category && category !== 'ALL') {
        where.category = category
    }

    if (search) {
        where.OR = [
            { question: { contains: search, mode: 'insensitive' } }, // SQLite might ignore mode, verify
            { answer: { contains: search, mode: 'insensitive' } }
        ]
    }

    return await prisma.faqArticle.findMany({
        where,
        orderBy: { sortOrder: 'asc' }
    })
}

// Seed helper (temp)
export async function seedFaqs() {
    const existing = await prisma.faqArticle.count()
    if (existing > 0) return

    await prisma.faqArticle.createMany({
        data: [
            { category: "Billing", question: "How to correct an invoice after printing?", answer: "Go to Recent Orders, find the order, click Cancel if allowed, then re-create." },
            { category: "GST & Taxes", question: "How are taxes calculated?", answer: "Taxes are applied based on the product settings and global tax configuration." },
            { category: "Inventory", question: "How to add stock?", answer: "Go to Inventory > Stock Entry and add new purchase records." },
            { category: "Login", question: "I forgot my PIN", answer: "Contact your store manager to reset your PIN from the Users section." },
            { category: "Hardware", question: "Printer not working", answer: "Ensure the printer is connected via USB/LAN and the service is running. Check Paper roll." }
        ]
    })
}
